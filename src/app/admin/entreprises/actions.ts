"use server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { flash, formData, withAdmin } from "@/lib/admin/ctx";
import { site } from "@/lib/site";

const P = "/admin/entreprises";
const uuid = z.string().uuid();

export async function createOrganization(fd: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ name: z.string().trim().min(2, "Nom de l'organisation requis.").max(120), email: z.union([z.string().trim().email(), z.literal("")]).optional() }).safeParse(formData(fd));
  if (!p.success) flash(P, "error", p.error.issues[0]?.message ?? "Formulaire invalide.");
  await withAdmin(admin, P, (q) => q("select admin_create_organization($1, $2)", [p.data!.name, p.data!.email || null]));
  flash(P, "ok", `Organisation « ${p.data!.name} » créée.`);
}

export async function inviteManager(fd: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ org: uuid, label: z.string().trim().min(2, "Indiquez qui vous invitez.").max(120), days: z.coerce.number().int().min(1).max(60) }).safeParse(formData(fd));
  if (!p.success) flash(P, "error", p.error.issues[0]?.message ?? "Formulaire invalide.");
  const row = await withAdmin(admin, P, (q) => q.one<{ t: string }>("select create_org_invitation($1, 'manager', $2, $3) as t", [p.data!.org, p.data!.label, p.data!.days]));
  flash(P, "ok", `Lien responsable créé pour « ${p.data!.label} » : ${site.url}/equipe/invitation/${row!.t} (copiez-le maintenant, il ne sera plus affiché).`);
}

export async function createPack(fd: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ org: uuid, seats: z.coerce.number().int().min(1).max(5000), until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de fin invalide."), product: z.union([uuid, z.literal("")]).optional() }).safeParse(formData(fd));
  if (!p.success) flash(P, "error", p.error.issues[0]?.message ?? "Formulaire invalide.");
  await withAdmin(admin, P, (q) => q("select admin_create_license_pack($1, $2, $3::date, $4)", [p.data!.org, p.data!.seats, p.data!.until, p.data!.product || null]));
  flash(P, "ok", "Pack de licences créé.");
}
