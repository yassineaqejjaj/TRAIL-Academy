// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addUsers, createTestDb, serveOverTcp } from "./helpers/db";

const U1 = "00000000-0000-0000-0000-000000000001";
const U2 = "00000000-0000-0000-0000-000000000002";

let db: PGlite;
let stop: () => Promise<void>;
let layer: typeof import("@/lib/db");

beforeAll(async () => {
  db = await createTestDb();
  const served = await serveOverTcp(db, 54411);
  stop = served.stop;
  process.env.DATABASE_URL = served.url;
  process.env.DATABASE_POOL_MAX = "1"; // one connection proves that privileges never leak between requests
  layer = await import("@/lib/db");
  await addUsers(db, [[U1, "u1@t.local"], [U2, "u2@t.local"]]);
  await db.exec(`insert into orders (user_id, status, total_cents) values ('${U1}', 'pending', 100), ('${U1}', 'pending', 200), ('${U2}', 'pending', 300)`);
}, 60_000);

afterAll(async () => {
  await layer.getPool().end();
  await stop();
});

describe("database access layer", () => {
  it("serves public data to anonymous visitors under RLS", async () => {
    const rows = await layer.asAnon((q) => q("select code from courses order by position limit 3"));
    expect(rows.map((r) => r.code)).toEqual(["M1", "M2", "M3"]);
    expect(await layer.asAnon((q) => q("select 1 from orders"))).toHaveLength(0);
  });

  it("scopes a signed-in user to their own rows", async () => {
    expect(await layer.asUser(U1, (q) => q("select 1 from orders"))).toHaveLength(2);
    expect(await layer.asUser(U2, (q) => q("select 1 from orders"))).toHaveLength(1);
  });

  it("does not leak identity or role to the next request on a reused connection", async () => {
    await layer.asUser(U1, (q) => q("select 1"));
    const next = await layer.asAnon((q) => q.one<{ uid: string | null; who: string }>("select auth.uid() as uid, current_user as who"));
    expect(next).toEqual({ uid: null, who: "anon" });
  });

  it("lets trusted server code bypass RLS, and nothing else", async () => {
    expect(await layer.asService((q) => q("select 1 from orders"))).toHaveLength(3);
  });

  it("never exposes the auth tables to user roles", async () => {
    await expect(layer.asUser(U1, (q) => q("select email from auth.users"))).rejects.toThrow(/permission denied/);
    await expect(layer.asAnon((q) => q("select token from auth.sessions"))).rejects.toThrow(/permission denied/);
  });

  it("rolls back on error and keeps the pool usable", async () => {
    await expect(layer.asService(async (q) => { await q("insert into system_settings (key, value) values ('t', '1')"); throw new Error("boom"); })).rejects.toThrow("boom");
    expect(await layer.asService((q) => q("select 1 from system_settings where key = 't'"))).toHaveLength(0);
  });

  it("binds parameters instead of interpolating them", async () => {
    const evil = "x'); drop table orders; --";
    await layer.asService((q) => q("insert into system_settings (key, value) values ($1, to_jsonb($1::text))", [evil]));
    expect(await layer.asService((q) => q("select 1 from orders"))).toHaveLength(3);
    expect((await layer.asService((q) => q.one<{ value: string }>("select value from system_settings where key = $1", [evil])))?.value).toBe(evil);
  });

  it("returns ISO strings for timestamps and numbers for counts", async () => {
    const row = await layer.asService((q) => q.one<{ created_at: string; n: number }>("select created_at, (select count(*) from orders) as n from orders limit 1"));
    expect(typeof row?.created_at).toBe("string");
    expect(new Date(row!.created_at).toISOString()).toBe(row!.created_at);
    expect(row?.n).toBe(3);
  });
});

describe("single-connection mode (embedded development database)", () => {
  it("shares one pooled connection between the application and the auth library", async () => {
    const { getPool } = await import("@/lib/db/pool");
    process.env.DATABASE_SINGLE_CONNECTION = "true";
    const same = getPool("app") === getPool("auth");
    delete process.env.DATABASE_SINGLE_CONNECTION;
    expect(same).toBe(true);
    expect(getPool("app")).not.toBe(getPool("auth"));
  });
});
