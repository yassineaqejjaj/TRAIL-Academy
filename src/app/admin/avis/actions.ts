"use server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { flash, formData, revalidatePublic, withAdmin } from "@/lib/admin/ctx";
import { site } from "@/lib/site";

const P = "/admin/avis";

export async function createInvitation(fd: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ label: z.string().trim().min(2).max(120), days: z.coerce.number().int().min(1).max(180) }).safeParse(formData(fd));
  if (!p.success) flash(P, "error", "Indiquez qui vous invitez (2 caractères minimum).");
  const row = await withAdmin(admin, P, (q) => q.one<{ t: string }>("select admin_create_review_invitation($1, $2) as t", [p.data!.label, p.data!.days]));
  // The link is shown once, in the confirmation message; only its hash is stored.
  flash(P, "ok", `Lien créé pour « ${p.data!.label} » : ${site.url}/avis/${row!.t}`);
}

export async function approveReview(fd: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ id: z.string().uuid(), reference: z.string().trim().min(5, "Décrivez comment vous avez vérifié que l'avis est réel (5 caractères minimum)").max(300), verified: z.literal("on", { message: "Confirmez que vous avez vérifié que cette personne existe et a bien suivi la formation" }) }).safeParse(formData(fd));
  if (!p.success) flash(P, "error", p.error.issues[0]?.message ?? "Formulaire invalide.");
  await withAdmin(admin, P, (q) => q("select admin_approve_review($1, $2)", [p.data!.id, p.data!.reference]));
  revalidatePublic();
  flash(P, "ok", "Avis publié.");
}

export async function rejectReview(fd: FormData) {
  const admin = await requireAdmin();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) flash(P, "error", "Avis invalide.");
  await withAdmin(admin, P, (q) => q("select admin_reject_review($1)", [id.data!]));
  flash(P, "ok", "Avis écarté.");
}
