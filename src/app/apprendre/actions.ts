"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { bookmarkSchema, noteSchema, quizAnswersSchema } from "@/lib/learning/schemas";
import { createClient } from "@/lib/supabase/server";
import { submissionPath, validateUpload } from "@/lib/uploads";

export interface ActionState { error?: string; ok?: boolean; message?: string }
export interface QuizResult {
  score: number; passed: boolean; needs_review: boolean;
  results: { question_id: string; correct: boolean | null; feedback: string | null }[];
  completion: { completed: boolean; percent: number; attestation_code: string | null };
}
export interface QuizState { error?: string; result?: QuizResult }

export async function addNote(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { error: "Note invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_notes").insert({ user_id: user.id, lesson_id: parsed.data.lessonId, body: parsed.data.body, position_seconds: parsed.data.position ?? null });
  return error ? { error: "Impossible d'enregistrer la note." } : { ok: true };
}

export async function deleteNote(id: string): Promise<ActionState> {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_notes").delete().eq("id", id).eq("user_id", user.id);
  return error ? { error: "Suppression impossible." } : { ok: true };
}

export async function addBookmark(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = bookmarkSchema.safeParse(input);
  if (!parsed.success) return { error: "Signet invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_bookmarks").upsert({ user_id: user.id, lesson_id: parsed.data.lessonId, position_seconds: parsed.data.position, label: parsed.data.label ?? null }, { onConflict: "user_id,lesson_id,position_seconds" });
  return error ? { error: "Impossible d'ajouter le signet." } : { ok: true };
}

export async function deleteBookmark(id: string): Promise<ActionState> {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_bookmarks").delete().eq("id", id).eq("user_id", user.id);
  return error ? { error: "Suppression impossible." } : { ok: true };
}

export async function submitQuiz(quizId: string, slug: string, answers: unknown): Promise<QuizState> {
  await requireUser();
  const parsedAnswers = quizAnswersSchema.safeParse(answers);
  if (!z.string().uuid().safeParse(quizId).success || !parsedAnswers.success) return { error: "Réponses invalides." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quiz", { p_quiz: quizId, p_answers: parsedAnswers.data });
  if (error) return { error: error.message.includes("attempt limit") ? "Nombre maximal de tentatives atteint." : error.message.includes("access denied") ? "Accès refusé." : "Soumission impossible." };
  revalidatePath(`/apprendre/${slug}`);
  revalidatePath("/compte");
  return { result: data as QuizResult };
}

export async function submitAssignment(slug: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const assignmentId = z.string().uuid().safeParse(form.get("assignmentId"));
  const body = z.string().trim().max(10000).optional().safeParse(form.get("body") || undefined);
  if (!assignmentId.success || !body.success) return { error: "Formulaire invalide." };

  const file = form.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile && !body.data) return { error: "Ajoutez une réponse écrite ou un fichier." };

  const supabase = await createClient();
  let storagePath: string | null = null;
  if (hasFile) {
    const check = validateUpload(file);
    if (!check.ok) return { error: check.reason };
    storagePath = submissionPath(user.id, assignmentId.data, file.name, randomUUID());
    const { error } = await supabase.storage.from("submissions").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (error) return { error: "Téléversement impossible." };
  }
  const { error } = await supabase.from("assignment_submissions").insert({ assignment_id: assignmentId.data, user_id: user.id, body: body.data ?? null, storage_path: storagePath });
  if (error) {
    if (storagePath) await supabase.storage.from("submissions").remove([storagePath]);
    return { error: "Envoi refusé : vérifiez que votre accès est actif." };
  }
  revalidatePath(`/apprendre/${slug}`);
  revalidatePath("/compte");
  return { ok: true, message: "Livrable envoyé. Il sera relu par le formateur." };
}
