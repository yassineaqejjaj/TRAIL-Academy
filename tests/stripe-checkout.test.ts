import { describe, expect, it } from "vitest";
import { buildCheckoutParams, managedPaymentsEnabled, PRODUCT_TAX_CODE } from "@/lib/stripe/checkout";

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
  it("as the seller, switches Stripe Tax on only when configured", () => {
    const seller = { ...opts, managedPayments: false };
    expect(buildCheckoutParams(order, { userId: "u", email: "a@b.fr", stripeCustomerId: null }, { ...seller, automaticTax: true }).automatic_tax).toEqual({ enabled: true });
    expect(buildCheckoutParams(order, { userId: "u", email: "a@b.fr", stripeCustomerId: null }, seller).automatic_tax).toEqual({ enabled: false });
  });

  it("sells through Managed Payments by default: Stripe Tax on, a tax code on the line, none of the options Stripe refuses", () => {
    const p = buildCheckoutParams(order, { userId: "u", email: "a@b.fr", stripeCustomerId: null }, opts);
    expect(p.automatic_tax).toEqual({ enabled: true });
    expect((p.line_items?.[0] as unknown as { price_data: { product_data: { tax_code?: string } } }).price_data.product_data.tax_code).toBe(PRODUCT_TAX_CODE);
    expect(p).not.toHaveProperty("custom_text");
    expect(p).not.toHaveProperty("managed_payments");
    expect(p.invoice_creation).toEqual({ enabled: true });
  });
  it("can instead sell as yourself: Managed Payments switched off, optional tax, invoice data and terms text", () => {
    const p = buildCheckoutParams(order, { userId: "u", email: "a@b.fr", stripeCustomerId: null }, { ...opts, managedPayments: false });
    expect(p).toMatchObject({ managed_payments: { enabled: false }, automatic_tax: { enabled: false } });
    expect(p).toHaveProperty("custom_text");
    expect((p.invoice_creation as { invoice_data?: unknown }).invoice_data).toBeDefined();
    expect((p.line_items?.[0] as unknown as { price_data: { product_data: Record<string, unknown> } }).price_data.product_data).not.toHaveProperty("tax_code");
  });
  it("is Managed Payments unless explicitly turned off", () => {
    expect(managedPaymentsEnabled({})).toBe(true);
    expect(managedPaymentsEnabled({ STRIPE_MANAGED_PAYMENTS: "on" })).toBe(true);
    expect(managedPaymentsEnabled({ STRIPE_MANAGED_PAYMENTS: "off" })).toBe(false);
  });
});
