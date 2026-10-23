// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("dev fixture applies cleanly on top of migrations and seed, and stays out of the seed", { timeout: 30_000 }, async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid, bucket_id text, name text); alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;`);
  for (const f of ["0001_schema", "0002_rls", "0003_learning"]) await db.exec(readFileSync(`supabase/migrations/${f}.sql`, "utf8"));
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  expect((await db.query<{ n: number }>("select count(*)::int n from lessons")).rows[0].n).toBe(0); // seed has no lessons
  await db.exec(readFileSync("supabase/dev-fixture.sql", "utf8"));
  expect((await db.query<{ n: number }>("select count(*)::int n from lessons")).rows[0].n).toBe(2);
  expect((await db.query<{ n: number }>("select count(*)::int n from lessons where body_md not like '[CONTENU DE TEST]%'")).rows[0].n).toBe(0);
});
