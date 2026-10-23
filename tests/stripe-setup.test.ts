import { readFileSync } from "node:fs";
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { normalizeStripeEvent, WEBHOOK_EVENTS } from "@/lib/stripe/events";
import { checkStripe, setupStripe, webhookUrl, type StripeLike } from "@/lib/stripe/setup";

const SITE = "https://academy.example.com/";
function fake(over: { endpoints?: { id: string; url: string; status: string; enabled_events: string[] }[]; portals?: { id: string }[]; balanceFails?: boolean } = {}) {
  const create = vi.fn(async () => ({ id: "we_1", secret: "whsec_created" }));
  const portalCreate = vi.fn(async () => ({ id: "bpc_1" }));
  const stripe: StripeLike = {
    balance: { retrieve: async () => { if (over.balanceFails) throw new Error("bad key"); return {}; } },
    webhookEndpoints: { list: async () => ({ data: over.endpoints ?? [] }), create },
    billingPortal: { configurations: { list: async () => ({ data: over.portals ?? [] }), create: portalCreate } },
  };
  return { stripe, create, portalCreate };
}

describe("Stripe setup", () => {
  it("registers the webhook with exactly the handled events and a default customer portal, and returns the secret once", async () => {
    const { stripe, create, portalCreate } = fake();
    const r = await setupStripe(stripe, SITE);
    expect(r).toMatchObject({ webhook: "created", webhookSecret: "whsec_created", portal: "created" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ url: "https://academy.example.com/api/stripe/webhook", enabled_events: [...WEBHOOK_EVENTS] }));
    expect(portalCreate).toHaveBeenCalledTimes(1);
  });
  it("is idempotent: nothing is created twice", async () => {
    const { stripe, create, portalCreate } = fake({ endpoints: [{ id: "we_1", url: webhookUrl(SITE), status: "enabled", enabled_events: [...WEBHOOK_EVENTS] }], portals: [{ id: "bpc_1" }] });
    const r = await setupStripe(stripe, SITE);
    expect(r).toMatchObject({ webhook: "exists", portal: "exists", missingEvents: [] });
    expect(r.webhookSecret).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
    expect(portalCreate).not.toHaveBeenCalled();
  });
  it("flags an existing endpoint that misses events", async () => {
    const { stripe } = fake({ endpoints: [{ id: "we_1", url: webhookUrl(SITE), status: "enabled", enabled_events: ["checkout.session.completed"] }], portals: [{ id: "x" }] });
    const r = await setupStripe(stripe, SITE);
    expect(r.webhook).toBe("incomplete");
    expect(r.missingEvents).toContain("charge.refunded");
  });
});

describe("Stripe readiness check", () => {
  it("reports a rejected key as the only failure", async () => {
    expect(await checkStripe(fake({ balanceFails: true }).stripe, SITE)).toEqual([expect.objectContaining({ id: "stripe_api", status: "fail" })]);
  });
  it("fails when the webhook is missing, disabled or incomplete, and warns without a portal", async () => {
    const byId = async (over: Parameters<typeof fake>[0]) => Object.fromEntries((await checkStripe(fake(over).stripe, SITE)).map((c) => [c.id, c.status]));
    expect(await byId({})).toMatchObject({ stripe_api: "ok", stripe_webhook_endpoint: "fail", stripe_portal: "warn" });
    expect(await byId({ endpoints: [{ id: "a", url: webhookUrl(SITE), status: "disabled", enabled_events: [...WEBHOOK_EVENTS] }] })).toMatchObject({ stripe_webhook_endpoint: "fail" });
    expect(await byId({ endpoints: [{ id: "a", url: webhookUrl(SITE), status: "enabled", enabled_events: ["charge.refunded"] }] })).toMatchObject({ stripe_webhook_endpoint: "fail" });
    expect(await byId({ endpoints: [{ id: "a", url: webhookUrl(SITE), status: "enabled", enabled_events: [...WEBHOOK_EVENTS] }], portals: [{ id: "p" }] })).toMatchObject({ stripe_webhook_endpoint: "ok", stripe_portal: "ok" });
  });
});

describe("webhook event list", () => {
  it("every subscribed event is understood by the handler", () => {
    for (const type of WEBHOOK_EVENTS) {
      const event = { type, data: { object: { id: "x", client_reference_id: "o", metadata: { order_id: "o" }, payment_intent: "pi", amount_total: 100, amount_refunded: 1, amount: 100, status: "lost" } } } as unknown as Stripe.Event;
      expect(normalizeStripeEvent(event), type).not.toBeNull();
    }
  });
  it("the deployment guide lists the same events", () => {
    const doc = readFileSync("DEPLOYMENT.md", "utf8");
    for (const type of WEBHOOK_EVENTS) expect(doc, type).toContain(type);
  });
});
