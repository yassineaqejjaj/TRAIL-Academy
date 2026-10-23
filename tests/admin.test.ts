// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { addUsers, createTestDb } from "./helpers/db";
import { beforeAll, describe, expect, it } from "vitest";

const ADMIN = "00000000-0000-0000-0000-0000000000aa";
const U1 = "00000000-0000-0000-0000-000000000001";
const U2 = "00000000-0000-0000-0000-000000000002";
let db: PGlite;

const as = async <T>(uid: string, fn: () => Promise<T>): Promise<T> => { await db.exec(`set role authenticated; select set_config('app.uid','${uid}',false)`); try { return await fn(); } finally { await db.exec("reset role"); } };
const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];
const count = async (sql: string) => Number((await one<{ n: number }>(`select count(*)::int n from (${sql}) x`)).n);
const admin = <T = unknown>(sql: string, params: unknown[] = []) => as(ADMIN, async () => (await db.query<T>(sql, params)).rows);
const id = async (sql: string) => (await one<{ id: string }>(sql)).id;

beforeAll(async () => {
  db = await createTestDb();
  await addUsers(db, [[ADMIN, "a@t.local"], [U1, "u1@t.local"], [U2, "u2@t.local"]]);
  await db.exec(`insert into user_roles values ('${ADMIN}', 'admin');`);
});

describe("authorization", () => {
  it("rejects every admin function for learners and visitors", async () => {
    const calls = [
      `select admin_metrics(30)`, `select publish_course(gen_random_uuid())`, `select unpublish_course(gen_random_uuid())`,
      `select set_product_price(gen_random_uuid(), 100, true)`, `select admin_grant_access('${U1}', gen_random_uuid(), 1, 'x')`,
      `select review_submission(gen_random_uuid(), 'accepted', 'x')`, `select reorder_chapters(gen_random_uuid(), '{}')`,
    ];
    for (const c of calls) {
      await expect(as(U1, () => db.query(c))).rejects.toThrow(/admin only/);
      await db.exec("set role anon");
      await expect(db.query(c)).rejects.toThrow();
      await db.exec("reset role");
    }
  });
  it("lets learners neither write catalog tables nor read the audit log", async () => {
    await as(U1, () => db.exec(`update courses set title = 'hacked'`));
    expect(await count(`select 1 from courses where title = 'hacked'`)).toBe(0);
    expect(await as(U1, () => count("select 1 from audit_logs"))).toBe(0);
  });
});

describe("publishing", () => {
  let m4: string, chapter: string, lesson: string, quiz: string;
  beforeAll(async () => {
    m4 = await id(`select id from courses where code = 'M4'`);
    chapter = await id(`insert into chapters (course_id, title, position) values ('${m4}', 'c', 1) returning id`);
    lesson = await id(`insert into lessons (chapter_id, course_id, title, position, content_status) values ('${chapter}', '${m4}', 'Vide', 1, 'published') returning id`);
  });
  const issues = async () => (await admin<{ r: { code: string; detail?: string }[] }>(`select course_readiness($1) r`, [m4]))[0].r;

  it("blocks publishing a course with empty lessons, empty quizzes or unanswerable questions", async () => {
    expect((await issues()).map((i) => i.code)).toContain("lesson_without_content");
    await expect(admin(`select publish_course($1)`, [m4])).rejects.toThrow(/not_ready/);
    expect(await count(`select 1 from courses where code='M4' and status='published'`)).toBe(0);
    await db.exec(`update lessons set body_md = 'Contenu validé' where id = '${lesson}'`);
    quiz = await id(`insert into quizzes (course_id, title) values ('${m4}', 'Q') returning id`);
    expect((await issues()).map((i) => i.code)).toContain("quiz_without_questions");
    const qq = await id(`insert into quiz_questions (quiz_id, kind, prompt, position) values ('${quiz}', 'single_choice', 'Pourquoi ?', 1) returning id`);
    expect((await issues()).map((i) => i.code)).toContain("question_without_correct_option");
    await db.exec(`insert into quiz_options (question_id, label, is_correct, position) values ('${qq}', 'a', true, 1), ('${qq}', 'b', false, 2)`);
  });
  it("publishes once ready, then keeps offers closed until explicitly activated", async () => {
    expect(await issues()).toEqual([]);
    await admin(`select publish_course($1)`, [m4]);
    expect(await count(`select 1 from courses where code='M4' and status='published'`)).toBe(1);
    expect(await count(`select 1 from products where slug='module-prompt-engineering' and active`)).toBe(0);
  });
  it("activates an offer only when every included course is published and priced", async () => {
    const pm = await id(`select id from products where slug = 'product-manager-augmente'`);
    await expect(admin(`select set_product_active($1, true)`, [pm])).rejects.toThrow(/not_published/);
    const mod = await id(`select id from products where slug = 'module-prompt-engineering'`);
    await admin(`select set_product_active($1, true)`, [mod]);
    expect(await count(`select 1 from products where id='${mod}' and active`)).toBe(1);
  });
  it("unpublishing closes every offer containing the course but keeps learners' access", async () => {
    await db.exec(`insert into entitlements (user_id, course_id, expires_at) values ('${U1}', '${m4}', now() + interval '6 months')`);
    await admin(`select unpublish_course($1)`, [m4]);
    expect(await count(`select 1 from courses where code='M4' and status='coming_soon'`)).toBe(1);
    expect(await count(`select 1 from products where slug='module-prompt-engineering' and active`)).toBe(0);
    expect(await count(`select 1 from entitlements where user_id='${U1}' and status='active'`)).toBe(1);
  });
});

