"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { flash, formData, revalidatePublic, UserFacingError, withAdmin } from "@/lib/admin/ctx";
import { assignmentSchema, courseDetailsSchema, courseSchema, lessonSchema, optionSchema, parseChapterLines, questionSchema, quizSchema } from "@/lib/admin/schemas";
import { asUser, type Q } from "@/lib/db";
import { deleteObject, objectInfo, presignUpload, storageConfigured } from "@/lib/storage";
import { isResourceKeyFor, resourceKey, subtitleKey, validateResource, validateSubtitle } from "@/lib/uploads";

const uuid = z.string().uuid();
const issue = (e: z.ZodError) => e.issues[0]?.message ?? "Formulaire invalide.";
const base = (id: string) => `/admin/cours/${id}`;

// ───────── Course ─────────
export async function createCourse(fd: FormData) {
  const admin = await requireAdmin();
  const p = courseSchema.safeParse(formData(fd));
  if (!p.success) flash("/admin/cours", "error", issue(p.error));
  const v = p.data!;
  const row = await withAdmin(admin, "/admin/cours", (q) => q.one<{ id: string }>(
    `insert into courses (code, slug, title, summary, phase_id, position, difficulty, duration_hours, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'coming_soon') returning id`,
    [v.code, v.slug, v.title, v.summary, v.phaseId, v.position, v.difficulty, v.durationHours]));
  revalidatePublic();
  flash(base(row!.id), "ok", "Module créé (statut : bientôt disponible).");
}

export async function updateCourse(id: string, fd: FormData) {
  const admin = await requireAdmin();
  const p = courseDetailsSchema.safeParse(formData(fd));
  if (!p.success) flash(base(id), "error", issue(p.error));
  const v = p.data!;
  await withAdmin(admin, base(id), (q) => q(
    `update courses set slug = $2, title = $3, summary = $4, phase_id = $5, difficulty = $6, duration_hours = $7, topics = $8, tools = $9, outcomes = $10,
       deliverable = $11, seo_title = $12, seo_description = $13, completion_rules = $14::jsonb where id = $1`,
    [id, v.slug, v.title, v.summary, v.phaseId, v.difficulty, v.durationHours, v.topics, v.tools, v.outcomes, v.deliverable ?? null, v.seoTitle ?? null, v.seoDescription ?? null,
      JSON.stringify({ requireAllLessons: v.requireAllLessons, requireQuizzes: v.requireQuizzes, requireAssignments: v.requireAssignments })]));
  revalidatePublic();
  flash(base(id), "ok", "Module mis à jour.");
}

export async function addPrerequisite(id: string, fd: FormData) {
  const admin = await requireAdmin();
  const pre = uuid.safeParse(fd.get("prerequisiteId"));
  if (!pre.success) flash(base(id), "error", "Choisissez un module.");
  await withAdmin(admin, base(id), (q) => q("insert into course_prerequisites (course_id, prerequisite_id) values ($1, $2)", [id, pre.data]));
  revalidatePublic();
  flash(base(id), "ok", "Prérequis ajouté.");
}

export async function removePrerequisite(id: string, fd: FormData) {
  const admin = await requireAdmin();
  const pre = uuid.safeParse(fd.get("prerequisiteId"));
  if (!pre.success) flash(base(id), "error", "Invalide.");
  await withAdmin(admin, base(id), (q) => q("delete from course_prerequisites where course_id = $1 and prerequisite_id = $2", [id, pre.data]));
  revalidatePublic();
  flash(base(id), "ok", "Prérequis retiré.");
}

const READINESS: Record<string, string> = {
  no_published_lessons: "Aucune leçon publiée.", lesson_without_content: "Leçon publiée sans vidéo ni texte", no_outcomes: "Aucun objectif d'apprentissage défini.",
  quiz_without_questions: "Quiz sans question", question_without_correct_option: "Question sans bonne réponse",
};

