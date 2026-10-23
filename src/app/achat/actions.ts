"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import { stripeMode } from "@/lib/stripe/guard";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

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

  if (!rateLimit(`checkout:${user.id}`, 10, 10 * 60_000)) back("rate_limited");
  if (!stripeMode(process.env).ok) back("payments_unavailable");

  const db = createServiceClient();
  const { data: order, error } = await db.rpc("create_checkout_order", { p_user: user.id, p_product_slug: slug.data });
  if (error) back(ERRORS[Object.keys(ERRORS).find((k) => error.message.includes(k)) ?? ""] ?? "failed");
  const o = order as { order_id: string; amount_cents: number; currency: string; tax_inclusive: boolean; title: string };

  let url: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: o.order_id,
      customer_email: user.email,
      customer_creation: "always",
      line_items: [{ quantity: 1, price_data: { currency: o.currency.toLowerCase(), unit_amount: o.amount_cents, tax_behavior: o.tax_inclusive ? "inclusive" : "exclusive", product_data: { name: o.title } } }],
      allow_promotion_codes: true,
      invoice_creation: { enabled: true },
      // Tax is computed by Stripe Tax when enabled; rates are never hard-coded here.
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
      metadata: { order_id: o.order_id, user_id: user.id },
      payment_intent_data: { metadata: { order_id: o.order_id, user_id: user.id } },
      locale: "fr",
      success_url: `${site.url}/achat/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site.url}/achat/${slug.data}?canceled=1`,
    }, { idempotencyKey: `checkout-${o.order_id}` });
    await db.rpc("attach_checkout_session", { p_order: o.order_id, p_session: session.id });
    url = session.url;
  } catch { /* fall through to error redirect */ }
  if (!url) back("failed");
  redirect(url!);
}

export async function openBillingPortal() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (!data?.stripe_customer_id || !stripeMode(process.env).ok) redirect("/compte/commandes?error=portal");
  let url: string | null = null;
  try { url = (await getStripe().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${site.url}/compte/commandes` })).url; } catch { /* portal not configured in Stripe */ }
  redirect(url ?? "/compte/commandes?error=portal");
}

export async function openInvoice(formData: FormData) {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(formData.get("orderId"));
  if (!id.success) redirect("/compte/commandes");
  const supabase = await createClient();
  // RLS: only the owner can read the order, so the invoice id is never exposed to others.
  const { data } = await supabase.from("orders").select("stripe_invoice_id").eq("id", id.data).eq("user_id", user.id).maybeSingle();
  let url: string | null = null;
  if (data?.stripe_invoice_id) { try { url = (await getStripe().invoices.retrieve(data.stripe_invoice_id)).hosted_invoice_url ?? null; } catch { /* fall through */ } }
  redirect(url ?? "/compte/commandes?error=invoice");
}
