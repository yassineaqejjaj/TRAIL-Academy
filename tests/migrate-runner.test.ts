// @vitest-environment node
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serveOverTcp } from "./helpers/db";

let db: PGlite;
let stop: () => Promise<void>;
let url: string;

// Asynchronous on purpose: the database server lives in this process, so a blocking call would deadlock it.
const run = promisify(execFile);
const migrate = async (...args: string[]) => (await run("npx", ["tsx", "scripts/migrate.mts", ...args], { env: { ...process.env, DATABASE_URL: url } })).stdout;

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  const served = await serveOverTcp(db, 54422);
  stop = served.stop;
  url = served.url;
}, 60_000);
afterAll(async () => { await stop(); });

describe("migration runner", () => {
  it("replays an upgrade across two runs and keeps every object in the public schema", async () => {
    await migrate("--up-to=0005_admin.sql");
    // The second run is a new session. The runner pins search_path = public: the app's auth pool uses "auth, public", and on the
    // single-backend embedded database that setting outlives its connection and used to leak into the next one (objects landed in auth).
    const out = await migrate("--seed");
    expect(out).toContain("apply 0006_rate_limit.sql … ok");
    const where = async (sql: string) => (await db.query<{ nspname: string }>(sql)).rows.map((r) => r.nspname);
    expect(await where(`select n.nspname from pg_class r join pg_namespace n on n.oid = r.relnamespace where r.relname in ('app_rate_limits', 'video_assets')`)).toEqual(["public", "public"]);
    expect(await where(`select n.nspname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname in ('hit_rate_limit', 'export_my_data', 'anonymize_user', 'claim_video_job')`)).toEqual(["public", "public", "public", "public"]);
    expect(await where(`select n.nspname from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'video_status'`)).toEqual(["public"]);
  }, 180_000);
  it("is idempotent", async () => {
    expect(await migrate()).toContain("database is up to date");
  }, 60_000);
});
