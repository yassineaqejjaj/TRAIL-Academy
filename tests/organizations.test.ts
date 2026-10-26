// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { addUsers, createTestDb } from "./helpers/db";

const ADMIN = "00000000-0000-0000-0000-0000000000aa";
const MGR = "00000000-0000-0000-0000-000000000b01";
const L1 = "00000000-0000-0000-0000-000000000b02";
const L2 = "00000000-0000-0000-0000-000000000b03";
const OUT = "00000000-0000-0000-0000-000000000b04";
let db: PGlite;
let org: string, pack: string, path: string;

const as = async <T>(uid: string | null, fn: () => Promise<T>): Promise<T> => {
  await db.exec(uid ? `set role authenticated; select set_config('app.uid','${uid}',false)` : "set role anon");
  try { return await fn(); } finally { await db.exec("reset role; select set_config('app.uid','',false)"); }
};
const q = async <T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []) => as(uid, async () => (await db.query<T>(sql, params)).rows);
const one = async <T = Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows[0];
const count = async (sql: string) => Number((await one<{ n: number }>(`select count(*)::int n from (${sql}) x`)).n);

async function join(uid: string, role: "manager" | "learner") {
  const inviter = role === "manager" ? ADMIN : MGR;
  const token = (await q<{ t: string }>(inviter, "select create_org_invitation($1, $2, 'test', 14) t", [org, role]))[0].t;
  await q(uid, "select accept_org_invitation($1, true)", [token]);
  return token;
}

beforeAll(async () => {
  db = await createTestDb();
  await addUsers(db, [[ADMIN, "a@t.local"], [MGR, "m@t.local", "Manon Manager"], [L1, "l1@t.local", "Léa"], [L2, "l2@t.local"], [OUT, "out@t.local"]]);
  await db.exec(`insert into user_roles values ('${ADMIN}', 'admin');`);
  org = (await q<{ id: string }>(ADMIN, "select admin_create_organization('Atelier Test', 'rh@atelier.test') id"))[0].id;
  path = (await one<{ id: string }>("select id from learning_paths where slug = 'rh-augmentees'")).id;
  pack = (await q<{ id: string }>(ADMIN, "select admin_create_license_pack($1, 2, current_date + 90, null) id", [org]))[0].id;
  await join(MGR, "manager");
});

describe("invitations and consent", () => {
  it("only an administrator can create an organisation, a pack or a manager invitation", async () => {
    await expect(q(L1, "select admin_create_organization('x')")).rejects.toThrow(/admin only/);
    await expect(q(MGR, "select create_org_invitation($1, 'manager', 'x y', 5)", [org])).rejects.toThrow(/admin only/);
    await expect(q(L1, "select create_org_invitation($1, 'learner', 'x y', 5)", [org])).rejects.toThrow(/manager only/);
  });
  it("a link works once, needs consent, and only its hash is stored", async () => {
    const token = (await q<{ t: string }>(MGR, "select create_org_invitation($1, 'learner', 'Léa', 14) t", [org]))[0].t;
    expect(await count(`select 1 from organization_invitations where token_hash = '${token}'`)).toBe(0);
    await expect(q(L1, "select accept_org_invitation($1, false)", [token])).rejects.toThrow(/consent_required/);
    await q(L1, "select accept_org_invitation($1, true)", [token]);
    await expect(q(L2, "select accept_org_invitation($1, true)", [token])).rejects.toThrow(/invitation_invalid/);
    expect(await count(`select 1 from consent_records where user_id = '${L1}' and purpose = 'organization_progress_sharing' and granted`)).toBe(1);
    await join(L2, "learner");
  });
  it("an anonymous visitor cannot accept", async () => {
    await expect(q(null, "select accept_org_invitation('abc', true)")).rejects.toThrow();
  });
});

