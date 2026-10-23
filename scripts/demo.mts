/**
 * LOCAL DEMO ONLY. Creates two fictional accounts in a LOCAL development database so the product can be explored
 * without signing up: an instructor (admin) and a learner part-way through the demo module.
 *   npm run demo
 * Refuses to run in production or against a non-local database. The password below is a demo value for local use only.
 */
import { hash } from "@node-rs/argon2";
import pg from "pg";

const DEMO_PASSWORD = "demo-trail-2026";
const url = process.env.DATABASE_URL;
if (!url || process.env.NODE_ENV === "production" || !/@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(url)) {
  console.error("refusing to run: DATABASE_URL must point to a local database and NODE_ENV must not be production");
  process.exit(1);
}
const accounts = [
  { email: "formateur@demo.trail.test", name: "Formateur Démo", admin: true },
  { email: "camille@demo.trail.test", name: "Camille Dubois", admin: false },
];

const db = new pg.Client({ connectionString: url });
await db.connect();
try {
  // Same Argon2id parameters as src/lib/auth/config.ts, so Better Auth verifies these hashes.
  const passwordHash = await hash(DEMO_PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32, algorithm: 2 });
  const ids: Record<string, string> = {};
  for (const a of accounts) {
    const existing = (await db.query("select id from auth.users where email = $1", [a.email])).rows[0];
    if (existing) { ids[a.email] = existing.id; continue; }
    const u = (await db.query("insert into auth.users (name, email, email_verified) values ($1, $2, true) returning id", [a.name, a.email])).rows[0];
    await db.query("insert into auth.accounts (account_id, provider_id, user_id, password) values ($1, 'credential', $2, $3)", [String(u.id), u.id, passwordHash]);
    ids[a.email] = u.id;
    if (a.admin) await db.query("insert into user_roles (user_id, role) values ($1, 'admin') on conflict do nothing", [u.id]);
  }

  // The learner holds the demo module and is part-way through it (progress goes through the real database functions, under RLS).
  const learner = ids["camille@demo.trail.test"];
  await db.query("insert into entitlements (user_id, course_id, expires_at) select $1, id, now() + interval '12 months' from courses where code = 'M4' on conflict do nothing", [learner]);
  const done = (await db.query("select count(*)::int as n from lesson_progress where user_id = $1 and completed_at is not null", [learner])).rows[0].n;
  if (done === 0) {
    await db.query("begin");
    await db.query("set local role authenticated");
    await db.query("select set_config('app.uid', $1, true)", [learner]);
    const lessons = (await db.query("select l.id from lessons l join chapters c on c.id = l.chapter_id where l.course_id = (select id from courses where code = 'M4') order by c.position, l.position limit 2")).rows;
    for (const l of lessons) await db.query("select record_lesson_progress($1, 0, true)", [l.id]);
    // The learner has done two lessons and handed in the deliverable; the quiz is left to try.
    await db.query("insert into assignment_submissions (assignment_id, user_id, body) select a.id, auth.uid(), 'Mon prompt de référence : rôle, contexte, tâche, format de sortie JSON, deux exemples.' from assignments a where a.course_id = (select id from courses where code = 'M4')");
    await db.query("commit");
  }
  console.log("\nDemo accounts (local only), password for both:", DEMO_PASSWORD);
  for (const a of accounts) console.log(`  ${a.admin ? "instructor/admin" : "learner         "}  ${a.email}`);
} finally {
  await db.end();
}
