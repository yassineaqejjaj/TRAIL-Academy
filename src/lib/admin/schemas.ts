import { z } from "zod";

/** Textarea → trimmed non-empty lines. */
export const lines = (v: unknown): string[] =>
  typeof v === "string" ? v.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [];

/** "149", "149,50", "1 490.00 €" → integer cents. Returns null when invalid or negative. */
export function eurosToCents(input: string): number | null {
  const cleaned = input.replace(/[\s€]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalText = (max: number) => z.preprocess(emptyToUndef, z.string().trim().max(max).optional());
const bool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const num = (min: number, max: number) => z.preprocess((v) => (typeof v === "string" ? Number(v.replace(",", ".")) : v), z.number().min(min).max(max));

export const slugSchema = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug invalide (minuscules, chiffres, tirets)").max(80);

export const courseSchema = z.object({
  code: z.string().trim().regex(/^M\d{1,3}$/, "Code attendu : M1, M2…"),
  slug: slugSchema,
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(10).max(600),
  phaseId: z.coerce.number().int().min(1),
  position: z.coerce.number().int().min(1).max(500),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  durationHours: num(0.5, 200),
});

export const courseDetailsSchema = courseSchema.omit({ code: true, position: true }).extend({
  topics: z.preprocess(lines, z.array(z.string().max(200)).max(30)),
  tools: z.preprocess(lines, z.array(z.string().max(120)).max(30)),
  outcomes: z.preprocess(lines, z.array(z.string().max(300)).max(30)),
  deliverable: optionalText(300),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  requireAllLessons: bool, requireQuizzes: bool, requireAssignments: bool,
});

export const lessonSchema = z.object({
  title: z.string().trim().min(2).max(200),
  kind: z.enum(["video", "reading", "exercise", "demo"]),
  required: bool, isFreePreview: bool,
  contentStatus: z.enum(["draft", "published"]),
  videoProvider: z.preprocess(emptyToUndef, z.literal("hls").optional()),
  videoAssetId: z.preprocess(emptyToUndef, z.string().trim().regex(/^[A-Za-z0-9_-]{4,200}$/, "Identifiant vidéo invalide").optional()),
  durationSeconds: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).max(60 * 60 * 10).optional()),
  bodyMd: optionalText(50_000),
  transcript: optionalText(100_000),
  chapters: z.preprocess(lines, z.array(z.string()).max(60)),
}).refine((l) => !l.videoProvider === !l.videoAssetId, { message: "Fournisseur et identifiant vidéo vont ensemble", path: ["videoAssetId"] });

/** "0:00 Introduction" lines → chapter markers. */
export function parseChapterLines(ls: string[]): { title: string; start_seconds: number }[] | null {
  const out: { title: string; start_seconds: number }[] = [];
  for (const l of ls) {
    const m = /^(\d+):([0-5]\d)\s+(.+)$/.exec(l);
    if (!m) return null;
    out.push({ start_seconds: Number(m[1]) * 60 + Number(m[2]), title: m[3].trim() });
  }
  return out.sort((a, b) => a.start_seconds - b.start_seconds);
}

export const quizSchema = z.object({
  title: z.string().trim().min(2).max(160),
  passPercent: z.coerce.number().int().min(1).max(100),
  maxAttempts: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(100).optional()),
});
export const questionSchema = z.object({
  kind: z.enum(["single_choice", "multiple_choice", "free_text"]),
  prompt: z.string().trim().min(3).max(1000),
  feedback: optionalText(1000),
  points: z.coerce.number().int().min(1).max(20),
});
export const optionSchema = z.object({ label: z.string().trim().min(1).max(400), isCorrect: bool });
export const assignmentSchema = z.object({ title: z.string().trim().min(2).max(160), instructionsMd: z.string().trim().min(10).max(20_000), required: bool });

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/, "Code : 3 à 40 caractères A-Z 0-9 - _"),
  kind: z.enum(["percent", "amount"]),
  value: z.string().trim(),
  validUntil: z.preprocess(emptyToUndef, z.string().date().optional()),
  maxRedemptions: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).optional()),
}).transform((c, ctx) => {
  if (c.kind === "percent") {
    const p = Number(c.value.replace(",", "."));
    if (!(p > 0 && p <= 100)) { ctx.addIssue({ code: "custom", message: "Pourcentage entre 0 et 100", path: ["value"] }); return z.NEVER; }
    return { ...c, percentOff: p, amountOffCents: null as number | null };
  }
  const cents = eurosToCents(c.value);
  if (!cents) { ctx.addIssue({ code: "custom", message: "Montant invalide", path: ["value"] }); return z.NEVER; }
  return { ...c, percentOff: null as number | null, amountOffCents: cents };
});

export const reviewSchema = z.object({ status: z.enum(["in_review", "accepted", "revision_requested"]), feedback: optionalText(4000) });
export const grantSchema = z.object({ months: z.coerce.number().int().min(1).max(36), reason: z.string().trim().min(3).max(300) });

export const faqSchema = z.object({ question: z.string().trim().min(5).max(300), answer: z.string().trim().min(5).max(3000), position: z.coerce.number().int().min(0).max(1000).default(0), published: bool });
export const testimonialSchema = z.object({
  authorName: z.string().trim().min(2).max(120), authorRole: optionalText(160), quote: z.string().trim().min(10).max(1500),
  consentReference: optionalText(300), publish: bool,
}).refine((t) => !t.publish || !!t.consentReference, { message: "Publier exige une référence de consentement vérifiable", path: ["consentReference"] });
export const postSchema = z.object({
  slug: slugSchema, title: z.string().trim().min(3).max(200), excerpt: optionalText(400), bodyMd: z.string().trim().max(100_000),
  category: optionalText(80), seoTitle: optionalText(70), seoDescription: optionalText(170), publish: bool,
});
export const sectionSchema = z.object({ title: optionalText(200), subtitle: optionalText(600), bodyMd: optionalText(50_000) });
