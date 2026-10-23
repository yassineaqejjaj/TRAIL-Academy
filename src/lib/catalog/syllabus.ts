import "server-only";
import { asAnon } from "@/lib/db";
import { dbConfigured } from "@/lib/db/pool";

export interface Syllabus {
  lessons: number; quiz_questions: number; reading_minutes: number; assignment: string | null;
  chapters: { title: string; lessons: { id: string; title: string; kind: "reading" | "exercise" | "video" | "demo"; free_preview: boolean }[] }[];
}
export interface Preview { title: string; body_md: string; chapter: string; kind: string }

/** Public, text-free outline of a published module (chapter and lesson titles). Null when unavailable. */
export async function getSyllabus(slug: string): Promise<Syllabus | null> {
  if (!dbConfigured()) return null;
  try { return (await asAnon((q) => q.one<{ s: Syllabus | null }>("select public_syllabus($1) as s", [slug])))?.s ?? null; } catch { return null; }
}

/** The free preview lesson of a module, open to visitors without an account. */
export async function getPreview(slug: string): Promise<Preview | null> {
  if (!dbConfigured()) return null;
  try { return (await asAnon((q) => q.one<{ p: Preview | null }>("select public_preview_lesson($1) as p", [slug])))?.p ?? null; } catch { return null; }
}
