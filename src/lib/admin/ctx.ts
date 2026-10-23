import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Server-side admin check, then the user's own client: the database re-checks is_admin() via RLS/functions. */
export async function adminDb() {
  const user = await requireAdmin();
  return { user, db: await createClient() };
}

export function flash(path: string, kind: "ok" | "error", message: string): never {
  const [base, query] = path.split("?");
  const params = new URLSearchParams(query ?? "");
  params.delete("ok"); params.delete("error");
  params.set(kind, message);
  redirect(`${base}?${params.toString()}`);
}

/** Public pages are ISR; admin edits must show up immediately. */
export function revalidatePublic() {
  revalidatePath("/", "layout");
}

export function formData(fd: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(fd.entries());
}

/** Maps a Postgres/PostgREST error to a short French message without leaking internals. */
export function dbMessage(error: { message: string; code?: string } | null): string {
  if (!error) return "";
  const m = error.message;
  if (error.code === "23505") return "Cet élément existe déjà (valeur en doublon).";
  if (error.code === "23503") return "Cet élément est référencé ailleurs et ne peut pas être supprimé.";
  if (m.includes("prerequisite cycle")) return "Ce prérequis créerait une boucle entre modules.";
  if (m.includes("admin only")) return "Action réservée à l'administrateur.";
  if (m.includes("reason_required")) return "Un motif est obligatoire.";
  if (m.includes("feedback_required")) return "Un commentaire est obligatoire pour demander une révision.";
  if (m.includes("not_published")) return "Tous les modules de l'offre doivent être publiés.";
  if (m.includes("no_price")) return "Définissez d'abord un prix.";
  if (m.includes("published_requires") || m.includes("testimonials_check")) return "Publier un témoignage exige une vérification et une référence de consentement.";
  return "L'opération a échoué.";
}
