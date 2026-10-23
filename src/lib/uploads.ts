export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Extension → accepted MIME types. Validate both: a renamed file fails on MIME, a spoofed MIME fails on extension. */
const ALLOWED: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  txt: ["text/plain"],
  md: ["text/markdown", "text/plain"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  zip: ["application/zip", "application/x-zip-compressed"],
};

export type UploadCheck = { ok: true; extension: string } | { ok: false; reason: string };

export function validateUpload(file: { name: string; size: number; type: string }): UploadCheck {
  if (file.size <= 0) return { ok: false, reason: "Le fichier est vide." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "Le fichier dépasse 10 Mo." };
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimes = ALLOWED[extension];
  if (!mimes) return { ok: false, reason: "Type de fichier non autorisé." };
  if (!mimes.includes(file.type)) return { ok: false, reason: "Le type du fichier ne correspond pas à son extension." };
  return { ok: true, extension };
}

export function safeFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "fichier";
  const ext = name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "bin";
  return `${base}.${ext}`;
}

/** Private-bucket path. The first folder is the user id: storage RLS depends on it. */
export function submissionPath(userId: string, assignmentId: string, fileName: string, unique: string): string {
  return `${userId}/${assignmentId}/${unique}-${safeFileName(fileName)}`;
}

/** Instructor-side resource uploads: broader than learner submissions, still allow-listed. */
const RESOURCE_TYPES: Record<string, string[]> = { ...ALLOWED, pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], csv: ["text/csv"], json: ["application/json"] };
export function validateResource(file: { name: string; size: number; type: string }, maxBytes = 50 * 1024 * 1024): UploadCheck {
  if (file.size <= 0) return { ok: false, reason: "Le fichier est vide." };
  if (file.size > maxBytes) return { ok: false, reason: "Le fichier dépasse 50 Mo." };
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimes = RESOURCE_TYPES[extension];
  if (!mimes) return { ok: false, reason: "Type de fichier non autorisé." };
  if (!mimes.includes(file.type)) return { ok: false, reason: "Le type du fichier ne correspond pas à son extension." };
  return { ok: true, extension };
}

export function validateSubtitle(file: { name: string; size: number; type: string }): UploadCheck {
  if (!file.name.toLowerCase().endsWith(".vtt")) return { ok: false, reason: "Fichier WebVTT (.vtt) attendu." };
  if (file.size <= 0 || file.size > 1024 * 1024) return { ok: false, reason: "Sous-titres vides ou supérieurs à 1 Mo." };
  if (file.type && !["text/vtt", "text/plain", "application/octet-stream"].includes(file.type)) return { ok: false, reason: "Type de fichier invalide." };
  return { ok: true, extension: "vtt" };
}
