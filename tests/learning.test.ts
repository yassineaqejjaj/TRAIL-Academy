// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const U1 = "00000000-0000-0000-0000-000000000001";
const U2 = "00000000-0000-0000-0000-000000000002";
const ADMIN = "00000000-0000-0000-0000-0000000000aa";

const stubs = `
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
const one = async <T = Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows[0];
const rpc = async <T = Record<string, unknown>>(uid: string | null, sql: string) =>
  as(uid, async () => (await db.query<{ r: T }>(`select ${sql} as r`)).rows[0].r);
const count = async (sql: string) => Number((await one<{ n: number }>(`select count(*)::int n from (${sql}) x`)).n);

let course: string, lesson1: string, lesson2: string, quiz: string, qSingle: string, qMulti: string, qText: string;
let oSingleOk: string, oSingleBad: string, oMultiA: string, oMultiB: string, oMultiBad: string, assignment: string;

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(stubs);
  for (const f of ["0001_schema", "0002_rls", "0003_learning"]) await db.exec(read(`supabase/migrations/${f}.sql`));
  await db.exec(`grant usage on schema public, auth to anon, authenticated, service_role;
    grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
    grant select on all tables in schema public to anon;
    grant select, insert on storage.objects to authenticated;`);
  await db.exec(read("supabase/seed.sql"));
  for (const [id, email, name] of [[U1, "u1@test.local", "Alice Test"], [U2, "u2@test.local", "Bob Test"], [ADMIN, "a@test.local", "Admin"]])
    await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${id}', '${email}', '{"full_name":"${name}"}');`);
  await db.exec(`insert into user_roles values ('${ADMIN}', 'admin');`);

  // Test fixtures only — clearly synthetic; never part of seed.sql.
  course = (await one<{ id: string }>(`update courses set status = 'published' where code = 'M4' returning id`)).id;
  const ch = (await one<{ id: string }>(`insert into chapters (course_id, title, position) values ('${course}', 'Chapitre test', 1) returning id`)).id;
  lesson1 = (await one<{ id: string }>(`insert into lessons (chapter_id, course_id, title, position, content_status) values ('${ch}', '${course}', 'L1 test', 1, 'published') returning id`)).id;
  lesson2 = (await one<{ id: string }>(`insert into lessons (chapter_id, course_id, title, position, content_status) values ('${ch}', '${course}', 'L2 test', 2, 'published') returning id`)).id;
  await db.exec(`insert into lessons (chapter_id, course_id, title, position, content_status) values ('${ch}', '${course}', 'Brouillon', 3, 'draft');`); // drafts never count
  quiz = (await one<{ id: string }>(`insert into quizzes (course_id, title, pass_percent, max_attempts) values ('${course}', 'Quiz test', 70, 4) returning id`)).id;
  const q = async (kind: string, pos: number) => (await one<{ id: string }>(`insert into quiz_questions (quiz_id, kind, prompt, feedback, points, position) values ('${quiz}', '${kind}', 'Q${pos}', 'fb${pos}', 1, ${pos}) returning id`)).id;
  qSingle = await q("single_choice", 1); qMulti = await q("multiple_choice", 2); qText = await q("free_text", 3);
  const o = async (qid: string, ok: boolean, pos: number) => (await one<{ id: string }>(`insert into quiz_options (question_id, label, is_correct, position) values ('${qid}', 'opt', ${ok}, ${pos}) returning id`)).id;
  oSingleOk = await o(qSingle, true, 1); oSingleBad = await o(qSingle, false, 2);
  oMultiA = await o(qMulti, true, 1); oMultiB = await o(qMulti, true, 2); oMultiBad = await o(qMulti, false, 3);
  assignment = (await one<{ id: string }>(`insert into assignments (course_id, title, instructions_md) values ('${course}', 'Livrable test', 'x') returning id`)).id;
  await db.exec(`insert into entitlements (user_id, course_id, expires_at) values ('${U1}', '${course}', now() + interval '12 months');`);
});

