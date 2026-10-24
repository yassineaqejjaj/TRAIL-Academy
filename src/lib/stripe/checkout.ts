import type Stripe from "stripe";

export interface CheckoutOrder { orderId: string; title: string; amountCents: number; currency: string; taxInclusive: boolean }
export interface CheckoutBuyer { userId: string; email: string; stripeCustomerId: string | null }

/**
 * Parameters of the Stripe Checkout Session for one pending order. Pure, so the rules are tested:
 *  - one Stripe customer per person (reused on later purchases), created on the first one;
 *  - the order id travels in client_reference_id and metadata (the webhook finds the order from it, never from the redirect);
 *  - professional buyers can enter a VAT number and a billing name/address for their invoice;
 *  - the session expires after one hour, so an abandoned checkout frees the order;
 *  - tax comes from Stripe Tax when enabled, never from rates written in this code.
 */
export function buildCheckoutParams(order: CheckoutOrder, buyer: CheckoutBuyer, opts: { siteUrl: string; slug: string; automaticTax: boolean; now?: number }): Stripe.Checkout.SessionCreateParams {
  const meta = { order_id: order.orderId, user_id: buyer.userId };
  return {
    mode: "payment",
    client_reference_id: order.orderId,
    ...(buyer.stripeCustomerId
      ? { customer: buyer.stripeCustomerId, customer_update: { name: "auto" as const, address: "auto" as const } }
      : { customer_email: buyer.email, customer_creation: "always" as const }),
    line_items: [{ quantity: 1, price_data: { currency: order.currency.toLowerCase(), unit_amount: order.amountCents, tax_behavior: order.taxInclusive ? "inclusive" : "exclusive", product_data: { name: order.title } } }],
    allow_promotion_codes: true,
    invoice_creation: { enabled: true, invoice_data: { description: order.title, metadata: meta } },
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    automatic_tax: { enabled: opts.automaticTax },
    metadata: meta,
    payment_intent_data: { description: `TRAIL Academy : ${order.title}`, metadata: meta },
    locale: "fr",
    expires_at: Math.floor((opts.now ?? Date.now()) / 1000) + 3600,
    success_url: `${opts.siteUrl}/achat/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.siteUrl}/achat/${opts.slug}?canceled=1`,
  };
}

/**
 * Stripe's "Managed Payments" (Stripe as merchant of record, handling tax and invoices) is enabled by default on some accounts.
 * This integration assumes YOU are the seller, so it is switched off for the session. Managed Payments needs a different setup
 * (product tax codes, no custom invoice data) and a legal decision that is not made here.
 */
export function withoutManagedPayments(params: Stripe.Checkout.SessionCreateParams): Stripe.Checkout.SessionCreateParams {
  return { ...params, managed_payments: { enabled: false } } as unknown as Stripe.Checkout.SessionCreateParams;
}

export const isManagedPaymentsConflict = (e: unknown): boolean => e instanceof Error && /Managed Payments/i.test(e.message);
