import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { ContactInput } from "./contact";

export interface Message { to: string; subject: string; text: string; replyTo?: string }

let transporter: Transporter | undefined;

/**
 * Email over plain SMTP (nodemailer): works with any provider or a self-hosted relay such as Postal or Mailpit (dev).
 *   SMTP_URL=smtp://user:pass@host:587      EMAIL_FROM="TRAIL Academy <no-reply@example.com>"
 * `EMAIL_TRANSPORT=console` prints messages instead of sending them (local development and e2e tests only).
 * Without configuration it reports failure; it never pretends to deliver.
 */
export async function sendEmail(msg: Message): Promise<{ ok: boolean; id?: string }> {
  const from = process.env.EMAIL_FROM;
  if (process.env.EMAIL_TRANSPORT === "console" && process.env.NODE_ENV !== "production") {
    console.info(`[email] to=${msg.to} subject=${msg.subject}\n${msg.text}\n[/email]`);
    return { ok: true, id: "console" };
  }
  if (!process.env.SMTP_URL || !from) return { ok: false };
  try {
    transporter ??= nodemailer.createTransport(process.env.SMTP_URL);
    const info = await transporter.sendMail({ from, to: msg.to, subject: msg.subject, text: msg.text, replyTo: msg.replyTo });
    return { ok: true, id: info.messageId };
  } catch {
    return { ok: false };
  }
}

export async function deliverLead(lead: ContactInput): Promise<{ ok: boolean }> {
  const to = process.env.LEADS_TO_EMAIL;
  if (!to) return { ok: false };
  return sendEmail({
    to, replyTo: lead.email, subject: `Demande de devis — ${lead.company}`,
    text: `Nom: ${lead.name}\nEmail: ${lead.email}\nOrganisation: ${lead.company}\nApprenants: ${lead.seats ?? "n/c"}\n\n${lead.message}`,
  });
}
