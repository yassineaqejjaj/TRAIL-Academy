"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { asService, asUser } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import { stripeMode } from "@/lib/stripe/guard";

const ERRORS: Record<string, string> = {
  product_unavailable: "unavailable", not_published: "not_published", already_owned: "already_owned",
  quotation_only: "quotation", not_purchasable_online: "quotation",
};

/** Creates a pending order (rules enforced in SQL) then a Stripe Checkout Session. Grants nothing. */
export async function startCheckout(formData: FormData) {
  const user = await requireUser();
  const slug = z.string().regex(/^[a-z0-9-]{1,80}$/).safeParse(formData.get("product"));
  if (!slug.success) redirect("/formations");
  const back = (code: string) => redirect(`/achat/${slug.data}?error=${code}`);

  if (!(await rateLimit(`checkout:${user.id}`, 10, 10 * 60_000))) back("rate_limited");
  if (!stripeMode(process.env).ok) back("payments_unavailable");

  type Order = { order_id: string; amount_cents: number; currency: string; tax_inclusive: boolean; title: string };
  let o: Order | null = null;
  try {
    o = (await asService((q) => q.one<{ r: Order }>("select create_checkout_order($1, $2) as r", [user.id, slug.data])))!.r;
  } catch (e) {
    const code = Object.keys(ERRORS).find((k) => (e as Error).message.includes(k));
    back(code ? ERRORS[code] : "failed");
  }
  const order = o!;

  let url: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.order_id,
      customer_email: user.email,
      customer_creation: "always",
      line_items: [{ quantity: 1, price_data: { currency: order.currency.toLowerCase(), unit_amount: order.amount_cents, tax_behavior: order.tax_inclusive ? "inclusive" : "exclusive", product_data: { name: order.title } } }],
      allow_promotion_codes: true,
      invoice_creation: { enabled: true },
      // Tax is computed by Stripe Tax when enabled; rates are never hard-coded here.
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
      metadata: { order_id: order.order_id, user_id: user.id },
      payment_intent_data: { metadata: { order_id: order.order_id, user_id: user.id } },
      locale: "fr",
      success_url: `${site.url}/achat/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site.url}/achat/${slug.data}?canceled=1`,
    }, { idempotencyKey: `checkout-${order.order_id}` });
    await asService((q) => q("select attach_checkout_session($1, $2)", [order.order_id, session.id]));
    url = session.url;
  } catch { /* fall through to the error redirect */ }
  if (!url) back("failed");
  redirect(url!);
}

export async function openBillingPortal() {
  const user = await requireUser();
  const profile = await asUser(user.id, (q) => q.one<{ stripe_customer_id: string | null }>("select stripe_customer_id from profiles where id = $1", [user.id]));
  if (!profile?.stripe_customer_id || !stripeMode(process.env).ok) redirect("/compte/commandes?error=portal");
  let url: string | null = null;
  try { url = (await getStripe().billingPortal.sessions.create({ customer: profile!.stripe_customer_id!, return_url: `${site.url}/compte/commandes` })).url; } catch { /* portal not configured in Stripe */ }
  redirect(url ?? "/compte/commandes?error=portal");
}

export async function openInvoice(formData: FormData) {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(formData.get("orderId"));
  if (!id.success) redirect("/compte/commandes");
  // RLS: only the owner can read the order, so the invoice id is never exposed to others.
  const order = await asUser(user.id, (q) => q.one<{ stripe_invoice_id: string | null }>("select stripe_invoice_id from orders where id = $1 and user_id = $2", [id.data, user.id]));
  let url: string | null = null;
  if (order?.stripe_invoice_id) { try { url = (await getStripe().invoices.retrieve(order.stripe_invoice_id)).hosted_invoice_url ?? null; } catch { /* fall through */ } }
  redirect(url ?? "/compte/commandes?error=invoice");
}