const good = () => ({ [qSingle]: [oSingleOk], [qMulti]: [oMultiA, oMultiB], [qText]: "ma réponse libre" });

describe("lesson progress", () => {
  it("denies visitors and non-entitled users", async () => {
    await expect(rpc(null, `record_lesson_progress('${lesson1}', 10)`)).rejects.toThrow();
    await expect(rpc(U2, `record_lesson_progress('${lesson1}', 10)`)).rejects.toThrow(/access denied/);
    expect(await count("select 1 from lesson_progress")).toBe(0);
  });
  it("saves the resume position and last visited lesson", async () => {
    await rpc(U1, `record_lesson_progress('${lesson1}', 42)`);
    expect((await one<{ position_seconds: number }>(`select position_seconds from lesson_progress where user_id='${U1}' and lesson_id='${lesson1}'`)).position_seconds).toBe(42);
    expect((await one<{ last_lesson_id: string }>(`select last_lesson_id from enrollments where user_id='${U1}'`)).last_lesson_id).toBe(lesson1);
  });
  it("computes percent from required published lessons only (draft ignored)", async () => {
    const r = await rpc<{ percent: number }>(U1, `record_lesson_progress('${lesson1}', 60, true)`);
    expect(r.percent).toBe(50);
  });
  it("never undoes completion", async () => {
    await rpc(U1, `record_lesson_progress('${lesson1}', 5, false)`);
    expect((await one<{ percent: number }>(`select percent from learner_progress where user_id='${U1}'`)).percent).toBe(50);
  });
  it("blocks direct writes to lesson_progress", async () => {
    await expect(as(U1, () => db.exec(`update lesson_progress set completed_at = now(), position_seconds = 1`))).resolves.not.toThrow();
    expect(await count(`select 1 from lesson_progress where position_seconds = 1`)).toBe(0);
    await expect(as(U1, () => db.exec(`insert into lesson_progress (user_id, lesson_id, completed_at) values ('${U1}', '${lesson2}', now())`))).rejects.toThrow();
  });
});

describe("quizzes", () => {
  it("serves options without the answer key and only to entitled users", async () => {
    const rows = await as(U1, async () => (await db.query<Record<string, unknown>>(`select * from get_quiz_options('${quiz}')`)).rows);
    expect(rows).toHaveLength(5);
    expect(Object.keys(rows[0])).not.toContain("is_correct");
    expect(await as(U2, async () => (await db.query(`select * from get_quiz_options('${quiz}')`)).rows.length)).toBe(0);
    await expect(as(U1, () => db.query(`select * from quiz_options`)).then((r) => r.rows.length)).resolves.toBe(0);
  });
  it("grades objective questions and ignores free text in the score", async () => {
    const r = await rpc<{ score: number; passed: boolean; needs_review: boolean }>(U1, `submit_quiz('${quiz}', '${JSON.stringify(good())}'::jsonb)`);
    expect(r.score).toBe(100);
    expect(r.passed).toBe(true);
    expect(r.needs_review).toBe(true);
  });
  it("requires the exact set for multiple choice and fails below threshold", async () => {
    const partial = { [qSingle]: [oSingleOk], [qMulti]: [oMultiA] };
    const r = await rpc<{ score: number; passed: boolean }>(U1, `submit_quiz('${quiz}', '${JSON.stringify(partial)}'::jsonb)`);
    expect(r.score).toBe(50);
    expect(r.passed).toBe(false);
    const wrong = { [qSingle]: [oSingleBad], [qMulti]: [oMultiA, oMultiB, oMultiBad] };
    expect((await rpc<{ score: number }>(U1, `submit_quiz('${quiz}', '${JSON.stringify(wrong)}'::jsonb)`)).score).toBe(0);
  });
  it("keeps every attempt and enforces the attempt limit", async () => {
    expect(await count(`select 1 from quiz_attempts where user_id='${U1}'`)).toBe(3);
    await rpc(U1, `submit_quiz('${quiz}', '{}'::jsonb)`); // 4th
    await expect(rpc(U1, `submit_quiz('${quiz}', '{}'::jsonb)`)).rejects.toThrow(/attempt limit/);
  });
  it("denies non-entitled users and rejects malformed answers", async () => {
    await expect(rpc(U2, `submit_quiz('${quiz}', '{}'::jsonb)`)).rejects.toThrow(/access denied/);
    await expect(rpc(U1, `submit_quiz('${quiz}', '[]'::jsonb)`)).rejects.toThrow();
  });
  it("does not let learners forge attempts directly", async () => {
    await expect(as(U1, () => db.exec(`insert into quiz_attempts (quiz_id, user_id, answers, score_percent, passed) values ('${quiz}', '${U1}', '{}', 100, true)`))).rejects.toThrow();
  });
});

