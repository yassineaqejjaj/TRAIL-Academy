/**
 * Cuts every lesson into searchable extracts for the AI tutor (table content_chunks).
 *   DATABASE_URL=… [DATABASE_SSL=require] npm run tutor:index            all lessons
 *   DATABASE_URL=… npm run tutor:index -- --course M4                    one module
 * Safe to re-run: each lesson's extracts are replaced. Run it after `content:load` and after migration 0014.
 */
import pg from "pg";
import { chunkLesson } from "../src/lib/tutor/chunk";

const args = process.argv.slice(2);
const course = args.includes("--course") ? args[args.indexOf("--course") + 1] : undefined;
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set"); process.exit(1); }
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined });
await client.connect();
await client.query("set search_path = public");
try {
  const { rows } = await client.query<{ id: string; title: string; body_md: string | null; code: string }>(
    "select l.id, l.title, l.body_md, c.code from lessons l join courses c on c.id = l.course_id where ($1::text is null or c.code = $1) order by c.position, l.position", [course ?? null]);
  let lessons = 0, chunks = 0;
  for (const l of rows) {
    const cs = l.body_md?.trim() ? chunkLesson(l.title, l.body_md) : [];
    await client.query("select replace_lesson_chunks($1, $2::jsonb)", [l.id, JSON.stringify(cs)]);
    lessons++; chunks += cs.length;
  }
  console.info(`${lessons} lessons indexed, ${chunks} extracts${course ? ` (${course})` : ""}`);
} finally { await client.end(); }
