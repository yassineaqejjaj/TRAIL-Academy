import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { purchaseConfirmed, refundProcessed } from "@/lib/emails/templates";
import { site } from "@/lib/site";
import type { ProcessResult } from "@/lib/stripe/webhook";

/** Transactional emails after a webhook was applied. Logs every attempt to email_events. */
export async function notifyAfterEvent(result: ProcessResult, type: string): Promise<void> {
  const interesting = (result.status === "paid" && result.newly_paid) || result.status === "refunded" || result.status === "partially_refunded";
  if (!interesting || !result.order_id || !result.user_id) return;

  const db = createServiceClient();
  const [{ data: profile }, { data: order }, { data: items }] = await Promise.all([
    db.from("profiles").select("email").eq("id", result.user_id).maybeSingle(),
    db.from("orders").select("total_cents").eq("id", result.order_id).maybeSingle(),
    db.from("order_items").select("access_months, products(title)").eq("order_id", result.order_id),
  ]);
  if (!profile?.email || !order) return;
  const title = (items ?? []).map((i) => (i as unknown as { products: { title: string } | null }).products?.title).filter(Boolean).join(", ") || "votre commande";
  const months = Math.max(0, ...(items ?? []).map((i) => i.access_months as number));
  const until = months ? new Date(new Date().setMonth(new Date().getMonth() + months)).toISOString() : null;

  const template = result.status === "paid" ? "purchase_confirmed" : "refund_processed";
  const mail = result.status === "paid"
    ? purchaseConfirmed({ title, amountCents: order.total_cents, accessUntil: until, appUrl: site.url })
    : refundProcessed({ title, appUrl: site.url, full: result.status === "refunded" });
  const sent = await sendEmail({ to: profile.email, ...mail });
  await db.from("email_events").insert({ user_id: result.user_id, template, provider_message_id: sent.id ?? null, status: sent.ok ? "sent" : "failed" });
  void type;
}