export async function publishCourse(id: string) {
  const admin = await requireAdmin();
  try {
    await asUser(admin.id, (q) => q("select publish_course($1)", [id]));
  } catch (e) {
    const message = (e as Error).message;
    const list = [...message.matchAll(/"code": ?"(\w+)"(?:, ?"detail": ?"([^"]*)")?/g)].map((m) => `${READINESS[m[1]] ?? m[1]}${m[2] ? ` : ${m[2]}` : ""}`);
    flash(base(id), "error", list.length ? `Publication impossible — ${list.join(" ; ")}` : "La publication a échoué.");
  }
  revalidatePublic();
  flash(base(id), "ok", "Module publié. Activez ensuite l'offre dans « Produits et prix » pour ouvrir l'achat.");
}

export async function unpublishCourse(id: string) {
  const admin = await requireAdmin();
  await withAdmin(admin, base(id), (q) => q("select unpublish_course($1)", [id]));
  revalidatePublic();
  flash(base(id), "ok", "Module dépublié ; les offres qui le contiennent sont fermées. Les apprenants existants gardent leur accès.");
}

// ───────── Chapters & lessons ─────────
const contentPath = (courseId: string) => `${base(courseId)}/contenu`;

export async function addChapter(courseId: string, fd: FormData) {
  const admin = await requireAdmin();
  const title = z.string().trim().min(2).max(160).safeParse(fd.get("title"));
  if (!title.success) flash(contentPath(courseId), "error", "Titre invalide.");
  await withAdmin(admin, contentPath(courseId), (q) => q(
    "insert into chapters (course_id, title, position) values ($1, $2, (select coalesce(max(position), 0) + 1 from chapters where course_id = $1))", [courseId, title.data]));
  flash(contentPath(courseId), "ok", "Chapitre ajouté.");
}

export async function renameChapter(courseId: string, chapterId: string, fd: FormData) {
  const admin = await requireAdmin();
  const title = z.string().trim().min(2).max(160).safeParse(fd.get("title"));
  if (!title.success) flash(contentPath(courseId), "error", "Titre invalide.");
  await withAdmin(admin, contentPath(courseId), (q) => q("update chapters set title = $2 where id = $1", [chapterId, title.data]));
  flash(contentPath(courseId), "ok", "Chapitre renommé.");
}

async function hasLearnerProgress(q: Q, lessonIds: string[]): Promise<boolean> {
  if (!lessonIds.length) return false;
  const row = await q.one<{ n: number }>("select count(*) as n from lesson_progress where lesson_id = any($1::uuid[])", [lessonIds]);
  return (row?.n ?? 0) > 0;
}

export async function deleteChapter(courseId: string, chapterId: string) {
  const admin = await requireAdmin();
  await withAdmin(admin, contentPath(courseId), async (q) => {
    const lessons = await q<{ id: string }>("select id from lessons where chapter_id = $1", [chapterId]);
    if (await hasLearnerProgress(q, lessons.map((l) => l.id))) throw new UserFacingError("Des apprenants ont déjà progressé dans ce chapitre : repassez ses leçons en brouillon plutôt que de les supprimer.");
    await q("delete from chapters where id = $1", [chapterId]);
  });
  flash(contentPath(courseId), "ok", "Chapitre supprimé.");
}

function move(ids: string[], id: string, dir: "up" | "down"): string[] | null {
  const i = ids.indexOf(id), j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const out = [...ids];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export async function moveChapter(courseId: string, chapterId: string, dir: "up" | "down") {
  const admin = await requireAdmin();
  await withAdmin(admin, contentPath(courseId), async (q) => {
    const ids = (await q<{ id: string }>("select id from chapters where course_id = $1 order by position", [courseId])).map((r) => r.id);
    const next = move(ids, chapterId, dir);
    if (next) await q("select reorder_chapters($1, $2::uuid[])", [courseId, next]);
  });
  flash(contentPath(courseId), "ok", "Ordre mis à jour.");
}

export async function moveLesson(courseId: string, chapterId: string, lessonId: string, dir: "up" | "down") {
  const admin = await requireAdmin();
  await withAdmin(admin, contentPath(courseId), async (q) => {
    const ids = (await q<{ id: string }>("select id from lessons where chapter_id = $1 order by position", [chapterId])).map((r) => r.id);
    const next = move(ids, lessonId, dir);
    if (next) await q("select reorder_lessons($1, $2::uuid[])", [chapterId, next]);
  });
  flash(contentPath(courseId), "ok", "Ordre mis à jour.");
}

function lessonRow(v: z.infer<typeof lessonSchema>) {
  const markers = parseChapterLines(v.chapters);
  return {
    error: markers === null ? "Chapitres vidéo : une ligne par chapitre au format « 2:30 Titre »." : null,
    values: [v.title, v.kind, v.required, v.isFreePreview, v.contentStatus, v.videoProvider ?? null, v.videoAssetId ?? null, v.durationSeconds ?? null, v.bodyMd ?? null, v.transcript ?? null, JSON.stringify(markers ?? [])] as unknown[],
  };
}
const LESSON_COLS = "title, kind, required, is_free_preview, content_status, video_provider, video_asset_id, duration_seconds, body_md, transcript, video_chapters";

export async function addLesson(courseId: string, chapterId: string, fd: FormData) {
  const admin = await requireAdmin();
  const p = lessonSchema.safeParse(formData(fd));
  if (!p.success) flash(contentPath(courseId), "error", issue(p.error));
  const { values, error } = lessonRow(p.data!);
  if (error) flash(contentPath(courseId), "error", error);
  const row = await withAdmin(admin, contentPath(courseId), (q) => q.one<{ id: string }>(
    `insert into lessons (${LESSON_COLS}, course_id, chapter_id, position)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, (select coalesce(max(position), 0) + 1 from lessons where chapter_id = $13)) returning id`,
    [...values, courseId, chapterId]));
  flash(`${base(courseId)}/lecons/${row!.id}`, "ok", "Leçon créée.");
}

export async function updateLesson(courseId: string, lessonId: string, fd: FormData) {
  const path = `${base(courseId)}/lecons/${lessonId}`;
  const admin = await requireAdmin();
  const p = lessonSchema.safeParse(formData(fd));
  if (!p.success) flash(path, "error", issue(p.error));
  const { values, error } = lessonRow(p.data!);
  if (error) flash(path, "error", error);
  await withAdmin(admin, path, (q) => q(
    `update lessons set title = $1, kind = $2, required = $3, is_free_preview = $4, content_status = $5, video_provider = $6, video_asset_id = $7,
       duration_seconds = $8, body_md = $9, transcript = $10, video_chapters = $11::jsonb where id = $12`, [...values, lessonId]));
  flash(path, "ok", "Leçon enregistrée.");
}

export async function deleteLesson(courseId: string, lessonId: string) {
  const admin = await requireAdmin();
  await withAdmin(admin, contentPath(courseId), async (q) => {
    if (await hasLearnerProgress(q, [lessonId])) throw new UserFacingError("Des apprenants ont déjà progressé dans cette leçon : repassez-la en brouillon plutôt que de la supprimer.");
    await q("delete from lessons where id = $1", [lessonId]);
  });
  flash(contentPath(courseId), "ok", "Leçon supprimée.");
}

// ───────── Resources and subtitles: direct upload to the bucket ─────────
type UploadSlot = { error: string } | { key: string; post: { url: string; fields: Record<string, string> } };

/** Step 1: validates the file and returns a short-lived upload form limited to its size and type. */
export async function requestLessonUpload(input: { lessonId: string; kind: "resource" | "subtitle"; lang?: string; fileName: string; size: number; type: string }): Promise<UploadSlot> {
  await requireAdmin();
  const lessonId = uuid.safeParse(input.lessonId);
  if (!lessonId.success) return { error: "Leçon invalide." };
  if (!storageConfigured()) return { error: "Le stockage de fichiers n'est pas configuré." };
  const file = { name: String(input.fileName), size: Number(input.size), type: String(input.type) };
  const check = input.kind === "subtitle" ? validateSubtitle(file) : validateResource(file);
  if (!check.ok) return { error: check.reason };
  const unique = randomUUID();
  const key = input.kind === "subtitle" ? subtitleKey(lessonId.data, String(input.lang ?? "fr").replace(/[^a-zA-Z-]/g, ""), unique) : resourceKey(lessonId.data, file.name, unique);
  const contentType = input.kind === "subtitle" ? "text/vtt" : file.type;
  return { key, post: await presignUpload({ key, contentType, maxBytes: input.kind === "subtitle" ? 1024 * 1024 : 50 * 1024 * 1024 }) };
}

/** Step 2: records the uploaded object once it is confirmed to exist. */
export async function registerLessonUpload(input: { lessonId: string; kind: "resource" | "subtitle"; key: string; title?: string; lang?: string; label?: string }): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const lessonId = uuid.safeParse(input.lessonId);
  if (!lessonId.success || !isResourceKeyFor(input.key, lessonId.data)) return { error: "Fichier invalide." };
  const info = await objectInfo(input.key);
  if (!info || info.size < 1) return { error: "Le fichier n'a pas pu être vérifié." };
  try {
    await asUser(admin.id, async (q) => {
      if (input.kind === "resource") {
        const title = z.string().trim().min(2).max(200).parse(input.title);
        await q("insert into lesson_resources (lesson_id, title, storage_path, mime_type, size_bytes) values ($1, $2, $3, $4, $5)", [lessonId.data, title, input.key, info.contentType ?? "application/octet-stream", info.size]);
      } else {
        const lang = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).parse(input.lang);
        const label = z.string().trim().min(2).max(40).parse(input.label);
        const row = await q.one<{ subtitle_tracks: { lang: string; path: string }[] }>("select subtitle_tracks from lessons where id = $1", [lessonId.data]);
        const kept = (row?.subtitle_tracks ?? []).filter((t) => t.lang !== lang);
        await q("update lessons set subtitle_tracks = $2::jsonb where id = $1", [lessonId.data, JSON.stringify([...kept, { lang, label, path: input.key }])]);
      }
    });
  } catch {
    await deleteObject(input.key);
    return { error: "Enregistrement refusé." };
  }
  return { ok: true };
}

