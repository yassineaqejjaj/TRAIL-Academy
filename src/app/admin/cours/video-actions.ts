"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { deleteObject, objectInfo, presignUpload, storageConfigured } from "@/lib/storage";
import { isVideoSourceKeyFor, validateVideoSource, videoSourceKey } from "@/lib/uploads";

const uuid = z.string().uuid();
type Slot = { error: string } | { key: string; post: { url: string; fields: Record<string, string> } };

/** Step 1: validates the file name and size and returns a short-lived upload form for the private bucket (video-src/<lesson>/). */
export async function requestVideoUpload(input: { lessonId: string; fileName: string; size: number }): Promise<Slot> {
  await requireAdmin();
  const lessonId = uuid.safeParse(input.lessonId);
  if (!lessonId.success) return { error: "Leçon invalide." };
  if (!storageConfigured()) return { error: "Le stockage de fichiers n'est pas configuré." };
  const check = validateVideoSource({ name: String(input.fileName), size: Number(input.size) });
  if (!check.ok) return { error: check.reason };
  const key = videoSourceKey(lessonId.data, randomUUID(), check.extension);
  return { key, post: await presignUpload({ key, contentType: check.contentType, maxBytes: 4 * 1024 * 1024 * 1024, ttlSeconds: 3 * 60 * 60 }) };
}

/** Step 2: checks that the object exists, then queues it for encoding. */
export async function registerVideo(input: { lessonId: string; courseId: string; key: string }): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const lessonId = uuid.safeParse(input.lessonId);
  const courseId = uuid.safeParse(input.courseId);
  if (!lessonId.success || !courseId.success || !isVideoSourceKeyFor(input.key, lessonId.data)) return { error: "Fichier invalide." };
  const info = await objectInfo(input.key);
  if (!info || info.size < 1) return { error: "La vidéo n'a pas pu être vérifiée dans le stockage." };
  try {
    await asUser(admin.id, (q) => q("select admin_register_video($1, $2)", [lessonId.data, input.key]));
  } catch {
    await deleteObject(input.key);
    return { error: "Enregistrement refusé." };
  }
  revalidatePath(`/admin/cours/${courseId.data}/lecons/${lessonId.data}`);
  return { ok: true };
}

export async function retryVideo(courseId: string, lessonId: string, fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = uuid.safeParse(fd.get("assetId"));
  if (id.success) await asUser(admin.id, (q) => q("select admin_retry_video($1)", [id.data])).catch(() => undefined);
  revalidatePath(`/admin/cours/${courseId}/lecons/${lessonId}`);
}
