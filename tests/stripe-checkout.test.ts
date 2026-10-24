import { describe, expect, it } from "vitest";
import { buildCheckoutParams, isManagedPaymentsConflict, withoutManagedPayments } from "@/lib/stripe/checkout";

const order = { orderId: "11111111-1111-1111-1111-111111111111", title: "Prompt Engineering", amountCents: 19900, currency: "EUR", taxInclusive: true };
const opts = { siteUrl: "https://academy.example.com", slug: "prompt-engineering", automaticTax: false, now: 1_800_000_000_000 };

describe("checkout session parameters", () => {
  it("creates the Stripe customer on a first purchase and reuses it afterwards", () => {
    const first = buildCheckoutParams(order, { userId: "u", email: "a@b.fr", stripeCustomerId: null }, opts);
    expect(first).toMatchObject({ customer_email: "a@b.fr", customer_creation: "always" });
    expect(first).not.toHaveProperty("customer");
    const again = buildCheckoutParams(order, { userId: "u", email: "a@b.fr", stripeCustomerId: "cus_1" }, opts);
    expect(again).toMatchObject({ customer: "cus_1", customer_update: { name: "auto", address: "auto" } });
    expect(again).not.toHaveProperty("customer_email");
    expect(again).not.toHaveProperty("customer_creation");
  });
  it("identifies the order for the webhook and never trusts the redirect", () => {
    const p = buildCheckoutParams(order, { userId: "u", email: "a@b.fr", stripeCustomerId: null }, opts);
    expect(p.client_reference_id).toBe(order.orderId);
    expect(p.metadata).toEqual({ order_id: order.orderId, user_id: "u" });
    expect((p.payment_intent_data as { metadata: unknown }).metadata).toEqual({ order_id: order.orderId, user_id: "u" });
    expect(p.success_url).toBe("https://academy.example.com/achat/succes?session_id={CHECKOUT_SESSION_ID}");
  });
  it("prices in the order's currency and tax mode, from the server-side order only", () => {
    const p = buildCheckoutParams({ ...order, taxInclusive: false }, { userId: "u", email: "a@b.fr", stripeCustomerId: null }, opts);
    expect(p.line_items?.[0]).toMatchObject({ quantity: 1, price_data: { currency: "eur", unit_amount: 19900, tax_behavior: "exclusive" } });
    expect(buildCheckoutParams(order, { userId: "u", email: "a@b.fr", stripeCustomerId: null }, opts).line_items?.[0]).toMatchObject({ price_data: { tax_behavior: "inclusive" } });
  });
  it("lets professionals add a VAT number, requires a billing address, and expires after an hour", () => {
    const p = buildCheckoutParams(order, { userId: "u", email: "a@b.fr", stripeCustomerId: null }, opts);
    expect(p.tax_id_collection).toEqual({ enabled: true });
    expect(p.billing_address_collection).toBe("required");
    expect(p.expires_at).toBe(1_800_000_000 + 3600);
    expect(p.invoice_creation).toMatchObject({ enabled: true });
  });
  it("switches Stripe Tax on only when configured", () => {
    expect(buildCheckoutParams(order, { userId: "u", email: "a@b.fr", stripeCustomerId: null }, { ...opts, automaticTax: true }).automatic_tax).toEqual({ enabled: true });
    expect(buildCheckoutParams(order, { userId: "u", email: "a@b.fr", stripeCustomerId: null }, opts).automatic_tax).toEqual({ enabled: false });
  });

  it("can opt out of Managed Payments and recognises Stripe's conflict error", () => {
    const p = buildCheckoutParams(order, { userId: "u", email: "a@b.fr", stripeCustomerId: null }, opts);
    expect(p).not.toHaveProperty("managed_payments");
    expect(withoutManagedPayments(p)).toMatchObject({ managed_payments: { enabled: false }, client_reference_id: order.orderId });
    expect(isManagedPaymentsConflict(new Error("custom_text cannot be used with Managed Payments, which is enabled by default"))).toBe(true);
    expect(isManagedPaymentsConflict(new Error("card_declined"))).toBe(false);
  });
});
