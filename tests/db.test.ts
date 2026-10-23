// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const U1 = "00000000-0000-0000-0000-000000000001";
const U2 = "00000000-0000-0000-0000-000000000002";
const ADMIN = "00000000-0000-0000-0000-0000000000aa";
const MGR = "00000000-0000-0000-0000-0000000000bb";

// Minimal stand-ins for the Supabase-managed schemas/roles (auth, storage).
const supabaseStubs = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
`;

let db: PGlite;
const as = async <T>(uid: string | null, fn: () => Promise<T>): Promise<T> => {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}; select set_config('app.uid', '${uid ?? ""}', false);`);
  try { return await fn(); } finally { await db.exec("reset role;"); }
};
const count = async (sql: string) => Number(((await db.query<{ n: number }>(`select count(*)::int n from (${sql}) x`)).rows[0]).n);

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(supabaseStubs);
  await db.exec(read("supabase/migrations/0001_schema.sql"));
  await db.exec(read("supabase/migrations/0002_rls.sql"));
  await db.exec(read("supabase/migrations/0003_learning.sql"));
  await db.exec(`grant usage on schema public, auth to anon, authenticated, service_role;
    grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
    grant select on all tables in schema public to anon;
    grant select, insert on storage.objects to authenticated;`);
  await db.exec(read("supabase/seed.sql"));
  for (const [id, email] of [[U1, "u1@test.local"], [U2, "u2@test.local"], [ADMIN, "admin@test.local"], [MGR, "mgr@test.local"]])
    await db.exec(`insert into auth.users (id, email) values ('${id}', '${email}');`);
  await db.exec(`insert into user_roles values ('${ADMIN}', 'admin');`);
});

describe("seed", () => {
  it("creates 18 courses, 4 phases, 3 paths", async () => {
    expect(await count("select 1 from courses")).toBe(18);
    expect(await count("select 1 from learning_phases")).toBe(4);
    expect(await count("select 1 from learning_paths")).toBe(3);
    expect(await count("select 1 from learning_path_courses lp join learning_paths p on p.id = lp.path_id where p.slug = 'ai-product-manager'")).toBe(13);
  });
  it("seeds no customers, orders or testimonials", async () => {
    expect(await count("select 1 from orders")).toBe(0);
    expect(await count("select 1 from testimonials")).toBe(0);
  });
  it("creates no active purchasable product for unpublished courses", async () => {
    expect(await count("select 1 from products where active")).toBe(0);
  });
});

describe("identity", () => {
  it("creates profile and learner role on signup", async () => {
    expect(await count(`select 1 from profiles where id = '${U1}'`)).toBe(1);
    expect(await count(`select 1 from user_roles where user_id = '${U1}' and role = 'learner'`)).toBe(1);
  });
  it("prevents a learner from granting themselves admin", async () => {
    await expect(as(U1, () => db.exec(`insert into user_roles values ('${U1}', 'admin');`))).rejects.toThrow();
  });
});

describe("commerce and entitlements", () => {
  let orderId: string;
  beforeAll(async () => {
    await db.exec(`update courses set status = 'published' where code = 'M4'; update products set active = true where slug = 'module-prompt-engineering';`);
    orderId = (await db.query<{ id: string }>(`insert into orders (user_id, status, total_cents) values ('${U1}', 'pending', 14900) returning id`)).rows[0].id;
    await db.exec(`insert into order_items (order_id, product_id, unit_amount_cents, access_months)
      select '${orderId}', id, 14900, 12 from products where slug = 'module-prompt-engineering';`);
  });
  it("refuses to provision an unpaid order", async () => {
    await expect(db.query(`select provision_order('${orderId}')`)).rejects.toThrow(/not paid/);
    expect(await count("select 1 from entitlements")).toBe(0);
  });
  it("provisions once even when called twice (no duplicate entitlements)", async () => {
    await db.exec(`update orders set status = 'paid' where id = '${orderId}';`);
    await db.query(`select provision_order('${orderId}')`);
    await db.query(`select provision_order('${orderId}')`);
    expect(await count(`select 1 from entitlements where user_id = '${U1}'`)).toBe(1);
  });
  it("blocks authenticated users from calling provision_order", async () => {
    await expect(as(U1, () => db.query(`select provision_order('${orderId}')`))).rejects.toThrow();
  });
  it("hides other users' orders and entitlements", async () => {
    expect(await as(U2, () => count("select 1 from orders"))).toBe(0);
    expect(await as(U2, () => count("select 1 from entitlements"))).toBe(0);
    expect(await as(U1, () => count("select 1 from orders"))).toBe(1);
  });
  it("lets users read but never write orders", async () => {
    await expect(as(U1, () => db.exec(`update orders set status = 'paid' where id = '${orderId}'; insert into orders (user_id,total_cents) values ('${U1}',0);`))).rejects.toThrow();
  });
  it("keeps webhook events and audit logs away from learners", async () => {
    await db.exec(`insert into processed_webhook_events (stripe_event_id, event_type) values ('evt_1', 'test');`);
    expect(await as(U1, () => count("select 1 from processed_webhook_events"))).toBe(0);
    await expect(db.exec(`insert into processed_webhook_events (stripe_event_id, event_type) values ('evt_1', 'test');`)).rejects.toThrow(); // duplicate rejected
  });
  it("treats audit logs as append-only", async () => {
    await db.exec(`insert into audit_logs (action, entity) values ('x', 'y');`);
    await expect(db.exec(`delete from audit_logs;`)).rejects.toThrow(/append-only/);
  });
});