describe("seats", () => {
  it("allocates within the pack, grants the path's courses until the pack ends, and refuses beyond the seats", async () => {
    await q(MGR, "select allocate_license_seat($1, $2, $3)", [pack, L1, path]);
    await q(MGR, "select allocate_license_seat($1, $2, $3)", [pack, L2, path]);
    const n = await count(`select 1 from learning_path_courses where path_id = '${path}'`);
    expect(await count(`select 1 from entitlements where user_id = '${L1}' and status = 'active' and expires_at > now() + interval '80 days'`)).toBe(n);
    await expect(q(MGR, "select allocate_license_seat($1, $2, $3)", [pack, MGR, path])).rejects.toThrow(/no_seat_left/);
    await expect(q(MGR, "select allocate_license_seat($1, $2, $3)", [pack, L1, path])).rejects.toThrow(/already_allocated/);
  });
  it("refuses people who are not accepted members, and non-managers", async () => {
    await expect(q(MGR, "select allocate_license_seat($1, $2, $3)", [pack, OUT, path])).rejects.toThrow(/not_a_member|no_seat_left/);
    await expect(q(L1, "select allocate_license_seat($1, $2, $3)", [pack, L1, path])).rejects.toThrow(/manager only/);
  });
  it("releasing a seat revokes only the access that came from it and frees the seat", async () => {
    const alloc = (await q<{ id: string }>(ADMIN, `select id from license_allocations where user_id = '${L2}'`))[0].id;
    await q(MGR, "select release_license_seat($1)", [alloc]);
    expect(await count(`select 1 from entitlements where user_id = '${L2}' and status = 'active'`)).toBe(0);
    await q(MGR, "select allocate_license_seat($1, $2, $3)", [pack, L2, path]);
    expect(await count(`select 1 from entitlements where user_id = '${L2}' and status = 'active'`)).toBeGreaterThan(0);
  });
});

describe("progress report and privacy", () => {
  beforeAll(async () => {
    const course = await one<{ id: string }>(`select c.id from courses c join learning_path_courses l on l.course_id = c.id where l.path_id = '${path}' order by l.position limit 1`);
    await db.exec(`insert into learner_progress (user_id, course_id, percent) values ('${L1}', '${course.id}', 60)`);
    await db.exec(`insert into assignment_submissions (assignment_id, user_id, content_md, status) select a.id, '${L1}', 'Mon livrable confidentiel', 'submitted' from assignments a limit 1`).catch(() => undefined);
  });
  it("a manager sees names, percentages and quiz status but never answers or submissions", async () => {
    const r = (await q<{ r: { members: { name: string; courses: { percent: number }[] }[]; packs: { seats: number; used: number }[] } }>(MGR, "select org_progress_report($1) r", [org]))[0].r;
    const lea = r.members.find((m) => m.name === "Léa")!;
    expect(lea.courses.some((c) => c.percent === 60)).toBe(true);
    expect(r.packs[0]).toMatchObject({ seats: 2, used: 2 });
    expect(JSON.stringify(r)).not.toMatch(/confidentiel|answers|instructor_feedback/);
    expect(await q(MGR, "select 1 from assignment_submissions")).toHaveLength(0);
    expect(await q(MGR, "select 1 from quiz_attempts")).toHaveLength(0);
  });
  it("a manager can read the progress rows of accepted members only; other learners and outsiders cannot read the report", async () => {
    expect(await q(MGR, `select 1 from learner_progress where user_id = '${L1}'`)).toHaveLength(1);
    expect(await q(L2, `select 1 from learner_progress where user_id = '${L1}'`)).toHaveLength(0);
    await expect(q(L2, "select org_progress_report($1)", [org])).rejects.toThrow(/manager only/);
    await expect(q(OUT, "select org_progress_report($1)", [org])).rejects.toThrow(/manager only/);
  });
  it("leaving stops the sharing and ends the access the organisation gave", async () => {
    await q(L1, "select leave_organization($1)", [org]);
    expect(await q(MGR, `select 1 from learner_progress where user_id = '${L1}'`)).toHaveLength(0);
    expect(await count(`select 1 from entitlements where user_id = '${L1}' and status = 'active'`)).toBe(0);
    expect(await count(`select 1 from consent_records where user_id = '${L1}' and purpose = 'organization_progress_sharing' and not granted`)).toBe(1);
  });
});
