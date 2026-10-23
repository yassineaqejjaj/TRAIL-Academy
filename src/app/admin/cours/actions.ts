"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminDb, dbMessage, flash, formData, revalidatePublic } from "@/lib/admin/ctx";
import { assignmentSchema, courseDetailsSchema, courseSchema, lessonSchema, optionSchema, parseChapterLines, questionSchema, quizSchema } from "@/lib/admin/schemas";
import { safeFileName, validateResource, validateSubtitle } from "@/lib/uploads";

const uuid = z.string().uuid();
const issue = (e: z.ZodError) => e.issues[0]?.message ?? "Formulaire invalide.";
const base = (id: string) => `/admin/cours/${id}`;

// ───────── Course ─────────
export async function createCourse(fd: FormData) {
  const { db } = await adminDb();
  const p = courseSchema.safeParse(formData(fd));
  if (!p.success) flash("/admin/cours", "error", issue(p.error));
  const v = p.data!;
  const { data, error } = await db.from("courses").insert({ code: v.code, slug: v.slug, title: v.title, summary: v.summary, phase_id: v.phaseId, position: v.position, difficulty: v.difficulty, duration_hours: v.durationHours, status: "coming_soon" }).select("id").single();
  if (error || !data) flash("/admin/cours", "error", dbMessage(error));
  revalidatePublic();
  flash(base(data!.id), "ok", "Module créé (statut : bientôt disponible).");
}

export async function updateCourse(id: string, fd: FormData) {
  const { db } = await adminDb();
  const p = courseDetailsSchema.safeParse(formData(fd));
  if (!p.success) flash(base(id), "error", issue(p.error));
  const v = p.data!;
  const { error } = await db.from("courses").update({
    slug: v.slug, title: v.title, summary: v.summary, phase_id: v.phaseId, difficulty: v.difficulty, duration_hours: v.durationHours,
    topics: v.topics, tools: v.tools, outcomes: v.outcomes, deliverable: v.deliverable ?? null, seo_title: v.seoTitle ?? null, seo_description: v.seoDescription ?? null,
    completion_rules: { requireAllLessons: v.requireAllLessons, requireQuizzes: v.requireQuizzes, requireAssignments: v.requireAssignments },
  }).eq("id", id);
  if (error) flash(base(id), "error", dbMessage(error));
  revalidatePublic();
  flash(base(id), "ok", "Module mis à jour.");
}

export async function addPrerequisite(id: string, fd: FormData) {
  const { db } = await adminDb();
  const pre = uuid.safeParse(fd.get("prerequisiteId"));
  if (!pre.success) flash(base(id), "error", "Choisissez un module.");
  const { error } = await db.from("course_prerequisites").insert({ course_id: id, prerequisite_id: pre.data! });
  if (error) flash(base(id), "error", dbMessage(error));
  revalidatePublic();
  flash(base(id), "ok", "Prérequis ajouté.");
}

export async function removePrerequisite(id: string, fd: FormData) {
  const { db } = await adminDb();
  const pre = uuid.safeParse(fd.get("prerequisiteId"));
  if (!pre.success) flash(base(id), "error", "Invalide.");
  await db.from("course_prerequisites").delete().eq("course_id", id).eq("prerequisite_id", pre.data!);
  revalidatePublic();
  flash(base(id), "ok", "Prérequis retiré.");
}

