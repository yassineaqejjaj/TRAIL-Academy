"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { bookingConfirmed, seatFreed } from "@/lib/emails/sessions";
import { rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";
import { attendeeContact, getSession } from "@/lib/sessions-data";

const ERRORS: Record<string, string> = { access_required: "access", session_started: "started", session_unavailable: "unavailable" };

export async function bookSession(fd: FormData) {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) redirect("/sessions");
  if (!(await rateLimit(`book:${user.id}`, 20, 10 * 60_000))) redirect(`/sessions/${id.data}?error=rate_limited`);
  let status = "booked";
  try {
    status = (await asUser(user.id, (q) => q.one<{ s: string }>("select book_session($1) as s", [id.data])))!.s;
  } catch (e) {
    const code = Object.keys(ERRORS).find((k) => e instanceof Error && e.message.includes(k));
    redirect(`/sessions/${id.data}?error=${code ? ERRORS[code] : "failed"}`);
  }
  const session = await getSession(id.data);
  if (session) after(sendEmail({ to: user.email, ...bookingConfirmed({ name: user.name || user.email, session, appUrl: site.url, waitlist: status === "waitlist" }) }));
  revalidatePath(`/sessions/${id.data}`); revalidatePath("/sessions");
  redirect(`/sessions/${id.data}?ok=${status}`);
}

export async function cancelBooking(fd: FormData) {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) redirect("/sessions");
  const promoted = (await asUser(user.id, (q) => q.one<{ p: string | null }>("select cancel_booking($1) as p", [id.data])))?.p ?? null;
  if (promoted) {
    const [contact, session] = await Promise.all([attendeeContact(promoted), getSession(id.data)]);
    if (contact && session) after(sendEmail({ to: contact.email, ...seatFreed({ name: contact.name, session, appUrl: site.url }) }));
  }
  revalidatePath(`/sessions/${id.data}`); revalidatePath("/sessions"); revalidatePath("/compte/sessions");
  redirect(`/sessions/${id.data}?ok=canceled`);
}
