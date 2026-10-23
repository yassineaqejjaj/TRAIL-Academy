import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { purchaseConfirmed, refundProcessed } from "@/lib/emails/templates";
import { normalizeStripeEvent } from "@/lib/stripe/events";
import { stripeMode } from "@/lib/stripe/guard";
import { handleStripeWebhook, type WebhookDeps } from "@/lib/stripe/webhook";

const stripe = new Stripe("sk_test_dummy"); // offline: only used for local signature helpers
const SECRET = "whsec_test_secret";

const completedEvent = (over: Record<string, unknown> = {}) => ({
  id: "evt_1", object: "event", type: "checkout.session.completed",
  data: { object: { id: "cs_1", client_reference_id: "ord_1", payment_intent: "pi_1", payment_status: "paid", amount_total: 14900, currency: "EUR", total_details: { amount_tax: 2483, amount_discount: 0 }, customer: "cus_1", invoice: "in_1", ...over } },
});
const sign = (payload: string, secret = SECRET) => stripe.webhooks.generateTestHeaderString({ payload, secret });

function deps(over: Partial<WebhookDeps> = {}): WebhookDeps & { processEvent: ReturnType<typeof vi.fn>; afterProcessed: ReturnType<typeof vi.fn> } {
  return {
    constructEvent: (raw: string, sig: string, secret: string) => stripe.webhooks.constructEvent(raw, sig, secret),
    processEvent: vi.fn().mockResolvedValue({ status: "paid", order_id: "ord_1", newly_paid: true }),
    afterProcessed: vi.fn().mockResolvedValue(undefined),
    ...over,
  } as never;
}

describe("stripeMode guard", () => {
  it("allows test keys, blocks live keys and missing config", () => {
    expect(stripeMode({ STRIPE_SECRET_KEY: "sk_test_x" })).toEqual({ ok: true, mode: "test" });
    expect(stripeMode({})).toEqual({ ok: false, reason: "not_configured" });
    expect(stripeMode({ STRIPE_SECRET_KEY: "sk_live_x" })).toEqual({ ok: false, reason: "live_blocked" });
    expect(stripeMode({ STRIPE_SECRET_KEY: "sk_live_x", ALLOW_LIVE_PAYMENTS: "true" })).toEqual({ ok: false, reason: "live_blocked" });
    expect(stripeMode({ STRIPE_SECRET_KEY: "sk_live_x", LEGAL_REVIEW_COMPLETED: "true" })).toEqual({ ok: false, reason: "live_blocked" });
    expect(stripeMode({ STRIPE_SECRET_KEY: "sk_live_x", ALLOW_LIVE_PAYMENTS: "true", LEGAL_REVIEW_COMPLETED: "true" })).toEqual({ ok: true, mode: "live" });
    expect(stripeMode({ STRIPE_SECRET_KEY: "garbage" })).toEqual({ ok: false, reason: "invalid_key" });
  });
});

describe("normalizeStripeEvent", () => {
  it("projects checkout completion", () => {
    expect(normalizeStripeEvent(completedEvent() as never)).toEqual({ type: "checkout.session.completed", data: expect.objectContaining({ order_id: "ord_1", session_id: "cs_1", payment_intent_id: "pi_1", amount_total: 14900, amount_tax: 2483, currency: "eur", customer_id: "cus_1", invoice_id: "in_1" }) });
  });
  it("accepts expanded payment_intent objects and falls back to metadata", () => {
    const n = normalizeStripeEvent(completedEvent({ client_reference_id: null, metadata: { order_id: "ord_9" }, payment_intent: { id: "pi_9" } }) as never)!;
    expect(n.data).toMatchObject({ order_id: "ord_9", payment_intent_id: "pi_9" });
  });
  it("maps refunds, disputes, failures and ignores the rest", () => {
    const ev = (type: string, object: object) => ({ id: "e", type, data: { object } }) as never;
    expect(normalizeStripeEvent(ev("charge.refunded", { id: "ch_1", payment_intent: "pi_1", amount_refunded: 500, amount: 1000, amount_captured: 1000 }))!.data).toMatchObject({ amount_refunded: 500, amount_captured: 1000 });
    expect(normalizeStripeEvent(ev("charge.dispute.closed", { payment_intent: "pi_1", status: "won" }))!.data).toMatchObject({ dispute_status: "won" });
    expect(normalizeStripeEvent(ev("payment_intent.payment_failed", { id: "pi_1", metadata: { order_id: "o" } }))!.data).toMatchObject({ order_id: "o" });
    expect(normalizeStripeEvent(ev("customer.created", {}))).toBeNull();
  });
});

