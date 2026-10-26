"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { flash, formData } from "@/lib/admin/ctx";
import { asUser } from "@/lib/db";
import { site } from "@/lib/site";

const msg = (e: unknown) => {
  const m = (e as Error).message ?? "";
  if (m.includes("no_seat_left")) return "Plus aucune licence disponible dans ce pack.";
  if (m.includes("already_allocated")) return "Cette personne a déjà une licence dans ce pack.";
  if (m.includes("not_a_member")) return "Cette personne n'a pas encore accepté l'invitation.";
  if (m.includes("pack_not_valid")) return "Ce pack de licences n'est pas (ou plus) valide.";
  if (m.includes("path_required")) return "Choisissez le parcours à attribuer.";
  if (m.includes("path_not_in_pack")) return "Ce parcours n'est pas inclus dans ce pack.";
  if (m.includes("manager only") || m.includes("admin only")) return "Action réservée au responsable de l'organisation.";
  return "Action impossible pour le moment.";
};
const here = (org: string) => `/equipe?org=${org}`;
const uuid = z.string().uuid();

export async function inviteLearner(fd: FormData) {
  const user = await requireUser();
  const p = z.object({ org: uuid, label: z.string().trim().min(2, "Indiquez qui vous invitez (2 caractères minimum).").max(120), days: z.coerce.number().int().min(1).max(60) }).safeParse(formData(fd));
  if (!p.success) flash("/equipe", "error", p.error.issues[0]?.message ?? "Formulaire invalide.");
  const d = p.data!;
  try {
    const row = await asUser(user.id, (q) => q.one<{ t: string }>("select create_org_invitation($1, 'learner', $2, $3) as t", [d.org, d.label, d.days]));
    // Shown once: only the hash of the token is stored.
    flash(here(d.org), "ok", `Lien créé pour « ${d.label} » : ${site.url}/equipe/invitation/${row!.t} (copiez-le maintenant, il ne sera plus affiché).`);
  } catch (e) { if (isRedirect(e)) throw e; flash(here(d.org), "error", msg(e)); }
}

export async function allocateSeat(fd: FormData) {
  const user = await requireUser();
  const p = z.object({ org: uuid, pack: uuid, member: uuid, path: z.union([uuid, z.literal("")]).optional() }).safeParse(formData(fd));
  if (!p.success) flash("/equipe", "error", "Formulaire invalide.");
  const d = p.data!;
  try {
    await asUser(user.id, (q) => q("select allocate_license_seat($1, $2, $3)", [d.pack, d.member, d.path || null]));
  } catch (e) { if (isRedirect(e)) throw e; flash(here(d.org), "error", msg(e)); }
  revalidatePath("/equipe");
  flash(here(d.org), "ok", "Licence attribuée : le parcours est accessible à cette personne.");
}

export async function releaseSeat(fd: FormData) {
  const user = await requireUser();
  const p = z.object({ org: uuid, allocation: uuid }).safeParse(formData(fd));
  if (!p.success) flash("/equipe", "error", "Formulaire invalide.");
  const d = p.data!;
  try {
    await asUser(user.id, (q) => q("select release_license_seat($1)", [d.allocation]));
  } catch (e) { if (isRedirect(e)) throw e; flash(here(d.org), "error", msg(e)); }
  revalidatePath("/equipe");
  flash(here(d.org), "ok", "Licence retirée : l'accès donné par cette licence est terminé.");
}

const isRedirect = (e: unknown) => typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_");