describe("lesson access", () => {
  let lockedLesson: string, previewLesson: string;
  beforeAll(async () => {
    const m4 = (await db.query<{ id: string }>(`select id from courses where code = 'M4'`)).rows[0].id;
    const m5 = (await db.query<{ id: string }>(`select id from courses where code = 'M5'`)).rows[0].id;
    const ch = (await db.query<{ id: string }>(`insert into chapters (course_id, title, position) values ('${m4}', 'c', 1) returning id`)).rows[0].id;
    const ch5 = (await db.query<{ id: string }>(`insert into chapters (course_id, title, position) values ('${m5}', 'c', 1) returning id`)).rows[0].id;
    lockedLesson = (await db.query<{ id: string }>(`insert into lessons (chapter_id, course_id, title, position, content_status) values ('${ch}', '${m4}', 'locked', 1, 'published') returning id`)).rows[0].id;
    previewLesson = (await db.query<{ id: string }>(`insert into lessons (chapter_id, course_id, title, position, content_status, is_free_preview) values ('${ch5}', '${m5}', 'preview', 1, 'published', true) returning id`)).rows[0].id;
  });
  it("lets the entitled learner see the lesson, not others", async () => {
    expect(await as(U1, () => count(`select 1 from lessons where id = '${lockedLesson}'`))).toBe(1);
    expect(await as(U2, () => count(`select 1 from lessons where id = '${lockedLesson}'`))).toBe(0);
    expect(await as(null, () => count(`select 1 from lessons where id = '${lockedLesson}'`))).toBe(0);
  });
  it("exposes free previews to visitors", async () => {
    expect(await as(null, () => count(`select 1 from lessons where id = '${previewLesson}'`))).toBe(1);
  });
  it("denies access after expiry", async () => {
    await db.exec(`update entitlements set expires_at = now() - interval '1 day' where user_id = '${U1}';`);
    expect(await as(U1, () => count(`select 1 from lessons where id = '${lockedLesson}'`))).toBe(0);
  });
  it("prevents progress writes on lessons the user cannot access", async () => {
    await expect(as(U2, () => db.exec(`insert into lesson_progress (user_id, lesson_id) values ('${U2}', '${lockedLesson}')`))).rejects.toThrow();
  });
  it("hides correct answers from learners", async () => {
    const m4 = (await db.query<{ id: string }>(`select id from courses where code = 'M4'`)).rows[0].id;
    const qz = (await db.query<{ id: string }>(`insert into quizzes (course_id, title) values ('${m4}', 'q') returning id`)).rows[0].id;
    const qq = (await db.query<{ id: string }>(`insert into quiz_questions (quiz_id, kind, prompt, position) values ('${qz}', 'single_choice', 'p', 1) returning id`)).rows[0].id;
    await db.exec(`insert into quiz_options (question_id, label, is_correct, position) values ('${qq}', 'a', true, 1)`);
    expect(await as(U1, () => count("select 1 from quiz_options"))).toBe(0);
    expect(await as(ADMIN, () => count("select 1 from quiz_options"))).toBe(1);
  });
});

describe("enterprise scoping", () => {
  it("lets a manager see progress only of their own organization's learners", async () => {
    const m4 = (await db.query<{ id: string }>(`select id from courses where code = 'M4'`)).rows[0].id;
    const org = (await db.query<{ id: string }>(`insert into organizations (name) values ('Acme') returning id`)).rows[0].id;
    await db.exec(`insert into organization_members values ('${org}', '${MGR}', 'manager'), ('${org}', '${U1}', 'learner');
      insert into learner_progress (user_id, course_id, percent) values ('${U1}', '${m4}', 40), ('${U2}', '${m4}', 80);`);
    expect(await as(MGR, () => count("select 1 from learner_progress"))).toBe(1);
    expect(await as(MGR, () => count(`select 1 from profiles where id = '${U2}'`))).toBe(0);
    expect(await as(U2, () => count("select 1 from learner_progress"))).toBe(1);
  });
});

describe("cms", () => {
  it("refuses to publish an unverified testimonial", async () => {
    await expect(db.exec(`insert into testimonials (author_name, quote, status) values ('x', 'y', 'published')`)).rejects.toThrow();
  });
});