describe("pricing", () => {
  it("keeps price history, with exactly one active price", async () => {
    const p = await id(`select id from products where slug = 'module-prompt-engineering'`);
    await admin(`select set_product_price($1, 12900, true)`, [p]);
    await admin(`select set_product_price($1, 13900, true)`, [p]);
    expect(await count(`select 1 from prices where product_id='${p}'`)).toBe(3);
    expect(await count(`select 1 from prices where product_id='${p}' and active`)).toBe(1);
    expect((await one<{ amount_cents: number }>(`select amount_cents from prices where product_id='${p}' and active`)).amount_cents).toBe(13900);
    await expect(admin(`select set_product_price($1, -1, true)`, [p])).rejects.toThrow(/invalid_amount/);
  });
  it("does not change the price of past orders", async () => {
    const p = await id(`select id from products where slug = 'module-prompt-engineering'`);
    const o = await id(`insert into orders (user_id, status, total_cents) values ('${U2}', 'paid', 14900) returning id`);
    await db.exec(`insert into order_items (order_id, product_id, unit_amount_cents, access_months) values ('${o}', '${p}', 14900, 12)`);
    await admin(`select set_product_price($1, 9900, true)`, [p]);
    expect((await one<{ unit_amount_cents: number }>(`select unit_amount_cents from order_items where order_id='${o}'`)).unit_amount_cents).toBe(14900);
  });
});

describe("ordering and structure", () => {
  it("reorders chapters and lessons, rejecting mismatched id sets", async () => {
    const m5 = await id(`select id from courses where code='M5'`);
    const c = [await id(`insert into chapters (course_id, title, position) values ('${m5}','A',1) returning id`), await id(`insert into chapters (course_id, title, position) values ('${m5}','B',2) returning id`), await id(`insert into chapters (course_id, title, position) values ('${m5}','C',3) returning id`)];
    await admin(`select reorder_chapters($1, $2::uuid[])`, [m5, [c[2], c[0], c[1]]]);
    expect((await db.query<{ title: string }>(`select title from chapters where course_id='${m5}' order by position`)).rows.map((r) => r.title)).toEqual(["C", "A", "B"]);
    await expect(admin(`select reorder_chapters($1, $2::uuid[])`, [m5, [c[0], c[1]]])).rejects.toThrow(/mismatch/);
    const l = [await id(`insert into lessons (chapter_id, course_id, title, position) values ('${c[0]}','${m5}','L1',1) returning id`), await id(`insert into lessons (chapter_id, course_id, title, position) values ('${c[0]}','${m5}','L2',2) returning id`)];
    await admin(`select reorder_lessons($1, $2::uuid[])`, [c[0], [l[1], l[0]]]);
    expect((await db.query<{ title: string }>(`select title from lessons where chapter_id='${c[0]}' order by position`)).rows.map((r) => r.title)).toEqual(["L2", "L1"]);
  });
  it("sets a path's courses in order and keeps its product in sync", async () => {
    const path = await id(`select id from learning_paths where slug='ai-product-manager'`);
    const ids = (await db.query<{ id: string }>(`select id from courses where code in ('M3','M1','M2') order by code desc`)).rows.map((r) => r.id);
    await admin(`select set_path_courses($1, $2::uuid[])`, [path, ids]);
    expect(await count(`select 1 from learning_path_courses where path_id='${path}'`)).toBe(3);
    expect(await count(`select 1 from product_course_access pa join products p on p.id=pa.product_id where p.path_id='${path}'`)).toBe(3);
    await expect(admin(`select set_path_courses($1, $2::uuid[])`, [path, [ids[0], ids[0]]])).rejects.toThrow(/duplicate/);
  });
  it("refuses prerequisite cycles", async () => {
    const [m1, m2] = (await db.query<{ id: string }>(`select id from courses where code in ('M1','M2') order by code`)).rows.map((r) => r.id);
    // seed already has M2 requires M1
    await expect(db.exec(`insert into course_prerequisites values ('${m1}', '${m2}')`)).rejects.toThrow(/cycle/);
  });
});