const READINESS: Record<string, string> = {
  no_published_lessons: "Aucune leçon publiée.", lesson_without_content: "Leçon publiée sans vidéo ni texte", no_outcomes: "Aucun objectif d'apprentissage défini.",
  quiz_without_questions: "Quiz sans question", question_without_correct_option: "Question sans bonne réponse",
};
export async function publishCourse(id: string) {
  const { db } = await adminDb();
  const { error } = await db.rpc("publish_course", { p_course: id });
  if (error) {
    const list = [...error.message.matchAll(/"code": ?"(\w+)"(?:, ?"detail": ?"([^"]*)")?/g)].map((m) => `${READINESS[m[1]] ?? m[1]}${m[2] ? ` : ${m[2]}` : ""}`);
    flash(base(id), "error", list.length ? `Publication impossible — ${list.join(" ; ")}` : dbMessage(error));
  }
  revalidatePublic();
  flash(base(id), "ok", "Module publié. Activez ensuite l'offre dans « Produits et prix » pour ouvrir l'achat.");
}

export async function unpublishCourse(id: string) {
  const { db } = await adminDb();
  const { error } = await db.rpc("unpublish_course", { p_course: id });
  if (error) flash(base(id), "error", dbMessage(error));
  revalidatePublic();
  flash(base(id), "ok", "Module dépublié ; les offres qui le contiennent sont fermées. Les apprenants existants gardent leur accès.");
}

// ───────── Chapters & lessons ─────────
export async function addChapter(courseId: string, fd: FormData) {
  const { db } = await adminDb();
  const title = z.string().trim().min(2).max(160).safeParse(fd.get("title"));
  const path = `${base(courseId)}/contenu`;
  if (!title.success) flash(path, "error", "Titre invalide.");
  const { data: last } = await db.from("chapters").select("position").eq("course_id", courseId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from("chapters").insert({ course_id: courseId, title: title.data!, position: (last?.position ?? 0) + 1 });
  if (error) flash(path, "error", dbMessage(error));
  flash(path, "ok", "Chapitre ajouté.");
}

export async function renameChapter(courseId: string, chapterId: string, fd: FormData) {
  const { db } = await adminDb();
  const title = z.string().trim().min(2).max(160).safeParse(fd.get("title"));
  const path = `${base(courseId)}/contenu`;
  if (!title.success) flash(path, "error", "Titre invalide.");
  await db.from("chapters").update({ title: title.data! }).eq("id", chapterId);
  flash(path, "ok", "Chapitre renommé.");
}

async function hasLearnerProgress(db: Awaited<ReturnType<typeof adminDb>>["db"], lessonIds: string[]): Promise<boolean> {
  if (!lessonIds.length) return false;
  const { count } = await db.from("lesson_progress").select("lesson_id", { count: "exact", head: true }).in("lesson_id", lessonIds);
  return (count ?? 0) > 0;
}

export async function deleteChapter(courseId: string, chapterId: string) {
  const { db } = await adminDb();
  const path = `${base(courseId)}/contenu`;
  const { data: lessons } = await db.from("lessons").select("id").eq("chapter_id", chapterId);
  if (await hasLearnerProgress(db, (lessons ?? []).map((l) => l.id))) flash(path, "error", "Des apprenants ont déjà progressé dans ce chapitre : repassez ses leçons en brouillon plutôt que de les supprimer.");
  const { error } = await db.from("chapters").delete().eq("id", chapterId);
  if (error) flash(path, "error", dbMessage(error));
  flash(path, "ok", "Chapitre supprimé.");
}

export async function moveChapter(courseId: string, chapterId: string, dir: "up" | "down") {
  const { db } = await adminDb();
  const path = `${base(courseId)}/contenu`;
  const { data } = await db.from("chapters").select("id").eq("course_id", courseId).order("position");
  const ids = (data ?? []).map((c) => c.id);
  const i = ids.indexOf(chapterId), j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) flash(path, "ok", "Déjà à cette position.");
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const { error } = await db.rpc("reorder_chapters", { p_course: courseId, p_ids: ids });
  if (error) flash(path, "error", dbMessage(error));
  flash(path, "ok", "Ordre mis à jour.");
}

export async function moveLesson(courseId: string, chapterId: string, lessonId: string, dir: "up" | "down") {
  const { db } = await adminDb();
  const path = `${base(courseId)}/contenu`;
  const { data } = await db.from("lessons").select("id").eq("chapter_id", chapterId).order("position");
  const ids = (data ?? []).map((l) => l.id);
  const i = ids.indexOf(lessonId), j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) flash(path, "ok", "Déjà à cette position.");
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const { error } = await db.rpc("reorder_lessons", { p_chapter: chapterId, p_ids: ids });
  if (error) flash(path, "error", dbMessage(error));
  flash(path, "ok", "Ordre mis à jour.");
}

function lessonRow(v: z.infer<typeof lessonSchema>) {
  const markers = parseChapterLines(v.chapters);
  return { error: markers === null ? "Chapitres vidéo : une ligne par chapitre au format « 2:30 Titre »." : null, row: {
    title: v.title, kind: v.kind, required: v.required, is_free_preview: v.isFreePreview, content_status: v.contentStatus,
    video_provider: v.videoProvider ?? null, video_asset_id: v.videoAssetId ?? null, duration_seconds: v.durationSeconds ?? null,
    body_md: v.bodyMd ?? null, transcript: v.transcript ?? null, video_chapters: markers ?? [],
  } };
}

