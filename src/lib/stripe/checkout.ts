import type Stripe from "stripe";

export interface CheckoutOrder { orderId: string; title: string; amountCents: number; currency: string; taxInclusive: boolean }
export interface CheckoutBuyer { userId: string; email: string; stripeCustomerId: string | null }

/**
 * Stripe product tax code for all TRAIL offers: "On demand Online Courses, pre-recorded audio or audio visual content (streamed)".
 * Managed Payments requires one on every line. Confirm the choice with your accountant (written-only content has its own code,
 * txcd_20060358); Stripe Tax uses it to decide the tax treatment in each country.
 */
export const PRODUCT_TAX_CODE = "txcd_20060158";

/**
 * Parameters of the Stripe Checkout Session for one pending order. Pure, so the rules are tested:
 *  - one Stripe customer per person (reused on later purchases), created on the first one;
 *  - the order id travels in client_reference_id and metadata (the webhook finds the order from it, never from the redirect);
 *  - professional buyers can enter a VAT number and must give a billing address;
 *  - the session expires after one hour, so an abandoned checkout frees the order;
 *  - tax is never computed here: Stripe Tax does it.
 *
 * Two selling models, chosen by `managedPayments`:
 *  - true (default): Stripe's Managed Payments. Stripe is the merchant of record and handles sales tax and VAT, fraud, disputes and
 *    buyer support. Stripe requires Stripe Tax on and a product tax code, and refuses custom invoice data and custom texts.
 *  - false: you are the seller. Managed Payments is switched off for the session; Stripe Tax is optional.
 */
export function buildCheckoutParams(order: CheckoutOrder, buyer: CheckoutBuyer, opts: { siteUrl: string; slug: string; automaticTax: boolean; managedPayments?: boolean; now?: number }): Stripe.Checkout.SessionCreateParams {
  const managed = opts.managedPayments ?? true;
  const meta = { order_id: order.orderId, user_id: buyer.userId };
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    client_reference_id: order.orderId,
    ...(buyer.stripeCustomerId
      ? { customer: buyer.stripeCustomerId, customer_update: { name: "auto" as const, address: "auto" as const } }
      : { customer_email: buyer.email, customer_creation: "always" as const }),
    line_items: [{ quantity: 1, price_data: { currency: order.currency.toLowerCase(), unit_amount: order.amountCents, tax_behavior: order.taxInclusive ? "inclusive" : "exclusive", product_data: { name: order.title, ...(managed ? { tax_code: PRODUCT_TAX_CODE } : {}) } } }],
    allow_promotion_codes: true,
    invoice_creation: managed ? { enabled: true } : { enabled: true, invoice_data: { description: order.title, metadata: meta } },
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    automatic_tax: { enabled: managed ? true : opts.automaticTax },
    metadata: meta,
    payment_intent_data: { description: `TRAIL Academy : ${order.title}`, metadata: meta },
    ...(managed ? {} : { custom_text: { submit: { message: "En payant, vous acceptez les conditions générales de vente de TRAIL Academy." } } }),
    locale: "fr",
    expires_at: Math.floor((opts.now ?? Date.now()) / 1000) + 3600,
    success_url: `${opts.siteUrl}/achat/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.siteUrl}/achat/${opts.slug}?canceled=1`,
  };
  // As the seller, Managed Payments (on by default on some accounts) must be switched off for this session.
  return managed ? params : ({ ...params, managed_payments: { enabled: false } } as unknown as Stripe.Checkout.SessionCreateParams);
}

/** Managed Payments (Stripe as merchant of record) is the default model; STRIPE_MANAGED_PAYMENTS=off selects selling as yourself. */
export const managedPaymentsEnabled = (env: Record<string, string | undefined> = process.env): boolean => env.STRIPE_MANAGED_PAYMENTS !== "off";
