"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { asService, asUser } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import { buildCheckoutParams, isManagedPaymentsConflict, withoutManagedPayments } from "@/lib/stripe/checkout";
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

  // A returning customer keeps one Stripe customer (one history, one set of saved details); a first purchase creates it.
  const known = await asUser(user.id, (q) => q.one<{ stripe_customer_id: string | null }>("select stripe_customer_id from profiles where id = $1", [user.id]));
  let url: string | null = null;
  try {
    const params = buildCheckoutParams(
      { orderId: order.order_id, title: order.title, amountCents: order.amount_cents, currency: order.currency, taxInclusive: order.tax_inclusive },
      { userId: user.id, email: user.email, stripeCustomerId: known?.stripe_customer_id ?? null },
      { siteUrl: site.url, slug: slug.data, automaticTax: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    );
    const stripe = getStripe();
    let session;
    try {
      session = await stripe.checkout.sessions.create(process.env.STRIPE_MANAGED_PAYMENTS === "off" ? withoutManagedPayments(params) : params, { idempotencyKey: `checkout-${order.order_id}` });
    } catch (e) {
      // Accounts with Stripe's Managed Payments on by default refuse some options: retry once as the seller of record.
      if (!isManagedPaymentsConflict(e)) throw e;
      session = await stripe.checkout.sessions.create(withoutManagedPayments(params), { idempotencyKey: `checkout-${order.order_id}-seller` });
    }
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