describe("handleStripeWebhook", () => {
  const body = JSON.stringify(completedEvent());
  it("rejects missing secret, missing signature and bad signatures without touching the database", async () => {
    const d = deps();
    expect((await handleStripeWebhook({ rawBody: body, signature: sign(body), secret: undefined }, d)).status).toBe(503);
    expect((await handleStripeWebhook({ rawBody: body, signature: null, secret: SECRET }, d)).status).toBe(400);
    expect((await handleStripeWebhook({ rawBody: body, signature: "t=1,v1=bad", secret: SECRET }, d)).status).toBe(400);
    expect((await handleStripeWebhook({ rawBody: body, signature: sign(body, "whsec_other"), secret: SECRET }, d)).status).toBe(400);
    expect((await handleStripeWebhook({ rawBody: body + " ", signature: sign(body), secret: SECRET }, d)).status).toBe(400); // tampered payload
    expect(d.processEvent).not.toHaveBeenCalled();
  });
  it("applies a correctly signed event and notifies", async () => {
    const d = deps();
    const res = await handleStripeWebhook({ rawBody: body, signature: sign(body), secret: SECRET }, d);
    expect(res).toEqual({ status: 200, body: { received: true, status: "paid" } });
    expect(d.processEvent).toHaveBeenCalledWith("evt_1", expect.objectContaining({ type: "checkout.session.completed" }));
    expect(d.afterProcessed).toHaveBeenCalledOnce();
  });
  it("acknowledges unhandled event types without processing", async () => {
    const d = deps();
    const b = JSON.stringify({ id: "evt_2", object: "event", type: "customer.created", data: { object: {} } });
    expect((await handleStripeWebhook({ rawBody: b, signature: sign(b), secret: SECRET }, d)).status).toBe(200);
    expect(d.processEvent).not.toHaveBeenCalled();
  });
  it("returns 500 so Stripe retries when processing fails, and does not notify", async () => {
    const d = deps({ processEvent: vi.fn().mockRejectedValue(new Error("db down")) });
    expect((await handleStripeWebhook({ rawBody: body, signature: sign(body), secret: SECRET }, d)).status).toBe(500);
    expect(d.afterProcessed).not.toHaveBeenCalled();
  });
  it("does not fail the webhook when the email step throws", async () => {
    const d = deps({ afterProcessed: vi.fn().mockRejectedValue(new Error("smtp")) });
    expect((await handleStripeWebhook({ rawBody: body, signature: sign(body), secret: SECRET }, d)).status).toBe(200);
  });
});

describe("email templates", () => {
  it("formats purchase confirmation in French with amount and expiry", () => {
    const e = purchaseConfirmed({ title: "Prompt Engineering", amountCents: 14900, accessUntil: "2027-10-23T00:00:00Z", appUrl: "https://x.test" });
    expect(e.subject).toContain("Prompt Engineering");
    expect(e.text).toContain("149");
    expect(e.text).toContain("https://x.test/compte");
  });
  it("states access consequences of refunds", () => {
    expect(refundProcessed({ title: "T", appUrl: "https://x.test", full: true }).text).toContain("retiré");
    expect(refundProcessed({ title: "T", appUrl: "https://x.test", full: false }).text).toContain("conservé");
  });
});
