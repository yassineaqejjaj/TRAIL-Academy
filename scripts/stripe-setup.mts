/**
 * Prepares your Stripe account for TRAIL Academy: registers the webhook endpoint (with the right events) and the customer portal.
 *   STRIPE_SECRET_KEY=sk_test_… NEXT_PUBLIC_SITE_URL=https://votre-domaine npm run stripe:setup
 * Run it with a TEST key first. A live key is refused unless you also pass --live. The key is read from the environment only,
 * never written anywhere. The webhook signing secret is printed ONCE (Stripe reveals it only at creation): put it in STRIPE_WEBHOOK_SECRET.
 */
import Stripe from "stripe";
import { setupStripe, type StripeLike } from "../src/lib/stripe/setup.ts";

const key = process.env.STRIPE_SECRET_KEY ?? "";
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
if (!/^(sk|rk)_(test|live)_/.test(key)) { console.error("STRIPE_SECRET_KEY manquante ou invalide (attendu : sk_test_… ou rk_test_…)."); process.exit(1); }
if (/_live_/.test(key) && !process.argv.includes("--live")) { console.error("Clé LIVE refusée : testez d'abord avec une clé de test. Ajoutez --live pour confirmer."); process.exit(1); }
if (!/^https:\/\//.test(site) || /localhost|127\.0\.0\.1/.test(site)) { console.error("NEXT_PUBLIC_SITE_URL doit être l'adresse HTTPS publique du site (Stripe doit pouvoir l'appeler)."); process.exit(1); }

const result = await setupStripe(new Stripe(key) as unknown as StripeLike, site);
console.info(`Mode : ${key.includes("_live_") ? "LIVE" : "test"}`);
console.info(`Webhook : ${result.webhook}${result.missingEvents.length ? ` (événements manquants : ${result.missingEvents.join(", ")} : corrigez-les dans le tableau de bord Stripe)` : ""}`);
console.info(`Portail client : ${result.portal}`);
if (result.webhookSecret) console.info(`\nSecret de signature du webhook (à copier dans STRIPE_WEBHOOK_SECRET, il ne sera plus affiché) :\n${result.webhookSecret}`);
else if (result.webhook !== "created") console.info("\nLe webhook existait déjà : son secret ne peut pas être relu par l'API. Révélez-le dans Stripe → Développeurs → Webhooks, ou supprimez l'endpoint et relancez cette commande.");