export async function deleteResource(courseId: string, lessonId: string, fd: FormData) {
  const path = `${base(courseId)}/lecons/${lessonId}`;
  const admin = await requireAdmin();
  const id = uuid.safeParse(fd.get("resourceId"));
  if (!id.success) flash(path, "error", "Invalide.");
  const key = await withAdmin(admin, path, async (q) => {
    const row = await q.one<{ storage_path: string }>("delete from lesson_resources where id = $1 returning storage_path", [id.data]);
    return row?.storage_path ?? null;
  });
  if (key) await deleteObject(key);
  flash(path, "ok", "Ressource supprimée.");
}

// ───────── Quizzes & assignments ─────────
const evalPath = (id: string) => `${base(id)}/evaluations`;

export async function createQuiz(courseId: string, fd: FormData) {
  const admin = await requireAdmin();
  const p = quizSchema.safeParse(formData(fd));
  if (!p.success) flash(evalPath(courseId), "error", issue(p.error));
  await withAdmin(admin, evalPath(courseId), (q) => q("insert into quizzes (course_id, title, pass_percent, max_attempts) values ($1, $2, $3, $4)", [courseId, p.data!.title, p.data!.passPercent, p.data!.maxAttempts ?? null]));
  flash(evalPath(courseId), "ok", "Quiz créé.");
}

