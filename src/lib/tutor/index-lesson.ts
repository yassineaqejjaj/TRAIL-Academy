import "server-only";
import { asService } from "@/lib/db";
import { chunkLesson } from "./chunk";

/** Re-cuts one lesson into searchable extracts. Best effort: a failure never blocks saving the lesson. */
export async function reindexLesson(lessonId: string): Promise<void> {
  try {
    await asService(async (q) => {
      const l = await q.one<{ title: string; body_md: string | null }>("select title, body_md from lessons where id = $1", [lessonId]);
      if (!l) return;
      await q("select replace_lesson_chunks($1, $2::jsonb)", [lessonId, JSON.stringify(l.body_md?.trim() ? chunkLesson(l.title, l.body_md) : [])]);
    });
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "tutor_reindex_failed", lessonId, error: e instanceof Error ? e.message : String(e) }));
  }
}
