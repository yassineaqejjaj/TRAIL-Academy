"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { flash, formData, withAdmin } from "@/lib/admin/ctx";
import { sendEmail } from "@/lib/email";
import { sessionCanceled } from "@/lib/emails/sessions";
import { site } from "@/lib/site";
import { getSession } from "@/lib/sessions-data";

const P = "/admin/sessions";
const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(3, "Titre : 3 caractères minimum").max(140),
  description: z.string().trim().max(4000).optional(),
  courseId: z.string().uuid().optional().or(z.literal("")),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Date et heure invalides"),
  duration: z.coerce.number().int().min(15, "15 minutes minimum").max(480),
  capacity: z.coerce.number().int().min(1, "1 place minimum").max(500),
  audience: z.enum(["learners", "open"]),
  meetingUrl: z.string().trim().max(500).regex(/^(https:\/\/\S+)?$/, "Le lien de visio doit commencer par https://").optional(),
  status: z.enum(["draft", "published"]),
});

export async function saveSession(fd: FormData) {
  const admin = await requireAdmin();
  const p = schema.safeParse(formData(fd));
  if (!p.success) flash(P, "error", p.error.issues[0]?.message ?? "Formulaire invalide.");
  const v = p.data!;
  await withAdmin(admin, P, (q) => q("select admin_save_session($1, $2, $3, $4, $5::timestamp, $6, $7, $8, $9, $10)",
    [v.id || null, v.title, v.description ?? "", v.courseId || null, v.start, v.duration, v.capacity, v.audience, v.meetingUrl || null, v.status]));
  revalidatePath("/sessions"); revalidatePath("/sessions/calendar.ics");
  flash(P, "ok", v.id ? "Session mise à jour." : v.status === "published" ? "Session publiée." : "Session enregistrée en brouillon.");
}

export async function cancelSession(fd: FormData) {
  const admin = await requireAdmin();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) flash(P, "error", "Session invalide.");
  // Everyone who had a seat or was waiting is told (best effort: needs the e-mail service). Read before cancelling.
  const people = await withAdmin(admin, P, (q) => q<{ email: string; name: string }>("select email, name from admin_session_attendees($1)", [id.data!]));
  await withAdmin(admin, P, (q) => q("select admin_cancel_session($1)", [id.data!]));
  const session = await getSession(id.data!);
  if (session) for (const person of people) after(sendEmail({ to: person.email, ...sessionCanceled({ name: person.name, session, appUrl: site.url }) }));
  revalidatePath("/sessions"); revalidatePath(`/sessions/${id.data}`);
  flash(P, "ok", `Session annulée${people.length ? ` : ${people.length} personne(s) prévenue(s) par e-mail si le service d'envoi est configuré` : ""}.`);
}

export async function deleteSession(fd: FormData) {
  const admin = await requireAdmin();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) flash(P, "error", "Session invalide.");
  await withAdmin(admin, P, (q) => q("select admin_delete_session($1)", [id.data!]));
  revalidatePath("/sessions");
  flash(P, "ok", "Session supprimée.");
}