export async function updateQuiz(courseId: string, quizId: string, fd: FormData) {
  const admin = await requireAdmin();
  const p = quizSchema.safeParse(formData(fd));
  if (!p.success) flash(evalPath(courseId), "error", issue(p.error));
  await withAdmin(admin, evalPath(courseId), (q) => q("update quizzes set title = $2, pass_percent = $3, max_attempts = $4 where id = $1", [quizId, p.data!.title, p.data!.passPercent, p.data!.maxAttempts ?? null]));
  flash(evalPath(courseId), "ok", "Quiz mis à jour.");
}

export async function deleteQuiz(courseId: string, quizId: string) {
  const admin = await requireAdmin();
  await withAdmin(admin, evalPath(courseId), async (q) => {
    const row = await q.one<{ n: number }>("select count(*) as n from quiz_attempts where quiz_id = $1", [quizId]);
    if ((row?.n ?? 0) > 0) throw new UserFacingError("Des tentatives existent : le quiz ne peut pas être supprimé (l'historique des apprenants est conservé).");
    await q("delete from quizzes where id = $1", [quizId]);
  });
  flash(evalPath(courseId), "ok", "Quiz supprimé.");
}

export async function addQuestion(courseId: string, quizId: string, fd: FormData) {
  const admin = await requireAdmin();
  const p = questionSchema.safeParse(formData(fd));
  if (!p.success) flash(evalPath(courseId), "error", issue(p.error));
  await withAdmin(admin, evalPath(courseId), (q) => q(
    "insert into quiz_questions (quiz_id, kind, prompt, feedback, points, position) values ($1, $2, $3, $4, $5, (select coalesce(max(position), 0) + 1 from quiz_questions where quiz_id = $1))",
    [quizId, p.data!.kind, p.data!.prompt, p.data!.feedback ?? null, p.data!.points]));
  flash(evalPath(courseId), "ok", "Question ajoutée.");
}

