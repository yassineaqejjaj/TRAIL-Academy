"use server";
import { headers } from "next/headers";
import { asService } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { reviewSchema } from "@/lib/reviews";

export interface ReviewState { error?: string; done?: boolean }

export async function submitReview(token: string, _: ReviewState, form: FormData): Promise<ReviewState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await rateLimit(`review:${ip}`, 10, 60 * 60_000))) return { error: "Trop de tentatives. Réessayez plus tard." };
  if (!/^[0-9a-f]{36}$/.test(token)) return { error: "Ce lien n'est pas valide." };
  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const v = parsed.data;
  try {
    await asService((q) => q("select submit_review($1, $2, $3, $4, $5, true)", [token, v.name, v.role || null, v.linkedin || null, v.quote]));
  } catch (e) {
    return { error: e instanceof Error && e.message.includes("invitation_invalid") ? "Ce lien a déjà été utilisé ou a expiré." : "Envoi impossible pour le moment. Réessayez." };
  }
  return { done: true };
}
