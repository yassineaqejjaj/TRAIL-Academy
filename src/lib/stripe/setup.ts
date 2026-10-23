import { WEBHOOK_EVENTS } from "./events";

/** The few Stripe calls the setup and the readiness check need, so both can be tested without the network. */
export interface StripeLike {
  balance: { retrieve(): Promise<unknown> };
  webhookEndpoints: {
    list(p: { limit: number }): Promise<{ data: { id: string; url: string; status: string; enabled_events: string[] }[] }>;
    create(p: { url: string; enabled_events: string[]; description: string }): Promise<{ id: string; secret?: string }>;
  };
  billingPortal: {
    configurations: {
      list(p: { limit: number; is_default?: boolean }): Promise<{ data: { id: string; active?: boolean; is_default?: boolean }[] }>;
      create(p: Record<string, unknown>): Promise<{ id: string }>;
    };
  };
}

export const webhookUrl = (siteUrl: string): string => `${siteUrl.replace(/\/$/, "")}/api/stripe/webhook`;
const missingEvents = (have: string[]): string[] => WEBHOOK_EVENTS.filter((e) => !have.includes(e) && !have.includes("*"));

export interface SetupResult { webhook: "created" | "exists" | "incomplete"; webhookSecret?: string; missingEvents: string[]; portal: "created" | "exists" }

/**
 * Registers what the integration needs on the Stripe account the key belongs to (test mode for a test key):
 * the webhook endpoint with the right events, and a default customer-portal configuration. Idempotent. The signing secret
 * of a webhook is returned by Stripe only when it is created; for an existing endpoint, reveal it in the dashboard.
 */
export async function setupStripe(stripe: StripeLike, siteUrl: string): Promise<SetupResult> {
  const url = webhookUrl(siteUrl);
  const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((e) => e.url === url);
  let webhook: SetupResult["webhook"]; let webhookSecret: string | undefined; let missing: string[] = [];
  if (existing) {
    missing = missingEvents(existing.enabled_events);
    webhook = missing.length ? "incomplete" : "exists";
  } else {
    const created = await stripe.webhookEndpoints.create({ url, enabled_events: [...WEBHOOK_EVENTS], description: "TRAIL Academy : paiements et accès" });
    webhook = "created"; webhookSecret = created.secret;
  }
  const portals = await stripe.billingPortal.configurations.list({ limit: 1, is_default: true });
  let portal: SetupResult["portal"] = "exists";
  if (portals.data.length === 0) {
    await stripe.billingPortal.configurations.create({
      business_profile: { headline: "TRAIL Academy : vos informations de facturation" },
      default_return_url: `${siteUrl.replace(/\/$/, "")}/compte/commandes`,
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ["email", "name", "address", "phone", "tax_id"] },
      },
    });
    portal = "created";
  }
  return { webhook, webhookSecret, missingEvents: missing, portal };
}

export interface StripeCheck { id: string; label: string; status: "ok" | "warn" | "fail"; detail: string }

/** Read-only verification used by the admin "Mise en production" screen. */
export async function checkStripe(stripe: StripeLike, siteUrl: string): Promise<StripeCheck[]> {
  const out: StripeCheck[] = [];
  try { await stripe.balance.retrieve(); out.push({ id: "stripe_api", label: "API Stripe", status: "ok", detail: "La clé est acceptée par Stripe." }); }
  catch { return [{ id: "stripe_api", label: "API Stripe", status: "fail", detail: "Stripe refuse la clé ou est injoignable." }]; }
  try {
    const url = webhookUrl(siteUrl);
    const endpoint = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((e) => e.url === url);
    if (!endpoint) out.push({ id: "stripe_webhook_endpoint", label: "Webhook enregistré chez Stripe", status: "fail", detail: `Aucun endpoint ${url} : lancez npm run stripe:setup.` });
    else {
      const miss = missingEvents(endpoint.enabled_events);
      out.push({ id: "stripe_webhook_endpoint", label: "Webhook enregistré chez Stripe", status: endpoint.status !== "enabled" ? "fail" : miss.length ? "fail" : "ok",
        detail: endpoint.status !== "enabled" ? "L'endpoint est désactivé chez Stripe." : miss.length ? `Événements manquants : ${miss.join(", ")}.` : "Endpoint actif avec les huit événements attendus. Le secret de signature saisi dans STRIPE_WEBHOOK_SECRET doit être celui de cet endpoint." });
    }
  } catch { out.push({ id: "stripe_webhook_endpoint", label: "Webhook enregistré chez Stripe", status: "warn", detail: "Lecture impossible (la clé n'a peut-être pas le droit de lister les webhooks)." }); }
  try {
    const portal = await stripe.billingPortal.configurations.list({ limit: 1, is_default: true });
    out.push({ id: "stripe_portal", label: "Portail de facturation client", status: portal.data.length ? "ok" : "warn", detail: portal.data.length ? "Configuré." : "Non configuré : le bouton « Gérer mon moyen de paiement » échouera. Lancez npm run stripe:setup." });
  } catch { out.push({ id: "stripe_portal", label: "Portail de facturation client", status: "warn", detail: "Lecture impossible." }); }
  return out;
}
