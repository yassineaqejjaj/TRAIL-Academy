"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/config";
import { requireUser } from "@/lib/auth";
import { asService } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { deleteObject, storageConfigured } from "@/lib/storage";
import type { FormState } from "../../connexion/actions";

/**
 * GDPR art. 17. The learner confirms by typing their e-mail address. The database function removes learning data and
 * anonymises the account while keeping orders and payments (accounting retention); uploaded files are deleted afterwards.
 */
export async function deleteAccount(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await rateLimit(`erase:${user.id}`, 5, 60 * 60_000))) return { error: "Trop de tentatives. Réessayez plus tard." };
  if (String(form.get("confirmation") ?? "").trim().toLowerCase() !== user.email.toLowerCase()) return { error: "Saisissez votre adresse e-mail exacte pour confirmer." };

  let paths: string[] = [];
  try {
    const row = await asService((q) => q.one<{ result: { storage_paths: string[] } }>("select anonymize_user($1) as result", [user.id]));
    paths = row?.result.storage_paths ?? [];
  } catch (e) {
    if (e instanceof Error && e.message.includes("admin_cannot_self_delete")) return { error: "Un compte administrateur ne peut pas être supprimé ici." };
    console.error(JSON.stringify({ level: "error", msg: "anonymize_failed", error: e instanceof Error ? e.message : String(e) }));
    return { error: "La suppression a échoué. Réessayez ou contactez-nous." };
  }
  if (storageConfigured()) await Promise.all(paths.map((p) => deleteObject(p)));
  try { await getAuth().api.signOut({ headers: await headers() }); } catch { /* the sessions were deleted with the account */ }
  redirect("/?compte=supprime");
}