describe("assignments, completion and attestation", () => {
  it("is not complete while the second lesson and the assignment are missing", async () => {
    const r = await rpc<{ completed: boolean }>(U1, `try_complete_course('${U1}', '${course}')`).catch(() => null);
    expect(r).toBeNull(); // internal function is not callable by clients
    expect(await count(`select 1 from enrollments where user_id='${U1}' and completed_at is not null`)).toBe(0);
    expect(await count(`select 1 from attestations`)).toBe(0);
  });
  it("blocks submissions without entitlement or with a foreign storage path", async () => {
    await expect(as(U2, () => db.exec(`insert into assignment_submissions (assignment_id, user_id, body) values ('${assignment}', '${U2}', 'x')`))).rejects.toThrow();
    await expect(as(U1, () => db.exec(`insert into assignment_submissions (assignment_id, user_id, storage_path) values ('${assignment}', '${U1}', '${U2}/f.pdf')`))).rejects.toThrow();
    await expect(as(U1, () => db.exec(`insert into assignment_submissions (assignment_id, user_id) values ('${assignment}', '${U1}')`))).rejects.toThrow();
  });
  it("lets the learner submit but not self-accept", async () => {
    await as(U1, () => db.exec(`insert into assignment_submissions (assignment_id, user_id, body, storage_path) values ('${assignment}', '${U1}', 'Mon livrable', '${U1}/livrable.pdf')`));
    await as(U1, () => db.exec(`update assignment_submissions set status = 'accepted'`));
    expect(await count(`select 1 from assignment_submissions where status = 'accepted'`)).toBe(0);
    await expect(as(U1, () => db.exec(`insert into assignment_submissions (assignment_id, user_id, body, status) values ('${assignment}', '${U1}', 'x', 'accepted')`))).rejects.toThrow();
  });
  it("hides other learners' submissions", async () => {
    expect(await as(U2, () => count("select 1 from assignment_submissions"))).toBe(0);
  });
  it("completes only when every rule is met, then issues one attestation", async () => {
    // Quiz passed, lesson 1 done; lesson 2 missing.
    expect(await count(`select 1 from attestations`)).toBe(0);
    // Lessons and quiz satisfied but the submission is still pending review: not complete.
    const pending = await rpc<{ completed: boolean; percent: number }>(U1, `record_lesson_progress('${lesson2}', 0, true)`);
    expect(pending.percent).toBe(100);
    expect(pending.completed).toBe(false);
    expect(await count(`select 1 from attestations`)).toBe(0);
    // Instructor accepts the assignment → completion is evaluated by the trigger.
    await as(ADMIN, () => db.exec(`update assignment_submissions set status = 'accepted', instructor_feedback = 'Bien'`));
    expect(await count(`select 1 from enrollments where user_id='${U1}' and completed_at is not null`)).toBe(1);
    const r = await rpc<{ completed: boolean; attestation_code: string }>(U1, `record_lesson_progress('${lesson2}', 0, true)`);
    expect(r.completed).toBe(true);
    expect(r.attestation_code).toMatch(/^[0-9a-f]{24}$/);
    // Idempotent
    await rpc(U1, `record_lesson_progress('${lesson2}', 0, true)`);
    expect(await count(`select 1 from attestations where user_id='${U1}'`)).toBe(1);
  });
  it("verifies an attestation publicly with minimal data, rejecting unknown codes", async () => {
    const { verification_code } = await one<{ verification_code: string }>(`select verification_code from attestations`);
    const rows = await as(null, async () => (await db.query<{ course_title: string; holder_name: string }>(`select * from verify_attestation('${verification_code}')`)).rows);
    expect(rows).toHaveLength(1);
    expect(rows[0].course_title).toBe("Prompt Engineering");
    expect(rows[0].holder_name).toBe("Alice Test");
    expect(await as(null, async () => (await db.query(`select * from verify_attestation('deadbeef')`)).rows.length)).toBe(0);
  });
  it("lets the owner, not others, read the attestation", async () => {
    expect(await as(U1, () => count("select 1 from attestations"))).toBe(1);
    expect(await as(U2, () => count("select 1 from attestations"))).toBe(0);
  });
});

