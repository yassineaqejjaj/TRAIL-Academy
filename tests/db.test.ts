// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { addUsers, createTestDb } from "./helpers/db";
import { beforeAll, describe, expect, it } from "vitest";

const U1 = "00000000-0000-0000-0000-000000000001";
const U2 = "00000000-0000-0000-0000-000000000002";
const ADMIN = "00000000-0000-0000-0000-0000000000aa";
const MGR = "00000000-0000-0000-0000-0000000000bb";


let db: PGlite;
const as = async <T>(uid: string | null, fn: () => Promise<T>): Promise<T> => {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}; select set_config('app.uid', '${uid ?? ""}', false);`);
  try { return await fn(); } finally { await db.exec("reset role;"); }
};
const count = async (sql: string) => Number(((await db.query<{ n: number }>(`select count(*)::int n from (${sql}) x`)).rows[0]).n);

beforeAll(async () => {
  db = await createTestDb();
  await addUsers(db, [[U1, "u1@test.local"], [U2, "u2@test.local"], [ADMIN, "admin@test.local"], [MGR, "mgr@test.local"]]);
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

describe("rate limiting", () => {
  const hit = async (key: string, limit = 2, secs = 60) => (await db.query<{ ok: boolean }>(`select hit_rate_limit('${key}', ${limit}, ${secs}) as ok`)).rows[0].ok;
  it("allows up to the limit, then blocks", async () => {
    expect([await hit("a"), await hit("a"), await hit("a")]).toEqual([true, true, false]);
    expect(await hit("b")).toBe(true); // keys are independent
  });
  it("starts a new window once the previous one has expired", async () => {
    await db.exec(`update app_rate_limits set reset_at = now() - interval '1 second' where key = 'a'`);
    expect(await hit("a")).toBe(true);
    expect(await hit("a")).toBe(true);
    expect(await hit("a")).toBe(false);
  });
  it("rejects nonsensical parameters", async () => {
    await expect(db.query(`select hit_rate_limit('x', 0, 60)`)).rejects.toThrow(/invalid_rate_limit/);
    await expect(db.query(`select hit_rate_limit('x', 1, 0)`)).rejects.toThrow(/invalid_rate_limit/);
  });
  it("is unreachable for visitors and learners, usable by the service role, and purges old rows", async () => {
    await expect(as(null, () => db.query(`select hit_rate_limit('c', 1, 60)`))).rejects.toThrow();
    await expect(as(U1, () => db.query(`select hit_rate_limit('c', 1, 60)`))).rejects.toThrow();
    await expect(as(U1, () => db.query(`select * from app_rate_limits`))).rejects.toThrow();
    await db.exec(`set role service_role;`);
    try { expect((await db.query<{ ok: boolean }>(`select hit_rate_limit('svc', 1, 60) as ok`)).rows[0].ok).toBe(true); } finally { await db.exec("reset role;"); }
    await db.exec(`update app_rate_limits set reset_at = now() - interval '2 hours'`);
    expect((await db.query<{ n: number }>(`select purge_rate_limits() as n`)).rows[0].n).toBeGreaterThan(0);
  });
});

describe("personal data rights", () => {
  const U3 = "00000000-0000-0000-0000-000000000003";
  let lessonId: string, courseId: string;
  beforeAll(async () => {
    await addUsers(db, [[U3, "erase.me@test.local"]]);
    courseId = (await db.query<{ id: string }>(`select id from courses where code = 'M4'`)).rows[0].id;
    lessonId = (await db.query<{ id: string }>(`select id from lessons where course_id = '${courseId}' limit 1`)).rows[0].id;
    await db.exec(`update profiles set full_name = 'Camille Test' where id = '${U3}';
      insert into entitlements (user_id, course_id, expires_at) values ('${U3}', '${courseId}', now() + interval '1 month');
      insert into orders (user_id, status, total_cents) values ('${U3}', 'paid', 19900);
      insert into lesson_notes (user_id, lesson_id, body) values ('${U3}', '${lessonId}', 'ma note');
      insert into lesson_progress (user_id, lesson_id) values ('${U3}', '${lessonId}');
      insert into consent_records (user_id, purpose, granted, policy_version) values ('${U3}', 'terms', true, 'v1');
      insert into interest_signups (email, kind, consent_policy_version) values ('erase.me@test.local', 'newsletter', 'v1');
      insert into auth.sessions (expires_at, token, user_id) values (now() + interval '1 day', 'tok', '${U3}');
      insert into auth.accounts (account_id, provider_id, user_id, password) values ('a', 'credential', '${U3}', 'hash');`);
  });
  it("exports only the caller's own data", async () => {
    const mine = (await as(U3, () => db.query<{ d: Record<string, unknown[] & { email?: string }> }>(`select export_my_data() as d`))).rows[0].d;
    expect((mine.account as unknown as { email: string }).email).toBe("erase.me@test.local");
    expect(mine.orders).toHaveLength(1);
    expect(mine.notes).toHaveLength(1);
    expect(JSON.stringify(mine)).not.toContain("u1@test.local");
    const other = (await as(U2, () => db.query<{ d: { orders: unknown[]; notes: unknown[] } }>(`select export_my_data() as d`))).rows[0].d;
    expect(other.orders).toHaveLength(0);
    expect(other.notes).toHaveLength(0);
  });
  it("refuses export without a session and erasure from any client role", async () => {
    await expect(as(null, () => db.query(`select export_my_data()`))).rejects.toThrow();
    await expect(as(U3, () => db.query(`select anonymize_user('${U3}')`))).rejects.toThrow();
  });
  it("anonymises the account but keeps orders, payments and access for the accounts", async () => {
    await db.exec(`set role service_role;`);
    try { await db.query(`select anonymize_user('${U3}')`); } finally { await db.exec("reset role;"); }
    expect(await count(`select 1 from lesson_notes where user_id = '${U3}'`)).toBe(0);
    expect(await count(`select 1 from lesson_progress where user_id = '${U3}'`)).toBe(0);
    expect(await count(`select 1 from auth.sessions where user_id = '${U3}'`)).toBe(0);
    expect(await count(`select 1 from auth.accounts where user_id = '${U3}'`)).toBe(0);
    expect(await count(`select 1 from interest_signups where email = 'erase.me@test.local'`)).toBe(0);
    expect(await count(`select 1 from orders where user_id = '${U3}'`)).toBe(1);
    expect(await count(`select 1 from entitlements where user_id = '${U3}'`)).toBe(1);
    expect(await count(`select 1 from consent_records where anonymous_id = 'erased' and user_id is null`)).toBe(1);
    const p = (await db.query<{ email: string; full_name: string | null }>(`select email, full_name from profiles where id = '${U3}'`)).rows[0];
    expect(p.full_name).toBeNull();
    expect(p.email).toMatch(/^deleted\+.*@deleted\.invalid$/);
    expect(await count(`select 1 from auth.users where id = '${U3}' and email like 'deleted+%' and name = 'Compte supprimé'`)).toBe(1);
    expect(await count(`select 1 from audit_logs where action = 'user.anonymized' and entity_id = '${U3}'`)).toBe(1);
  });
  it("refuses to erase an administrator or an unknown user", async () => {
    await db.exec(`set role service_role;`);
    try {
      await expect(db.query(`select anonymize_user('${ADMIN}')`)).rejects.toThrow(/admin_cannot_self_delete/);
      await expect(db.query(`select anonymize_user('00000000-0000-0000-0000-0000000000ff')`)).rejects.toThrow(/unknown_user/);
    } finally { await db.exec("reset role;"); }
  });
});

describe("video pipeline queue", () => {
  let lessonId: string;
  const svc = async <T>(fn: () => Promise<T>) => { await db.exec("set role service_role;"); try { return await fn(); } finally { await db.exec("reset role;"); } };
  const asset = async (id: string) => (await db.query<{ status: string; attempts: number; error: string | null }>(`select status, attempts, error from video_assets where id = '${id}'`)).rows[0];
  beforeAll(async () => {
    const m5 = (await db.query<{ id: string }>(`select id from courses where code = 'M5'`)).rows[0].id;
    lessonId = (await db.query<{ id: string }>(`select id from lessons where course_id = '${m5}' limit 1`)).rows[0].id;
  });
  it("lets only an administrator queue a source under the lesson's own folder", async () => {
    await expect(as(U1, () => db.query(`select admin_register_video('${lessonId}', 'video-src/${lessonId}/a.mp4')`))).rejects.toThrow();
    await expect(as(ADMIN, () => db.query(`select admin_register_video('${lessonId}', 'video-src/other/a.mp4')`))).rejects.toThrow(/invalid_source_key/);
    await expect(as(ADMIN, () => db.query(`select admin_register_video('${lessonId}', 'video-src/${lessonId}/../x.mp4')`))).rejects.toThrow(/invalid_source_key/);
    const id = (await as(ADMIN, () => db.query<{ id: string }>(`select admin_register_video('${lessonId}', 'video-src/${lessonId}/a.mp4') as id`))).rows[0].id;
    expect((await asset(id)).status).toBe("uploaded");
    expect(await as(U1, () => count("select 1 from video_assets"))).toBe(0);
    expect(await as(ADMIN, () => count("select 1 from video_assets"))).toBeGreaterThan(0);
  });
  it("claims a job once, then attaches the finished video to the lesson", async () => {
    const claimed = await svc(() => db.query<{ id: string; source_key: string }>(`select * from claim_video_job()`));
    expect(claimed.rows).toHaveLength(1);
    const id = claimed.rows[0].id;
    expect(await svc(async () => (await db.query(`select * from claim_video_job()`)).rows)).toHaveLength(0); // already taken
    expect(await asset(id)).toMatchObject({ status: "processing", attempts: 1 });
    await svc(() => db.query(`select finish_video_job('${id}', true, 95, null)`));
    expect((await asset(id)).status).toBe("ready");
    expect((await db.query(`select video_provider, video_asset_id, duration_seconds from lessons where id = '${lessonId}'`)).rows[0]).toEqual({ video_provider: "hls", video_asset_id: id, duration_seconds: 95 });
  });
  it("records failures, allows an administrator retry, and gives up after 3 attempts", async () => {
    const id = (await as(ADMIN, () => db.query<{ id: string }>(`select admin_register_video('${lessonId}', 'video-src/${lessonId}/b.mp4') as id`))).rows[0].id;
    await svc(() => db.query(`select * from claim_video_job()`));
    await svc(() => db.query(`select finish_video_job('${id}', false, null, 'ffmpeg exploded')`));
    expect(await asset(id)).toMatchObject({ status: "failed", error: "ffmpeg exploded" });
    await expect(as(U1, () => db.query(`select admin_retry_video('${id}')`))).rejects.toThrow();
    await as(ADMIN, () => db.query(`select admin_retry_video('${id}')`));
    expect(await asset(id)).toMatchObject({ status: "uploaded", attempts: 0, error: null });
    await db.exec(`update video_assets set status = 'processing', attempts = 3, locked_at = now() - interval '1 hour' where id = '${id}'`);
    expect(await svc(async () => (await db.query(`select * from claim_video_job()`)).rows)).toHaveLength(0);
    expect(await asset(id)).toMatchObject({ status: "failed" });
  });
  it("keeps the queue functions away from learners", async () => {
    await expect(as(U1, () => db.query(`select * from claim_video_job()`))).rejects.toThrow();
    await expect(as(U1, () => db.query(`select finish_video_job(gen_random_uuid(), true, 1, null)`))).rejects.toThrow();
  });
});

describe("public syllabus and free preview", () => {
  let courseSlug: string;
  beforeAll(async () => {
    const row = (await db.query<{ id: string; slug: string }>(`select id, slug from courses where code = 'M2'`)).rows[0];
    courseSlug = row.slug;
    const ch = (await db.query<{ id: string }>(`insert into chapters (course_id, title, position) values ('${row.id}', 'Introduction', 1) returning id`)).rows[0].id;
    await db.exec(`insert into lessons (chapter_id, course_id, title, position, content_status, body_md, is_free_preview) values
      ('${ch}', '${row.id}', 'Leçon d''aperçu', 1, 'published', 'Texte public de la leçon d''aperçu.', true),
      ('${ch}', '${row.id}', 'Leçon payante', 2, 'published', 'Texte réservé aux apprenants.', false),
      ('${ch}', '${row.id}', 'Brouillon', 3, 'draft', 'Pas encore publié.', false);`);
  });
  it("exposes nothing while the module is not published", async () => {
    expect((await as(null, () => db.query(`select public_syllabus('${courseSlug}') as s`))).rows[0]).toEqual({ s: null });
    expect((await as(null, () => db.query(`select public_preview_lesson('${courseSlug}') as p`))).rows[0]).toEqual({ p: null });
  });
  it("shows titles only, never the paid lesson text, once published", async () => {
    await db.exec(`update courses set status = 'published' where slug = '${courseSlug}'`);
    const s = (await as(null, () => db.query<{ s: { lessons: number; chapters: { lessons: { title: string; free_preview: boolean }[] }[] } }>(`select public_syllabus('${courseSlug}') as s`))).rows[0].s;
    expect(s.lessons).toBe(2);
    expect(s.chapters[0].lessons.map((l) => l.title)).toEqual(["Leçon d'aperçu", "Leçon payante"]);
    expect(JSON.stringify(s)).not.toContain("réservé aux apprenants");
    expect(JSON.stringify(s)).not.toContain("Brouillon");
  });
  it("serves only the free preview lesson to anyone", async () => {
    const p = (await as(null, () => db.query<{ p: { title: string; body_md: string } }>(`select public_preview_lesson('${courseSlug}') as p`))).rows[0].p;
    expect(p.title).toBe("Leçon d'aperçu");
    expect(p.body_md).toContain("Texte public");
    await db.exec(`update lessons set is_free_preview = false where title = 'Leçon d''aperçu'`);
    expect((await as(null, () => db.query(`select public_preview_lesson('${courseSlug}') as p`))).rows[0]).toEqual({ p: null });
  });
});

describe("real reviews: private invitations, consent, verification", () => {
  const svc = async <T>(fn: () => Promise<T>) => { await db.exec("set role service_role;"); try { return await fn(); } finally { await db.exec("reset role;"); } };
  const submit = (token: string, consent = true, quote = "Un retour détaillé et honnête sur le module : clair, concret, exigeant sur les livrables.") =>
    svc(() => db.query<{ id: string }>(`select submit_review($1, 'Camille Test', 'Product Owner', null, $2, ${consent}) as id`, [token, quote]));
  let token: string;
  it("only an administrator creates invitations, and only a hash is stored", async () => {
    await expect(as(U1, () => db.query(`select admin_create_review_invitation('x y', 30)`))).rejects.toThrow();
    token = (await as(ADMIN, () => db.query<{ t: string }>(`select admin_create_review_invitation('Camille, PO', 30) as t`))).rows[0].t;
    expect(token).toMatch(/^[0-9a-f]{36}$/);
    expect(await count(`select 1 from review_invitations where token_hash = '${token}'`)).toBe(0);
    expect(await as(U1, () => count("select 1 from review_invitations"))).toBe(0);
  });
  it("the link opens the form only while unused and unexpired", async () => {
    expect((await svc(() => db.query<{ ok: boolean }>(`select review_invitation_open('${token}') as ok`))).rows[0].ok).toBe(true);
    expect((await svc(() => db.query<{ ok: boolean }>(`select review_invitation_open('${"0".repeat(36)}') as ok`))).rows[0].ok).toBe(false);
    await expect(as(null, () => db.query(`select review_invitation_open('${token}')`))).rejects.toThrow();
  });
  it("refuses a submission without consent, with a short text, or with a wrong link", async () => {
    await expect(submit(token, false)).rejects.toThrow(/consent_required/);
    await expect(submit(token, true, "trop court")).rejects.toThrow();
    await expect(submit("1".repeat(36))).rejects.toThrow(/invitation_invalid/);
    expect(await count("select 1 from review_submissions")).toBe(0);
  });
  it("accepts one submission per link and nothing is published by it", async () => {
    await submit(token);
    await expect(submit(token)).rejects.toThrow(/invitation_invalid/);
    expect(await count("select 1 from review_submissions where status = 'pending'")).toBe(1);
    expect(await count("select 1 from testimonials where author_name = 'Camille Test'")).toBe(0);
  });
  it("publishing requires an administrator and a recorded verification, and creates a verified testimonial", async () => {
    const id = (await db.query<{ id: string }>(`select id from review_submissions limit 1`)).rows[0].id;
    await expect(as(U1, () => db.query(`select admin_approve_review('${id}', 'verified by me')`))).rejects.toThrow();
    await expect(as(ADMIN, () => db.query(`select admin_approve_review('${id}', 'ok')`))).rejects.toThrow(/reference_required/);
    await as(ADMIN, () => db.query(`select admin_approve_review('${id}', 'a suivi M2, accès offert, échange par e-mail')`));
    const t = (await db.query<{ status: string; verified_at: string | null; consent_reference: string }>(`select status, verified_at, consent_reference from testimonials where author_name = 'Camille Test'`)).rows[0];
    expect(t.status).toBe("published");
    expect(t.verified_at).not.toBeNull();
    expect(t.consent_reference).toContain("consentement explicite");
    await expect(as(ADMIN, () => db.query(`select admin_approve_review('${id}', 'second time')`))).rejects.toThrow(/not_pending/);
  });
});

describe("live sessions: calendar, booking, waiting list, private link", () => {
  const U4 = "00000000-0000-0000-0000-000000000004";
  const U5 = "00000000-0000-0000-0000-000000000005";
  let open: string, learners: string, courseId: string;
  const save = (title: string, startsInHours: number, capacity: number, audience: "open" | "learners", status = "published", course: string | null = null) =>
    as(ADMIN, () => db.query<{ id: string }>(`select admin_save_session(null, '${title}', 'Atelier de test', ${course ? `'${course}'` : "null"}, (now() at time zone 'Europe/Paris') + interval '${startsInHours} hours', 60, ${capacity}, '${audience}', null, '${status}') as id`)).then((r) => r.rows[0].id);
  const book = (uid: string, id: string) => as(uid, () => db.query<{ s: string }>(`select book_session('${id}') as s`)).then((r) => r.rows[0].s);
  const status = async (uid: string, id: string) => (await db.query<{ status: string }>(`select status from session_bookings where session_id = '${id}' and user_id = '${uid}'`)).rows[0]?.status;

  beforeAll(async () => {
    await addUsers(db, [[U4, "u4@test.local"], [U5, "u5@test.local"]]);
    courseId = (await db.query<{ id: string }>(`select id from courses where code = 'M3'`)).rows[0].id;
    open = await save("Atelier ouvert", 48, 2, "open");
    learners = await save("Atelier du module", 72, 5, "learners", "published", courseId);
  });

  it("only administrators create sessions; a default private Jitsi room is generated", async () => {
    await expect(as(U1, () => db.query(`select admin_save_session(null, 'x y z', '', null, now()::timestamp, 60, 5, 'open', null, 'published')`))).rejects.toThrow();
    const url = (await as(ADMIN, () => db.query<{ u: string }>(`select session_meeting_url('${open}') as u`))).rows[0].u;
    expect(url).toMatch(/^https:\/\/meet\.jit\.si\/TRAIL-[0-9a-f]{24}$/);
  });
  it("hides drafts and the meeting link from the public, and the table never exposes the link", async () => {
    const draft = await save("Brouillon", 24, 5, "open", "draft");
    const list = (await as(null, () => db.query<{ l: { id: string }[] }>(`select list_sessions(now(), now() + interval '30 days') as l`))).rows[0].l;
    expect(list.map((s) => s.id)).toContain(open);
    expect(list.map((s) => s.id)).not.toContain(draft);
    expect(JSON.stringify(list)).not.toContain("meet.jit.si");
    await expect(as(null, () => db.query(`select meeting_url from live_sessions`))).rejects.toThrow();
    await expect(as(U1, () => db.query(`select meeting_url from live_sessions`))).rejects.toThrow();
    expect((await as(U1, () => db.query<{ u: string | null }>(`select session_meeting_url('${open}') as u`))).rows[0].u).toBeNull();
  });
  it("requires an account, and for a module session an active access to it", async () => {
    await expect(as(null, () => db.query(`select book_session('${open}')`))).rejects.toThrow();
    await expect(book(U4, learners)).rejects.toThrow(/access_required/);
    await db.exec(`insert into entitlements (user_id, course_id, expires_at) values ('${U4}', '${courseId}', now() + interval '1 month')`);
    expect(await book(U4, learners)).toBe("booked");
  });
  it("seats people while there is room, then uses a waiting list, and the link opens only for confirmed bookings", async () => {
    expect(await book(U1, open)).toBe("booked");
    expect(await book(U2, open)).toBe("booked");
    expect(await book(U5, open)).toBe("waitlist");
    expect(await book(U1, open)).toBe("booked"); // idempotent
    expect((await as(U1, () => db.query<{ u: string | null }>(`select session_meeting_url('${open}') as u`))).rows[0].u).toMatch(/^https:/);
    expect((await as(U5, () => db.query<{ u: string | null }>(`select session_meeting_url('${open}') as u`))).rows[0].u).toBeNull();
    const l = (await as(null, () => db.query<{ l: { id: string; booked: number; waitlist: number }[] }>(`select list_sessions(now(), now() + interval '30 days') as l`))).rows[0].l.find((s) => s.id === open)!;
    expect([l.booked, l.waitlist]).toEqual([2, 1]);
  });
  it("promotes the first person on the waiting list when a seat is freed, and shows people only their own bookings", async () => {
    const promoted = (await as(U1, () => db.query<{ p: string | null }>(`select cancel_booking('${open}') as p`))).rows[0].p;
    expect(promoted).toBe(U5);
    expect(await status(U5, open)).toBe("booked");
    expect(await status(U1, open)).toBe("canceled");
    expect(await as(U2, () => count("select 1 from session_bookings"))).toBe(1);
    expect((await as(U1, () => db.query<{ p: string | null }>(`select cancel_booking('${open}') as p`))).rows[0].p).toBeNull(); // already canceled: nothing happens
  });
  it("enlarging the capacity seats the waiting list; canceled and past sessions cannot be booked", async () => {
    const full = await save("Petit atelier", 30, 1, "open");
    expect(await book(U1, full)).toBe("booked");
    expect(await book(U2, full)).toBe("waitlist");
    await as(ADMIN, () => db.query(`select admin_save_session('${full}', 'Petit atelier', 'Atelier de test', null, (now() at time zone 'Europe/Paris') + interval '30 hours', 60, 2, 'open', null, 'published')`));
    expect(await status(U2, full)).toBe("booked");
    await as(ADMIN, () => db.query(`select admin_cancel_session('${full}')`));
    await expect(book(U5, full)).rejects.toThrow(/session_unavailable/);
    const past = await save("Passé", -3, 5, "open");
    await expect(book(U5, past)).rejects.toThrow(/session_started/);
  });
  it("lets only administrators see attendees, and refuses to delete a session that has bookings", async () => {
    await expect(as(U1, () => db.query(`select * from admin_session_attendees('${open}')`))).rejects.toThrow();
    const names = (await as(ADMIN, () => db.query<{ email: string }>(`select email from admin_session_attendees('${open}')`))).rows.map((r) => r.email);
    expect(names).toEqual(expect.arrayContaining(["u2@test.local", "u5@test.local"]));
    await expect(as(ADMIN, () => db.query(`select admin_delete_session('${open}')`))).rejects.toThrow(/has_bookings/);
  });
  it("gives contact details only to the service role", async () => {
    await expect(as(U1, () => db.query(`select * from user_contact('${U5}')`))).rejects.toThrow();
    await db.exec("set role service_role;");
    try { expect((await db.query<{ email: string }>(`select email from user_contact('${U5}')`)).rows[0].email).toBe("u5@test.local"); } finally { await db.exec("reset role;"); }
  });
  it("includes bookings in the personal data export and removes them on erasure", async () => {
    const mine = (await as(U2, () => db.query<{ d: { sessions: unknown[] } }>(`select export_my_data() as d`))).rows[0].d;
    expect(mine.sessions.length).toBeGreaterThan(0);
    await db.exec("set role service_role;");
    try { await db.query(`select anonymize_user('${U2}')`); } finally { await db.exec("reset role;"); }
    expect(await count(`select 1 from session_bookings where user_id = '${U2}'`)).toBe(0);
  });
});