describe("learner access and review", () => {
  it("grants and revokes access with a mandatory reason, auditing both", async () => {
    const m6 = await id(`select id from courses where code='M6'`);
    await expect(admin(`select admin_grant_access($1, $2, 3, '')`, [U2, m6])).rejects.toThrow(/reason_required/);
    await expect(admin(`select admin_grant_access($1, $2, 99, 'x')`, [U2, m6])).rejects.toThrow(/invalid_months/);
    await admin(`select admin_grant_access($1, $2, 3, 'Geste commercial')`, [U2, m6]);
    expect(await count(`select 1 from entitlements where user_id='${U2}' and course_id='${m6}' and status='active'`)).toBe(1);
    await admin(`select admin_revoke_access($1, $2, 'Demande du client')`, [U2, m6]);
    expect(await count(`select 1 from entitlements where user_id='${U2}' and course_id='${m6}' and status='revoked'`)).toBe(1);
    const reasons = (await db.query<{ d: { reason: string } }>(`select details d from audit_logs where action like 'admin_%_access' order by id`)).rows.map((r) => r.d.reason);
    expect(reasons).toEqual(["Geste commercial", "Demande du client"]);
  });
  it("reviews submissions, requiring feedback for revisions, and completes the course on acceptance", async () => {
    const m3 = await id(`select id from courses where code='M3'`);
    const ch = await id(`insert into chapters (course_id, title, position) values ('${m3}','c',1) returning id`);
    const lsn = await id(`insert into lessons (chapter_id, course_id, title, position, content_status, body_md) values ('${ch}','${m3}','l',1,'published','x') returning id`);
    const asg = await id(`insert into assignments (course_id, title, instructions_md) values ('${m3}','Livrable','x') returning id`);
    await db.exec(`insert into entitlements (user_id, course_id, expires_at) values ('${U1}','${m3}', now() + interval '1 month')`);
    await as(U1, () => db.query(`select record_lesson_progress('${lsn}', 0, true)`));
    const sub = await id(`insert into assignment_submissions (assignment_id, user_id, body) values ('${asg}','${U1}','mon travail') returning id`);
    await expect(admin(`select review_submission($1, 'revision_requested', '')`, [sub])).rejects.toThrow(/feedback_required/);
    await expect(admin(`select review_submission($1, 'submitted', 'x')`, [sub])).rejects.toThrow(/invalid_status/);
    await admin(`select review_submission($1, 'revision_requested', 'Précisez la méthode')`, [sub]);
    expect(await count(`select 1 from attestations where user_id='${U1}'`)).toBe(0);
    await admin(`select review_submission($1, 'accepted', 'Très bien')`, [sub]);
    expect(await count(`select 1 from attestations where user_id='${U1}' and course_id='${m3}'`)).toBe(1);
    expect((await one<{ instructor_feedback: string }>(`select instructor_feedback from assignment_submissions where id='${sub}'`)).instructor_feedback).toBe("Très bien");
  });
});