describe("rules and expiry", () => {
  it("a course without published lessons cannot complete", async () => {
    const m5 = (await one<{ id: string }>(`select id from courses where code='M5'`)).id;
    await db.exec(`select try_complete_course('${U2}', '${m5}')`);
    expect(await count(`select 1 from enrollments where course_id='${m5}' and completed_at is not null`)).toBe(0);
  });
  it("honours configurable rules (quizzes not required)", async () => {
    await db.exec(`update courses set completion_rules = '{"requireAllLessons": true, "requireQuizzes": false, "requireAssignments": false}' where id = '${course}';
      insert into entitlements (user_id, course_id, expires_at) values ('${U2}', '${course}', now() + interval '1 month');`);
    await rpc(U2, `record_lesson_progress('${lesson1}', 0, true)`);
    const r = await rpc<{ completed: boolean }>(U2, `record_lesson_progress('${lesson2}', 0, true)`);
    expect(r.completed).toBe(true);
  });
  it("stops progress and quizzes once access expired, but keeps earned data", async () => {
    await db.exec(`update entitlements set expires_at = now() - interval '1 day' where user_id = '${U1}'`);
    await expect(rpc(U1, `record_lesson_progress('${lesson1}', 1)`)).rejects.toThrow(/access denied/);
    await expect(rpc(U1, `submit_quiz('${quiz}', '{}'::jsonb)`)).rejects.toThrow(/access denied/);
    expect(await as(U1, () => count("select 1 from attestations"))).toBe(1);
    expect(await as(U1, () => count("select 1 from learner_progress"))).toBe(1);
  });
  it("flags lapsed entitlements via the maintenance function (service role only)", async () => {
    await expect(rpc(U1, `expire_entitlements()`)).rejects.toThrow();
    await db.exec(`set role service_role;`);
    const n = (await db.query<{ n: number }>(`select expire_entitlements() n`)).rows[0].n;
    await db.exec(`reset role;`);
    expect(n).toBe(1);
  });
});

describe("notes and bookmarks", () => {
  it("are private to their author and require lesson access", async () => {
    await db.exec(`update entitlements set expires_at = now() + interval '1 month', status = 'active' where user_id = '${U1}'`);
    await as(U1, () => db.exec(`insert into lesson_notes (user_id, lesson_id, body, position_seconds) values ('${U1}', '${lesson1}', 'ma note', 12);
      insert into lesson_bookmarks (user_id, lesson_id, position_seconds, label) values ('${U1}', '${lesson1}', 12, 'important')`));
    expect(await as(U2, () => count("select 1 from lesson_notes"))).toBe(0);
    expect(await as(U1, () => count("select 1 from lesson_notes"))).toBe(1);
    await db.exec(`delete from entitlements where user_id = '${U2}'`);
    await expect(as(U2, () => db.exec(`insert into lesson_notes (user_id, lesson_id, body) values ('${U2}', '${lesson1}', 'x')`))).rejects.toThrow();
  });
});
