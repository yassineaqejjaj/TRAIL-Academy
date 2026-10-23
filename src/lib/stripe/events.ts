import type Stripe from "stripe";

/** The events the webhook acts on; the endpoint registered at Stripe must subscribe to exactly these. */
export const WEBHOOK_EVENTS = [
  "checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired",
  "payment_intent.payment_failed", "charge.refunded", "charge.dispute.created", "charge.dispute.closed",
] as const;

export interface NormalizedEvent { type: string; data: Record<string, unknown> }

const idOf = (v: unknown): string | null => (typeof v === "string" ? v : v && typeof v === "object" && "id" in v ? String((v as { id: unknown }).id) : null);

/**
 * Projects a *signature-verified* Stripe event onto the minimal fields the database function uses.
 * Returns null for event types we do not act on.
 */
export function normalizeStripeEvent(event: Stripe.Event): NormalizedEvent | null {
  const obj = event.data.object as unknown as Record<string, unknown>;
  const meta = (obj.metadata ?? {}) as Record<string, string | undefined>;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const totals = (obj.total_details ?? {}) as { amount_tax?: number; amount_discount?: number };
      return { type: event.type, data: {
        order_id: (obj.client_reference_id as string | null) ?? meta.order_id ?? null,
        session_id: obj.id, payment_intent_id: idOf(obj.payment_intent), payment_status: obj.payment_status,
        amount_total: obj.amount_total, amount_tax: totals.amount_tax ?? 0, amount_discount: totals.amount_discount ?? 0,
        currency: typeof obj.currency === "string" ? obj.currency.toLowerCase() : null,
        customer_id: idOf(obj.customer), invoice_id: idOf(obj.invoice),
      } };
    }
    case "payment_intent.payment_failed":
      return { type: event.type, data: { order_id: meta.order_id ?? null, payment_intent_id: obj.id } };
    case "charge.refunded":
      return { type: event.type, data: {
        payment_intent_id: idOf(obj.payment_intent), charge_id: obj.id, amount_refunded: obj.amount_refunded,
        amount_captured: (obj.amount_captured as number | undefined) ?? obj.amount,
      } };
    case "charge.dispute.created":
    case "charge.dispute.closed":
      return { type: event.type, data: { payment_intent_id: idOf(obj.payment_intent), dispute_status: obj.status } };
    default:
      return null;
  }
}
