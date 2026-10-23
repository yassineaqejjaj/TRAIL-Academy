import { createServer } from "node:http";
import { pipeline, type Readable } from "node:stream";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { jwtVerify } from "jose";
import { createHandler } from "./handler.ts";

/**
 * Stream gateway: serves HLS playlists and segments from the private bucket to holders of a signed,
 * short-lived token issued by the web app. Deployed as its own Railway service.
 *   S3_ENDPOINT S3_BUCKET S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY [S3_REGION]
 *   STREAM_SIGNING_SECRET   (shared with the web app)      SITE_ORIGIN  (CORS origin of the web app)
 */
const required = (name: string) => { const v = process.env[name]; if (!v) { console.error(`Missing ${name}`); process.exit(1); } return v; };
const secret = new TextEncoder().encode(required("STREAM_SIGNING_SECRET"));
const bucket = required("S3_BUCKET");
const s3 = new S3Client({
  endpoint: required("S3_ENDPOINT"), region: process.env.S3_REGION ?? "us-east-1", forcePathStyle: true,
  credentials: { accessKeyId: required("S3_ACCESS_KEY_ID"), secretAccessKey: required("S3_SECRET_ACCESS_KEY") },
});

const missing = (e: unknown) => (e as { name?: string }).name === "NoSuchKey" || (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404;

const handle = createHandler({
  allowedOrigin: required("SITE_ORIGIN"),
  async verify(token) {
    try {
      const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
      return typeof payload.sub === "string" ? { assetId: payload.sub } : null;
    } catch { return null; }
  },
  async getObject(key, range) {
    try {
      const r = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: range }));
      return { stream: r.Body as Readable, contentLength: r.ContentLength, contentRange: r.ContentRange };
    } catch (e) { if (missing(e)) return null; throw e; }
  },
  async getText(key) {
    try { return await (await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))).Body!.transformToString(); }
    catch (e) { if (missing(e)) return null; throw e; }
  },
});

createServer(async (req, res) => {
  try {
    const out = await handle({ method: req.method ?? "GET", url: req.url ?? "/", headers: req.headers });
    res.writeHead(out.status, out.headers);
    if (out.stream) pipeline(out.stream, res, () => undefined);
    else res.end(out.text ?? "");
  } catch (e) {
    console.error("gateway error", (e as Error).message);
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad gateway");
  }
}).listen(Number(process.env.PORT ?? 8080), () => console.info(`stream-gateway listening on ${process.env.PORT ?? 8080}`));
