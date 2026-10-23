import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, type SessionUser } from "@/lib/auth";
import { asUser, type Q } from "@/lib/db";

/**
 * Admin work runs as the signed-in admin through the `authenticated` role: the server checks the role first, and
 * PostgreSQL (RLS policies and admin functions calling is_admin()) enforces it again.
 */
export class UserFacingError extends Error {}

export function flash(path: string, kind: "ok" | "error", message: string): never {
  const [base, query] = path.split("?");
  const params = new URLSearchParams(query ?? "");
  params.delete("ok"); params.delete("error");
  params.set(kind, message);
  redirect(`${base}?${params.toString()}`);
}

const isRedirect = (e: unknown) => typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_");

/** Runs `fn` in one transaction as the admin. Any failure becomes a flash message on `failPath`; success returns the value. */
export async function withAdmin<T>(admin: SessionUser, failPath: string, fn: (q: Q) => Promise<T>): Promise<T> {
  try {
    return await asUser(admin.id, fn);
  } catch (e) {
    if (isRedirect(e)) throw e;
    flash(failPath, "error", e instanceof UserFacingError ? e.message : dbMessage(e as { message: string; code?: string }));
  }
}

/** Page loader: the admin check plus all reads in one transaction. */
export async function adminPage<T>(fn: (q: Q, admin: SessionUser) => Promise<T>): Promise<T> {
  const admin = await requireAdmin();
  return asUser(admin.id, (q) => fn(q, admin));
}

/** Public pages are ISR; admin edits must show up immediately. */
export function revalidatePublic() {
  revalidatePath("/", "layout");
}

export function formData(fd: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(fd.entries());
}

/** Maps a PostgreSQL error to a short French message without leaking internals. */
export function dbMessage(error: { message: string; code?: string } | null): string {
  if (!error) return "";
  const m = error.message;
  if (error.code === "23505") return "Cet élément existe déjà (valeur en doublon).";
  if (error.code === "23503") return "Cet élément est référencé ailleurs et ne peut pas être supprimé.";
  if (error.code === "23514") return "Une règle de validation de la base refuse cette valeur.";
  if (m.includes("prerequisite cycle")) return "Ce prérequis créerait une boucle entre modules.";
  if (m.includes("admin only")) return "Action réservée à l'administrateur.";
  if (m.includes("reason_required")) return "Un motif est obligatoire.";
  if (m.includes("feedback_required")) return "Un commentaire est obligatoire pour demander une révision.";
  if (m.includes("not_published")) return "Tous les modules de l'offre doivent être publiés.";
  if (m.includes("no_price")) return "Définissez d'abord un prix.";
  if (m.includes("testimonials_check")) return "Publier un témoignage exige une vérification et une référence de consentement.";
  return "L'opération a échoué.";
}
