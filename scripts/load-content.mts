/**
 * Loads written course content (content/modules/*.json) and blog articles (content/blog/*.md) into a database AS DRAFTS.
 * Nothing becomes visible to learners or visitors: the instructor reviews, adds videos, then publishes from the admin.
 *
 *   DATABASE_URL=… [DATABASE_SSL=require] npm run content:load -- --module M1 [--replace]
 *   DATABASE_URL=… npm run content:load -- --blog
 *
 *   DATABASE_URL=… npm run content:load -- --module M1 --sync     update lesson texts in place (matched by title), keeping ids, status and learner progress
 *   DATABASE_URL=… npm run content:load -- --blog --sync          same for articles (matched by slug)
 *
 * A module that already has chapters is left untouched unless --replace is given; --replace refuses to run when learners
 * have progress, quiz attempts or submissions for that module.
 */
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";

interface Lesson { title: string; kind: "reading" | "exercise" | "video" | "demo"; body_md: string }
interface Question { kind: "single_choice" | "multiple_choice" | "free_text"; prompt: string; feedback?: string; options: [string, boolean][] }
interface Module {
  course: string; chapters: { title: string; lessons: Lesson[] }[];
  quiz: { title: string; pass_percent: number; max_attempts: number | null; questions: Question[] };
  assignment: { title: string; instructions_md: string };
}

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const value = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set"); process.exit(1); }
const ssl = process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined;
const client = new pg.Client({ connectionString: url, ssl });
await client.connect();
await client.query("set search_path = public");

/**
 * Updates the text of existing lessons (same course, same title) and the assignment instructions, and ADDS chapters and lessons
 * that are new in the file (appended at the end, published when the module is already published, draft otherwise).
 * Ids, status and learner progress of existing lessons are never touched.
 */
async function syncModule(m: Module) {
  const course = (await client.query<{ id: string; status: string }>("select id, status from courses where code = $1", [m.course])).rows[0];
  if (!course) throw new Error(`unknown course ${m.course}`);
  const status = course.status === "published" ? "published" : "draft";
  let updated = 0, added = 0; const missing: string[] = [];
  await client.query("begin");
  try {
    for (const c of m.chapters) {
      let ch = (await client.query<{ id: string }>("select id from chapters where course_id = $1 and title = $2", [course.id, c.title])).rows[0];
      if (!ch) {
        const pos = (await client.query<{ n: number }>("select coalesce(max(position), 0)::int + 1 n from chapters where course_id = $1", [course.id])).rows[0].n;
        ch = (await client.query<{ id: string }>("insert into chapters (course_id, title, position) values ($1, $2, $3) returning id", [course.id, c.title, pos])).rows[0];
      }
      for (const l of c.lessons) {
        const r = await client.query("update lessons set body_md = $3 where course_id = $1 and title = $2 and body_md is distinct from $3", [course.id, l.title, l.body_md]);
        const exists = r.rowCount ? true : (await client.query("select 1 from lessons where course_id = $1 and title = $2", [course.id, l.title])).rowCount;
        if (!exists) {
          const pos = (await client.query<{ n: number }>("select coalesce(max(position), 0)::int + 1 n from lessons where chapter_id = $1", [ch.id])).rows[0].n;
          await client.query("insert into lessons (chapter_id, course_id, title, kind, position, content_status, body_md, required) values ($1, $2, $3, $4, $5, $6, $7, true)", [ch.id, course.id, l.title, l.kind, pos, status, l.body_md]);
          added++;
        }
        updated += r.rowCount ?? 0;
      }
    }
    await client.query("update assignments set instructions_md = $2 where course_id = $1 and title = $3", [course.id, m.assignment.instructions_md, m.assignment.title]);
    await client.query("commit");
    console.info(`${m.course}: ${updated} lesson text(s) updated, ${added} lesson(s) added (${status})${missing.length ? `, not found: ${missing.join(" | ")}` : ""}`);
  } catch (e) { await client.query("rollback"); throw e; }
}

