"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { bookmarkSchema, noteSchema, quizAnswersSchema } from "@/lib/learning/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { objectInfo, presignUpload, storageConfigured, deleteObject } from "@/lib/storage";
import { isOwnSubmissionKey, MAX_UPLOAD_BYTES, submissionKey, validateUpload } from "@/lib/uploads";

export interface ActionState { error?: string; ok?: boolean; message?: string }
export interface QuizResult {
  score: number; passed: boolean; needs_review: boolean;
  results: { question_id: string; correct: boolean | null; feedback: string | null }[];
  completion: { completed: boolean; percent: number; attestation_code: string | null };
}
export interface QuizState { error?: string; result?: QuizResult }

const uuid = z.string().uuid();

export async function addNote(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const p = noteSchema.safeParse(input);
  if (!p.success) return { error: "Note invalide." };
  try {
    await asUser(user.id, (q) => q("insert into lesson_notes (user_id, lesson_id, body, position_seconds) values ($1, $2, $3, $4)", [user.id, p.data.lessonId, p.data.body, p.data.position ?? null]));
    return { ok: true };
  } catch { return { error: "Impossible d'enregistrer la note." }; }
}

export async function deleteNote(id: string): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(id).success) return { error: "Invalide." };
  await asUser(user.id, (q) => q("delete from lesson_notes where id = $1 and user_id = $2", [id, user.id]));
  return { ok: true };
}

export async function addBookmark(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const p = bookmarkSchema.safeParse(input);
  if (!p.success) return { error: "Signet invalide." };
  try {
    await asUser(user.id, (q) => q(
      "insert into lesson_bookmarks (user_id, lesson_id, position_seconds, label) values ($1, $2, $3, $4) on conflict (user_id, lesson_id, position_seconds) do update set label = excluded.label",
      [user.id, p.data.lessonId, p.data.position, p.data.label ?? null]));
    return { ok: true };
  } catch { return { error: "Impossible d'ajouter le signet." }; }
}

export async function deleteBookmark(id: string): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(id).success) return { error: "Invalide." };
  await asUser(user.id, (q) => q("delete from lesson_bookmarks where id = $1 and user_id = $2", [id, user.id]));
  return { ok: true };
}

export async function submitQuiz(quizId: string, slug: string, answers: unknown): Promise<QuizState> {
  const user = await requireUser();
  const parsed = quizAnswersSchema.safeParse(answers);
  if (!uuid.safeParse(quizId).success || !parsed.success) return { error: "Réponses invalides." };
  try {
    // Grading, attempt limits, entitlement checks and completion all happen in the database function.
    const row = await asUser(user.id, (q) => q.one<{ r: QuizResult }>("select submit_quiz($1, $2::jsonb) as r", [quizId, JSON.stringify(parsed.data)]));
    revalidatePath(`/apprendre/${slug}`);
    revalidatePath("/compte");
    return { result: row!.r };
  } catch (e) {
    const m = (e as Error).message;
    return { error: m.includes("attempt limit") ? "Nombre maximal de tentatives atteint." : m.includes("access denied") ? "Accès refusé." : "Soumission impossible." };
  }
}

/** Step 1 of a submission: validates the file and returns a short-lived, size-limited upload form for the bucket. */
export async function requestSubmissionUpload(input: { assignmentId: string; fileName: string; size: number; type: string }): Promise<{ error: string } | { key: string; post: { url: string; fields: Record<string, string> } }> {
  const user = await requireUser();
  const assignmentId = uuid.safeParse(input.assignmentId);
  if (!assignmentId.success) return { error: "Formulaire invalide." };
  if (!storageConfigured()) return { error: "Le stockage de fichiers n'est pas configuré." };
  if (!(await rateLimit(`upload:${user.id}`, 20, 10 * 60_000))) return { error: "Trop de tentatives. Réessayez plus tard." };
  const check = validateUpload({ name: String(input.fileName), size: Number(input.size), type: String(input.type) });
  if (!check.ok) return { error: check.reason };
  // RLS only returns the assignment when the user holds an active entitlement for its course.
  const allowed = await asUser(user.id, (q) => q.one("select 1 as ok from assignments where id = $1", [assignmentId.data]));
  if (!allowed) return { error: "Accès refusé." };
  const key = submissionKey(user.id, assignmentId.data, input.fileName, randomUUID());
  return { key, post: await presignUpload({ key, contentType: input.type, maxBytes: MAX_UPLOAD_BYTES }) };
}

/** Step 2: records the submission after confirming the uploaded object really exists within limits. */
export async function submitAssignment(slug: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const assignmentId = uuid.safeParse(form.get("assignmentId"));
  const body = z.string().trim().max(10000).optional().safeParse(form.get("body") || undefined);
  const key = String(form.get("key") ?? "");
  if (!assignmentId.success || !body.success) return { error: "Formulaire invalide." };
  if (!key && !body.data) return { error: "Ajoutez une réponse écrite ou un fichier." };

  if (key) {
    if (!isOwnSubmissionKey(key, user.id, assignmentId.data)) return { error: "Fichier invalide." };
    const info = await objectInfo(key);
    if (!info || info.size < 1 || info.size > MAX_UPLOAD_BYTES) { await deleteObject(key); return { error: "Le fichier n'a pas pu être vérifié." }; }
  }
  try {
    await asUser(user.id, (q) => q("insert into assignment_submissions (assignment_id, user_id, body, storage_path) values ($1, $2, $3, $4)", [assignmentId.data, user.id, body.data ?? null, key || null]));
  } catch {
    if (key) await deleteObject(key);
    return { error: "Envoi refusé : vérifiez que votre accès est actif." };
  }
  revalidatePath(`/apprendre/${slug}`);
  revalidatePath("/compte");
  return { ok: true, message: "Livrable envoyé. Il sera relu par le formateur." };
}
