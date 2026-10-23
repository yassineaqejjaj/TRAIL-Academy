import type { ContactInput } from "./contact";

/**
 * Email adapter (Resend). Reports failure instead of pretending to deliver when credentials are absent.
 * UNVERIFIED against the real Resend API until credentials are supplied.
 */
export async function sendEmail(msg: { to: string; subject: string; text: string; replyTo?: string }): Promise<{ ok: boolean; id?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: msg.to, subject: msg.subject, text: msg.text, reply_to: msg.replyTo }),
  }).catch(() => null);
  if (!res?.ok) return { ok: false };
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: json.id };
}

export async function deliverLead(lead: ContactInput): Promise<{ ok: boolean }> {
  const to = process.env.LEADS_TO_EMAIL;
  if (!to) return { ok: false };
  return sendEmail({
    to, replyTo: lead.email, subject: `Demande de devis — ${lead.company}`,
    text: `Nom: ${lead.name}\nEmail: ${lead.email}\nOrganisation: ${lead.company}\nApprenants: ${lead.seats ?? "n/c"}\n\n${lead.message}`,
  });
}