async function loadModule(m: Module) {
  const course = (await client.query<{ id: string }>("select id from courses where code = $1", [m.course])).rows[0];
  if (!course) throw new Error(`unknown course ${m.course}`);
  const existing = (await client.query<{ n: number }>("select count(*)::int n from chapters where course_id = $1", [course.id])).rows[0].n;
  if (existing > 0 && !flag("--replace")) { console.info(`${m.course}: already has ${existing} chapter(s), skipped (use --replace)`); return; }
  await client.query("begin");
  try {
    if (existing > 0) {
      const used = (await client.query<{ n: number }>(
        `select (select count(*) from lesson_progress p join lessons l on l.id = p.lesson_id where l.course_id = $1)
              + (select count(*) from quiz_attempts a join quizzes q on q.id = a.quiz_id where q.course_id = $1)
              + (select count(*) from assignment_submissions s join assignments a on a.id = s.assignment_id where a.course_id = $1) as n`, [course.id])).rows[0].n;
      if (Number(used) > 0) throw new Error(`${m.course}: learners already have activity, refusing to replace`);
      await client.query("delete from lessons where course_id = $1", [course.id]);
      await client.query("delete from chapters where course_id = $1", [course.id]);
      await client.query("delete from quizzes where course_id = $1", [course.id]);
      await client.query("delete from assignments where course_id = $1", [course.id]);
    }
    let lessons = 0;
    for (const [ci, c] of m.chapters.entries()) {
      const ch = (await client.query<{ id: string }>("insert into chapters (course_id, title, position) values ($1, $2, $3) returning id", [course.id, c.title, ci + 1])).rows[0];
      for (const [li, l] of c.lessons.entries()) {
        await client.query("insert into lessons (chapter_id, course_id, title, kind, position, content_status, body_md, required, is_free_preview) values ($1, $2, $3, $4, $5, 'draft', $6, true, $7)", [ch.id, course.id, l.title, l.kind, li + 1, l.body_md, ci === 0 && li === 0]);
        lessons++;
      }
    }
    const quiz = (await client.query<{ id: string }>("insert into quizzes (course_id, title, pass_percent, max_attempts) values ($1, $2, $3, $4) returning id", [course.id, m.quiz.title, m.quiz.pass_percent, m.quiz.max_attempts])).rows[0];
    for (const [qi, q] of m.quiz.questions.entries()) {
      const qq = (await client.query<{ id: string }>("insert into quiz_questions (quiz_id, kind, prompt, feedback, position) values ($1, $2, $3, $4, $5) returning id", [quiz.id, q.kind, q.prompt, q.feedback ?? null, qi + 1])).rows[0];
      for (const [oi, [label, ok]] of q.options.entries()) await client.query("insert into quiz_options (question_id, label, is_correct, position) values ($1, $2, $3, $4)", [qq.id, label, ok, oi + 1]);
    }
    await client.query("insert into assignments (course_id, title, instructions_md, required) values ($1, $2, $3, true)", [course.id, m.assignment.title, m.assignment.instructions_md]);
    await client.query("commit");
    console.info(`${m.course}: ${m.chapters.length} chapters, ${lessons} lessons (draft), ${m.quiz.questions.length} quiz questions, 1 assignment`);
  } catch (e) { await client.query("rollback"); throw e; }
}

function parseArticle(text: string) {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error("article without front matter");
  const meta = Object.fromEntries(match[1].split("\n").map((l) => { const i = l.indexOf(":"); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
  return { meta, body: match[2].trim() };
}

async function loadBlog() {
  for (const f of readdirSync("content/blog").filter((x) => x.endsWith(".md")).sort()) {
    const { meta, body } = parseArticle(readFileSync(`content/blog/${f}`, "utf8"));
    const related = meta.courses ? (await client.query<{ id: string }>("select id from courses where code = any($1)", [meta.courses.split(",").map((s) => s.trim())])).rows.map((r) => r.id) : [];
    const res = await client.query(
      `insert into blog_posts (slug, title, excerpt, body_md, category, related_course_ids, seo_title, seo_description, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'draft') on conflict (slug) do ${flag("--sync") ? "update set body_md = excluded.body_md, title = excluded.title, excerpt = excluded.excerpt, category = excluded.category, related_course_ids = excluded.related_course_ids" : "nothing"}`,
      [meta.slug, meta.title, meta.excerpt, body, meta.category ?? null, related, meta.seo_title ?? meta.title, meta.excerpt]);
    console.info(`${meta.slug}: ${flag("--sync") ? "synced" : res.rowCount ? "created (draft)" : "already exists, left unchanged"}`);
  }
}

try {
  if (flag("--blog")) await loadBlog();
  const code = value("--module");
  if (code || flag("--all")) {
    for (const f of readdirSync("content/modules").filter((x) => x.endsWith(".json")).sort()) {
      const m = JSON.parse(readFileSync(`content/modules/${f}`, "utf8")) as Module;
      if (flag("--all") || m.course === code) await (flag("--sync") ? syncModule(m) : loadModule(m));
    }
  }
} finally { await client.end(); }