export async function addLesson(courseId: string, chapterId: string, fd: FormData) {
  const { db } = await adminDb();
  const path = `${base(courseId)}/contenu`;
  const p = lessonSchema.safeParse(formData(fd));
  if (!p.success) flash(path, "error", issue(p.error));
  const { row, error: e1 } = lessonRow(p.data!);
  if (e1) flash(path, "error", e1);
  const { data: last } = await db.from("lessons").select("position").eq("chapter_id", chapterId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db.from("lessons").insert({ ...row, course_id: courseId, chapter_id: chapterId, position: (last?.position ?? 0) + 1 }).select("id").single();
  if (error || !data) flash(path, "error", dbMessage(error));
  flash(`${base(courseId)}/lecons/${data!.id}`, "ok", "Leçon créée.");
}

export async function updateLesson(courseId: string, lessonId: string, fd: FormData) {
  const { db } = await adminDb();
  const path = `${base(courseId)}/lecons/${lessonId}`;
  const p = lessonSchema.safeParse(formData(fd));
  if (!p.success) flash(path, "error", issue(p.error));
  const { row, error: e1 } = lessonRow(p.data!);
  if (e1) flash(path, "error", e1);
  const { error } = await db.from("lessons").update(row).eq("id", lessonId);
  if (error) flash(path, "error", dbMessage(error));
  flash(path, "ok", "Leçon enregistrée.");
}

export async function deleteLesson(courseId: string, lessonId: string) {
  const { db } = await adminDb();
  const path = `${base(courseId)}/contenu`;
  if (await hasLearnerProgress(db, [lessonId])) flash(path, "error", "Des apprenants ont déjà progressé dans cette leçon : repassez-la en brouillon plutôt que de la supprimer.");
  const { error } = await db.from("lessons").delete().eq("id", lessonId);
  if (error) flash(path, "error", dbMessage(error));
  flash(path, "ok", "Leçon supprimée.");
}

export async function uploadResource(courseId: string, lessonId: string, fd: FormData) {
  const { db } = await adminDb();
  const path = `${base(courseId)}/lecons/${lessonId}`;
  const file = fd.get("file");
  const title = z.string().trim().min(2).max(200).safeParse(fd.get("title"));
  if (!(file instanceof File) || !title.success) flash(path, "error", "Titre et fichier requis.");
  const f = file as File;
  const check = validateResource(f);
  if (!check.ok) flash(path, "error", check.reason);
  const storagePath = `${lessonId}/${randomUUID()}-${safeFileName(f.name)}`;
  const up = await db.storage.from("lesson-resources").upload(storagePath, f, { contentType: f.type, upsert: false });
  if (up.error) flash(path, "error", "Téléversement impossible.");
  const { error } = await db.from("lesson_resources").insert({ lesson_id: lessonId, title: title.data!, storage_path: storagePath, mime_type: f.type, size_bytes: f.size });
  if (error) { await db.storage.from("lesson-resources").remove([storagePath]); flash(path, "error", dbMessage(error)); }
  flash(path, "ok", "Ressource ajoutée.");
}

export async function deleteResource(courseId: string, lessonId: string, fd: FormData) {
  const { db } = await adminDb();
  const path = `${base(courseId)}/lecons/${lessonId}`;
  const id = uuid.safeParse(fd.get("resourceId"));
  if (!id.success) flash(path, "error", "Invalide.");
  const { data } = await db.from("lesson_resources").select("storage_path").eq("id", id.data!).maybeSingle();
  await db.from("lesson_resources").delete().eq("id", id.data!);
  if (data) await db.storage.from("lesson-resources").remove([data.storage_path]);
  flash(path, "ok", "Ressource supprimée.");
}

export async function uploadSubtitle(courseId: string, lessonId: string, fd: FormData) {
  const { db } = await adminDb();
  const path = `${base(courseId)}/lecons/${lessonId}`;
  const file = fd.get("file");
  const lang = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).safeParse(fd.get("lang"));
  const label = z.string().trim().min(2).max(40).safeParse(fd.get("label"));
  if (!(file instanceof File) || !lang.success || !label.success) flash(path, "error", "Langue (ex. fr), libellé et fichier .vtt requis.");
  const f = file as File;
  const check = validateSubtitle(f);
  if (!check.ok) flash(path, "error", check.reason);
  const storagePath = `${lessonId}/subtitles/${lang.data}-${randomUUID()}.vtt`;
  const up = await db.storage.from("lesson-resources").upload(storagePath, f, { contentType: "text/vtt", upsert: false });
  if (up.error) flash(path, "error", "Téléversement impossible.");
  const { data: lesson } = await db.from("lessons").select("subtitle_tracks").eq("id", lessonId).single();
  const tracks = ((lesson?.subtitle_tracks ?? []) as { lang: string }[]).filter((t) => t.lang !== lang.data);
  await db.from("lessons").update({ subtitle_tracks: [...tracks, { lang: lang.data, label: label.data, path: storagePath }] }).eq("id", lessonId);
  flash(path, "ok", "Sous-titres ajoutés.");
}

// ───────── Quizzes & assignments ─────────
const evalPath = (id: string) => `${base(id)}/evaluations`;