export async function deleteQuestion(courseId: string, questionId: string) {
  const admin = await requireAdmin();
  await withAdmin(admin, evalPath(courseId), (q) => q("delete from quiz_questions where id = $1", [questionId]));
  flash(evalPath(courseId), "ok", "Question supprimée.");
}

export async function addOption(courseId: string, questionId: string, fd: FormData) {
  const admin = await requireAdmin();
  const p = optionSchema.safeParse(formData(fd));
  if (!p.success) flash(evalPath(courseId), "error", issue(p.error));
  await withAdmin(admin, evalPath(courseId), (q) => q(
    "insert into quiz_options (question_id, label, is_correct, position) values ($1, $2, $3, (select coalesce(max(position), 0) + 1 from quiz_options where question_id = $1))",
    [questionId, p.data!.label, p.data!.isCorrect]));
  flash(evalPath(courseId), "ok", "Option ajoutée.");
}

export async function deleteOption(courseId: string, optionId: string) {
  const admin = await requireAdmin();
  await withAdmin(admin, evalPath(courseId), (q) => q("delete from quiz_options where id = $1", [optionId]));
  flash(evalPath(courseId), "ok", "Option supprimée.");
}

export async function createAssignment(courseId: string, fd: FormData) {
  const admin = await requireAdmin();
  const p = assignmentSchema.safeParse(formData(fd));
  if (!p.success) flash(evalPath(courseId), "error", issue(p.error));
  await withAdmin(admin, evalPath(courseId), (q) => q("insert into assignments (course_id, title, instructions_md, required) values ($1, $2, $3, $4)", [courseId, p.data!.title, p.data!.instructionsMd, p.data!.required]));
  flash(evalPath(courseId), "ok", "Devoir créé.");
}

export async function deleteAssignment(courseId: string, assignmentId: string) {
  const admin = await requireAdmin();
  await withAdmin(admin, evalPath(courseId), async (q) => {
    const row = await q.one<{ n: number }>("select count(*) as n from assignment_submissions where assignment_id = $1", [assignmentId]);
    if ((row?.n ?? 0) > 0) throw new UserFacingError("Des livrables ont été soumis : le devoir ne peut pas être supprimé.");
    await q("delete from assignments where id = $1", [assignmentId]);
  });
  flash(evalPath(courseId), "ok", "Devoir supprimé.");
}
