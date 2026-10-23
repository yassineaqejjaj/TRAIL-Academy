import "server-only";
import { asService } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { purchaseConfirmed, refundProcessed } from "@/lib/emails/templates";
import { site } from "@/lib/site";
import type { ProcessResult } from "@/lib/stripe/webhook";

/** Transactional emails after a webhook was applied. Logs every attempt to email_events. */
export async function notifyAfterEvent(result: ProcessResult, type: string): Promise<void> {
  const interesting = (result.status === "paid" && result.newly_paid) || result.status === "refunded" || result.status === "partially_refunded";
  if (!interesting || !result.order_id || !result.user_id) return;
  void type;

  const data = await asService(async (q) => ({
    profile: await q.one<{ email: string }>("select email from profiles where id = $1", [result.user_id]),
    order: await q.one<{ total_cents: number }>("select total_cents from orders where id = $1", [result.order_id]),
    items: await q<{ access_months: number; title: string | null }>("select oi.access_months, p.title from order_items oi left join products p on p.id = oi.product_id where oi.order_id = $1", [result.order_id]),
  }));
  if (!data.profile?.email || !data.order) return;

  const title = data.items.map((i) => i.title).filter(Boolean).join(", ") || "votre commande";
  const months = Math.max(0, ...data.items.map((i) => i.access_months));
  const until = months ? new Date(new Date().setMonth(new Date().getMonth() + months)).toISOString() : null;
  const template = result.status === "paid" ? "purchase_confirmed" : "refund_processed";
  const mail = result.status === "paid"
    ? purchaseConfirmed({ title, amountCents: data.order.total_cents, accessUntil: until, appUrl: site.url })
    : refundProcessed({ title, appUrl: site.url, full: result.status === "refunded" });
  const sent = await sendEmail({ to: data.profile.email, ...mail });
  await asService((q) => q("insert into email_events (user_id, template, provider_message_id, status) values ($1, $2, $3, $4)", [result.user_id, template, sent.id ?? null, sent.ok ? "sent" : "failed"]));
}