export async function createQuiz(courseId: string, fd: FormData) {
  const { db } = await adminDb();
  const p = quizSchema.safeParse(formData(fd));
  if (!p.success) flash(evalPath(courseId), "error", issue(p.error));
  const { error } = await db.from("quizzes").insert({ course_id: courseId, title: p.data!.title, pass_percent: p.data!.passPercent, max_attempts: p.data!.maxAttempts ?? null });
  if (error) flash(evalPath(courseId), "error", dbMessage(error));
  flash(evalPath(courseId), "ok", "Quiz créé.");
}

export async function updateQuiz(courseId: string, quizId: string, fd: FormData) {
  const { db } = await adminDb();
  const p = quizSchema.safeParse(formData(fd));
  if (!p.success) flash(evalPath(courseId), "error", issue(p.error));
  const { error } = await db.from("quizzes").update({ title: p.data!.title, pass_percent: p.data!.passPercent, max_attempts: p.data!.maxAttempts ?? null }).eq("id", quizId);
  if (error) flash(evalPath(courseId), "error", dbMessage(error));
  flash(evalPath(courseId), "ok", "Quiz mis à jour.");
}

export async function deleteQuiz(courseId: string, quizId: string) {
  const { db } = await adminDb();
  const { count } = await db.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
  if ((count ?? 0) > 0) flash(evalPath(courseId), "error", "Des tentatives existent : le quiz ne peut pas être supprimé (l'historique des apprenants est conservé).");
  const { error } = await db.from("quizzes").delete().eq("id", quizId);
  if (error) flash(evalPath(courseId), "error", dbMessage(error));
  flash(evalPath(courseId), "ok", "Quiz supprimé.");
}

export async function addQuestion(courseId: string, quizId: string, fd: FormData) {
  const { db } = await adminDb();
  const p = questionSchema.safeParse(formData(fd));
  if (!p.success) flash(evalPath(courseId), "error", issue(p.error));
  const { data: last } = await db.from("quiz_questions").select("position").eq("quiz_id", quizId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from("quiz_questions").insert({ quiz_id: quizId, kind: p.data!.kind, prompt: p.data!.prompt, feedback: p.data!.feedback ?? null, points: p.data!.points, position: (last?.position ?? 0) + 1 });
  if (error) flash(evalPath(courseId), "error", dbMessage(error));
  flash(evalPath(courseId), "ok", "Question ajoutée.");
}

export async function deleteQuestion(courseId: string, questionId: string) {
  const { db } = await adminDb();
  await db.from("quiz_questions").delete().eq("id", questionId);
  flash(evalPath(courseId), "ok", "Question supprimée.");
}

export async function addOption(courseId: string, questionId: string, fd: FormData) {
  const { db } = await adminDb();
  const p = optionSchema.safeParse(formData(fd));
  if (!p.success) flash(evalPath(courseId), "error", issue(p.error));
  const { data: last } = await db.from("quiz_options").select("position").eq("question_id", questionId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from("quiz_options").insert({ question_id: questionId, label: p.data!.label, is_correct: p.data!.isCorrect, position: (last?.position ?? 0) + 1 });
  if (error) flash(evalPath(courseId), "error", dbMessage(error));
  flash(evalPath(courseId), "ok", "Option ajoutée.");
}

export async function deleteOption(courseId: string, optionId: string) {
  const { db } = await adminDb();
  await db.from("quiz_options").delete().eq("id", optionId);
  flash(evalPath(courseId), "ok", "Option supprimée.");
}

export async function createAssignment(courseId: string, fd: FormData) {
  const { db } = await adminDb();
  const p = assignmentSchema.safeParse(formData(fd));
  if (!p.success) flash(evalPath(courseId), "error", issue(p.error));
  const { error } = await db.from("assignments").insert({ course_id: courseId, title: p.data!.title, instructions_md: p.data!.instructionsMd, required: p.data!.required });
  if (error) flash(evalPath(courseId), "error", dbMessage(error));
  flash(evalPath(courseId), "ok", "Devoir créé.");
}

export async function deleteAssignment(courseId: string, assignmentId: string) {
  const { db } = await adminDb();
  const { count } = await db.from("assignment_submissions").select("id", { count: "exact", head: true }).eq("assignment_id", assignmentId);
  if ((count ?? 0) > 0) flash(evalPath(courseId), "error", "Des livrables ont été soumis : le devoir ne peut pas être supprimé.");
  const { error } = await db.from("assignments").delete().eq("id", assignmentId);
  if (error) flash(evalPath(courseId), "error", dbMessage(error));
  flash(evalPath(courseId), "ok", "Devoir supprimé.");
}
