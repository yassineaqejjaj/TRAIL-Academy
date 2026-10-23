import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import pg from "pg";
import { contentTypeOf } from "./ffmpeg.ts";
import { transcodeToHls } from "./transcode.ts";

/**
 * Video worker: polls the video_assets queue (claim_video_job), downloads the source from the private bucket,
 * encodes adaptive HLS with ffmpeg, uploads it to video/<asset id>/ and reports back (finish_video_job).
 *   DATABASE_URL [DATABASE_SSL]   S3_ENDPOINT S3_BUCKET S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY [S3_REGION]   [POLL_SECONDS=10]
 */
const required = (name: string) => { const v = process.env[name]; if (!v) { console.error(`Missing ${name}`); process.exit(1); } return v; };
const bucket = required("S3_BUCKET");
const s3 = new S3Client({
  endpoint: required("S3_ENDPOINT"), region: process.env.S3_REGION ?? "us-east-1", forcePathStyle: true,
  credentials: { accessKeyId: required("S3_ACCESS_KEY_ID"), secretAccessKey: required("S3_SECRET_ACCESS_KEY") },
});
const pool = new pg.Pool({ connectionString: required("DATABASE_URL"), max: 2, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined });
const log = (o: Record<string, unknown>) => console.info(JSON.stringify({ at: new Date().toISOString(), ...o }));

/** Same privilege model as the web app: the worker acts as service_role, inside a transaction. */
async function asService<T>(fn: (q: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role service_role");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) { await client.query("rollback").catch(() => undefined); throw e; } finally { client.release(); }
}

async function process1(job: { id: string; source_key: string }): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "video-"));
  try {
    const source = join(dir, "source");
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: job.source_key }));
    await pipeline(obj.Body as Readable, createWriteStream(source));
    const out = join(dir, "hls");
    await mkdir(out);
    const info = await transcodeToHls(source, out);
    for (const name of await readdir(out)) {
      const path = join(out, name);
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: `video/${job.id}/${name}`, Body: createReadStream(path), ContentLength: (await stat(path)).size, ContentType: contentTypeOf(name) }));
    }
    await asService((c) => c.query("select finish_video_job($1, true, $2, null)", [job.id, info.durationSeconds]));
    log({ msg: "video_ready", asset: job.id, seconds: info.durationSeconds, sourceHeight: info.height });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log({ msg: "video_failed", asset: job.id, error: message });
    await asService((c) => c.query("select finish_video_job($1, false, null, $2)", [job.id, message])).catch((err) => log({ msg: "report_failed", error: String(err) }));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

let stopping = false;
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { stopping = true; });
const pollMs = Number(process.env.POLL_SECONDS ?? 10) * 1000;
log({ msg: "video_worker_started" });
while (!stopping) {
  try {
    const job = (await asService((c) => c.query<{ id: string; source_key: string }>("select * from claim_video_job()"))).rows[0];
    if (job) { log({ msg: "video_claimed", asset: job.id }); await process1(job); continue; }
  } catch (e) { log({ msg: "poll_error", error: e instanceof Error ? e.message : String(e) }); }
  await new Promise((r) => setTimeout(r, pollMs));
}
await pool.end();
