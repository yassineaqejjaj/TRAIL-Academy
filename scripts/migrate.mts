/**
 * Applies db/migrations/*.sql in order against DATABASE_URL (any PostgreSQL: Railway, Docker, local).
 * Each file runs in its own transaction and is recorded in auth.schema_migrations, so the command is safe to re-run.
 *
 *   npm run db:migrate             apply pending migrations
 *   npm run db:migrate -- --up-to=0005_admin.sql   stop after that file (tests)
 *   npm run db:migrate -- --seed   also load db/seed.sql when the catalogue is empty
 *   npm run db:migrate -- --fixture  also load db/dev-fixture.sql (DEVELOPMENT ONLY: synthetic lessons)
 */
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set"); process.exit(1); }
const ssl = process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : process.env.DATABASE_SSL === "verify" ? true : undefined;
const client = new pg.Client({ connectionString: url, ssl });
await client.connect();
// New sessions inherit the database's "auth, public" search path (see 0000_platform.sql): without this, objects created by a
// migration applied in a LATER run would silently land in the auth schema.
await client.query("set search_path = public");

try {
  await client.query("create schema if not exists auth");
  await client.query("create table if not exists auth.schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const applied = new Set((await client.query<{ name: string }>("select name from auth.schema_migrations")).rows.map((r) => r.name));
  const upTo = process.argv.find((a) => a.startsWith("--up-to="))?.slice(8); // used by tests to replay an upgrade in two runs
  const files = readdirSync("db/migrations").filter((f) => f.endsWith(".sql") && (!upTo || f <= upTo)).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    process.stdout.write(`apply ${file} … `);
    await client.query("begin");
    try {
      await client.query(readFileSync(`db/migrations/${file}`, "utf8"));
      await client.query("insert into auth.schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log("ok");
    } catch (e) {
      await client.query("rollback");
      console.log("FAILED");
      throw e;
    }
  }
  if (files.every((f) => applied.has(f))) console.log("database is up to date");

  const empty = (await client.query<{ n: number }>("select count(*)::int as n from courses where phase_id < 5")).rows[0].n === 0;
  if (process.argv.includes("--seed") && empty) { await client.query(readFileSync("db/seed.sql", "utf8")); console.log("seed loaded"); }
  if (process.argv.includes("--fixture")) {
    if (process.env.NODE_ENV === "production") throw new Error("refusing to load the development fixture in production");
    await client.query(readFileSync("db/dev-fixture.sql", "utf8")); console.log("development fixture loaded");
  }
} finally {
  await client.end();
}
