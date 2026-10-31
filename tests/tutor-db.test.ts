// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { chunkLesson } from "@/lib/tutor/chunk";
import { searchTerms, toTsQuery } from "@/lib/tutor/search";
import { addUsers, createTestDb } from "./helpers/db";

const OWNER = "00000000-0000-0000-0000-0000000000c1";
const OTHER = "00000000-0000-0000-0000-0000000000c2";
let db: PGlite;
let m4: string, m5: string, paid: string, free: string, otherCourse: string;

const as = async <T>(uid: string | null, fn: () => Promise<T>): Promise<T> => {
  await db.exec(uid ? `set role authenticated; select set_config('app.uid','${uid}',false)` : "set role anon");
  try { return await fn(); } finally { await db.exec("reset role; select set_config('app.uid','',false)"); }
};
const one = async <T = Record<string, unknown>>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0];
async function addLesson(courseCode: string, title: string, body: string, preview = false): Promise<string> {
  const c = await one<{ id: string }>("select id from courses where code = $1", [courseCode]);
  const ch = (await one<{ id: string }>("insert into chapters (course_id, title, position) values ($1, 'Chap', (select coalesce(max(position),0)+1 from chapters where course_id = $1)) returning id", [c.id]))!;
  const l = await one<{ id: string }>("insert into lessons (chapter_id, course_id, title, kind, position, content_status, body_md, is_free_preview) values ($1, $2, $3, 'reading', (select coalesce(max(position),0)+1 from lessons where chapter_id = $1), 'published', $4, $5) returning id", [ch.id, c.id, title, body, preview]);
  await db.query("select replace_lesson_chunks($1, $2::jsonb)", [l.id, JSON.stringify(chunkLesson(title, body))]);
  return l.id;
}
const search = (uid: string | null, question: string, course: string | null = null, lesson: string | null = null) =>
  as(uid, async () => (await db.query<{ lesson_id: string; heading: string }>("select lesson_id, heading from search_content_chunks($1, $2, $3, 8)", [toTsQuery(searchTerms(question)), course, lesson])).rows);

beforeAll(async () => {
  db = await createTestDb();
  await addUsers(db, [[OWNER, "o@t.local"], [OTHER, "x@t.local"]]);
  m4 = (await one<{ id: string }>("select id from courses where code = 'M4'")).id;
  m5 = (await one<{ id: string }>("select id from courses where code = 'M5'")).id;
  otherCourse = m5;
  paid = await addLesson("M4", "Les frameworks de prompt", "## Le framework CARE\n\nCARE signifie contexte, action, résultat, exemple. Il structure un prompt en quatre lignes simples et réutilisables par une équipe entière.\n\n## Pièges\n\nOublier le format de sortie attendu est le piège le plus fréquent avec un prompt.");
  free = await addLesson("M4", "Qu'est-ce qu'un prompt ?", "## Définition\n\nUn prompt est l'instruction écrite que vous donnez à un assistant IA pour obtenir une réponse utile et vérifiable.", true);
  await addLesson("M5", "La fenêtre de contexte", "## La fenêtre de contexte\n\nLa fenêtre de contexte est la quantité de texte que le modèle peut lire en une seule fois pendant une conversation.");
  await db.query("insert into entitlements (user_id, course_id, expires_at) values ($1, $2, now() + interval '30 days')", [OWNER, m4]);
});