describe("metrics", () => {
  it("reports revenue net of refunds, funnel and pending reviews", async () => {
    const p = await id(`select id from products where slug='module-prompt-engineering'`);
    const o = await id(`insert into orders (user_id, status, total_cents, paid_at) values ('${U2}', 'partially_refunded', 14900, now()) returning id`);
    await db.exec(`insert into order_items (order_id, product_id, unit_amount_cents, access_months) values ('${o}', '${p}', 14900, 12);
      insert into payments (order_id, stripe_payment_intent_id, amount_cents, refunded_cents, status) values ('${o}', 'pi_m', 14900, 4900, 'succeeded');
      insert into orders (user_id, status, total_cents) values ('${U2}', 'pending', 14900)`);
    const m = (await admin<{ m: Record<string, unknown> }>(`select admin_metrics(30) m`))[0].m;
    expect(m).toMatchObject({ gross_cents: 14900, refunded_cents: 4900, net_cents: 10000, refunded_orders: 1, pending_orders: 1 });
    expect(Number(m.purchases)).toBeGreaterThanOrEqual(1);
    expect(Number(m.orders_created)).toBeGreaterThan(Number(m.orders_paid));
    expect(Number(m.new_registrations)).toBe(3);
    expect((m.top_products as { title: string }[])[0].title).toContain("Prompt Engineering");
  });
});

describe("interest sign-ups", () => {
  it("are invisible to learners and visitors, writable only by the service role", async () => {
    await db.exec(`insert into interest_signups (email, kind, course_slug, consent_policy_version) values ('a@x.fr', 'course_launch', 'prompt-engineering', 'draft')`);
    expect(await as(U1, () => count("select 1 from interest_signups"))).toBe(0);
    expect((await admin(`select 1 from interest_signups`)).length).toBe(1);
    await expect(as(U1, () => db.exec(`insert into interest_signups (email, kind, consent_policy_version) values ('b@x.fr', 'newsletter', 'draft')`))).rejects.toThrow();
  });
  it("normalise e-mails and never duplicate a sign-up", async () => {
    await expect(db.exec(`insert into interest_signups (email, kind, course_slug, consent_policy_version) values ('A@X.fr', 'course_launch', 'x', 'draft')`)).rejects.toThrow();
    await expect(db.exec(`insert into interest_signups (email, kind, course_slug, consent_policy_version) values ('a@x.fr', 'course_launch', 'prompt-engineering', 'draft')`)).rejects.toThrow();
  });
});

describe("audit trail", () => {
  it("records who changed what on content and money tables", async () => {
    await admin(`update courses set title = 'Prompt Engineering ' || 'v2' where code = 'M4'`);
    const row = await one<{ actor_id: string; details: { old: { title: string }; new: { title: string } } }>(`select actor_id, details from audit_logs where entity='courses' and action='UPDATE' order by id desc limit 1`);
    expect(row.actor_id).toBe(ADMIN);
    expect(row.details.new.title).toBe("Prompt Engineering v2");
    expect(await count(`select 1 from audit_logs where entity in ('orders','payments','prices','entitlements')`)).toBeGreaterThan(0);
  });
  it("stays append-only even for admins", async () => {
    const before = await count("select 1 from audit_logs");
    await admin(`delete from audit_logs`); // no delete policy: removes nothing
    expect(await count("select 1 from audit_logs")).toBe(before);
    await expect(db.exec(`update audit_logs set action = 'x'`)).rejects.toThrow(/append-only/);
  });
  it("lets admins log explicit actions, but not learners", async () => {
    await admin(`select log_admin_action('refund_requested', 'orders', 'o1', '{"x":1}'::jsonb)`);
    expect(await count(`select 1 from audit_logs where action = 'refund_requested' and actor_id = '${ADMIN}'`)).toBe(1);
    await expect(as(U1, () => db.query(`select log_admin_action('x','y','z')`))).rejects.toThrow(/admin only/);
  });
  it("lets admins, and only admins, read it", async () => {
    expect((await admin(`select 1 from audit_logs limit 1`)).length).toBe(1);
    expect(await as(U1, () => count("select 1 from audit_logs"))).toBe(0);
  });
});