describe("tutor retrieval and access", () => {
  it("returns extracts of a lesson the person owns, ranked, with accents and plural forms handled", async () => {
    const rows = await search(OWNER, "Comment fonctionne le framework CARE pour structurer des prompts ?");
    expect(rows[0]).toMatchObject({ lesson_id: paid, heading: "Le framework CARE" });
    expect((await search(OWNER, "resultat exemple contexte action")).length).toBeGreaterThan(0);
  });
  it("never returns paid extracts to a person without access, nor to a visitor", async () => {
    expect(await search(OTHER, "framework CARE contexte action")).toEqual([]);
    expect(await search(OTHER, "piège format de sortie")).toEqual([]);
    await expect(search(null, "framework CARE")).rejects.toThrow();
  });
  it("lets everyone signed in find free-preview extracts", async () => {
    const rows = await search(OTHER, "définition d'un prompt instruction assistant");
    expect(rows.map((r) => r.lesson_id)).toEqual([free]);
  });
  it("only reaches courses the person owns even when a course filter names another", async () => {
    expect(await search(OWNER, "fenêtre de contexte lire texte", m5)).toEqual([]);
  });
  it("favours the current lesson when given", async () => {
    const rows = await search(OWNER, "prompt", null, free);
    expect(rows[0].lesson_id).toBe(free);
  });
  it("cannot read or write extracts directly", async () => {
    await expect(as(OWNER, () => db.query("select replace_lesson_chunks($1, '[]'::jsonb)", [paid]))).rejects.toThrow();
    expect((await as(OTHER, async () => (await db.query("select 1 from content_chunks")).rows)).length).toBe(1); // only the free preview
  });
  it("replaces a lesson's extracts when it is re-indexed (and removes them for an empty lesson)", async () => {
    await db.query("select replace_lesson_chunks($1, $2::jsonb)", [paid, JSON.stringify(chunkLesson("Les frameworks de prompt", "## Nouveau\n\nContenu totalement différent à propos des grilles de relecture et des critères de réussite du livrable."))]);
    expect((await search(OWNER, "signifie quatre lignes simples")).length).toBe(0);
    expect((await search(OWNER, "grilles de relecture critères")).length).toBe(1);
    await db.query("select replace_lesson_chunks($1, '[]'::jsonb)", [paid]);
    expect(Number((await one<{ n: number }>("select count(*)::int n from content_chunks where lesson_id = $1", [paid])).n)).toBe(0);
  });
});

describe("retrieval quality on the real course text", () => {
  it("finds a section from a question made of the first words of its text, in the top 3 (measured over a sample of all modules)", async () => {
    const db2 = await createTestDb();
    await db2.exec("insert into auth.users (id, email, name, email_verified) values ('00000000-0000-0000-0000-0000000000d1', 'q@t.local', 'q', true)");
    const sections: { lessonId: string; heading: string; course: string; question: string }[] = [];
    const courseRows = (await db2.query<{ id: string; code: string }>("select id, code from courses")).rows;
    let pos = 0;
    for (const f of readdirSync("content/modules").filter((x) => x.endsWith(".json")).sort()) {
      const m = JSON.parse(readFileSync(`content/modules/${f}`, "utf8")) as { course: string; chapters: { title: string; lessons: { title: string; body_md: string }[] }[] };
      const course = courseRows.find((c) => c.code === m.course)!;
      await db2.query("insert into entitlements (user_id, course_id, expires_at) values ('00000000-0000-0000-0000-0000000000d1', $1, now() + interval '30 days')", [course.id]);
      let cp = 0, lp = 0;
      for (const ch of m.chapters) {
        const chap = (await db2.query<{ id: string }>("insert into chapters (course_id, title, position) values ($1, $2, $3) returning id", [course.id, ch.title, ++cp])).rows[0];
        for (const l of ch.lessons) {
          const les = (await db2.query<{ id: string }>("insert into lessons (chapter_id, course_id, title, kind, position, content_status, body_md) values ($1, $2, $3, 'reading', $4, 'published', $5) returning id", [chap.id, course.id, l.title, ++lp, l.body_md])).rows[0];
          const cs = chunkLesson(l.title, l.body_md);
          await db2.query("select replace_lesson_chunks($1, $2::jsonb)", [les.id, JSON.stringify(cs)]);
          for (const c of cs) if (c.heading !== l.title && ++pos % 9 === 0) sections.push({ lessonId: les.id, heading: c.heading, course: m.course, question: c.body.split(/\s+/).slice(0, 16).join(" ") });
        }
      }
    }
    let hit = 0;
    await db2.exec("set role authenticated; select set_config('app.uid','00000000-0000-0000-0000-0000000000d1',false)");
    for (const s of sections) {
      const q = toTsQuery(searchTerms(s.question));
      if (!q) continue;
      const rows = (await db2.query<{ lesson_id: string; heading: string }>("select lesson_id, heading from search_content_chunks($1, null, null, 3)", [q])).rows;
      if (rows.some((r) => r.lesson_id === s.lessonId && r.heading === s.heading)) hit++;
    }
    const rate = hit / sections.length;
    console.info(`tutor retrieval: ${hit}/${sections.length} sections found in the top 3 (${Math.round(rate * 100)} %)`);
    expect(sections.length).toBeGreaterThan(200);
    expect(rate).toBeGreaterThan(0.6);
  }, 120_000);
});
