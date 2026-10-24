/**
 * Local purchase verification against Stripe TEST mode. Needs the stack running locally (see TESTING.md) with
 * STRIPE_SECRET_KEY=sk_test_… and STRIPE_WEBHOOK_SECRET=whsec_local_verification_secret_only set on the app, then:
 *   DATABASE_URL=… STRIPE_SECRET_KEY=sk_test_… npx tsx scripts/verify-stripe-local.mts
 * It signs up a throw-away learner, starts a purchase (a REAL Stripe test Checkout Session is created and Stripe's page is reached),
 * then replays signed webhook events built from that real session. It never fills in a card form: paying on Stripe's page stays manual.
 */
import { chromium } from "@playwright/test";
import pg from "pg";
import Stripe from "stripe";

const BASE = "http://localhost:3105";
const LOCAL_SECRET = "whsec_local_verification_secret_only";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const say = (ok: boolean, msg: string) => { console.log(`${ok ? "✔" : "✘"} ${msg}`); if (!ok) process.exitCode = 1; };

await db.query("update products set active = true where slug = 'module-prompt-engineering'");
const email = `stripe.${Date.now()}@example.test`;
const browser = await chromium.launch({ channel: "chrome" });
const page = await (await browser.newContext({ baseURL: BASE, locale: "fr-FR" })).newPage();

// 1. A learner signs up and signs in (local app, local database).
await page.goto("/inscription");
await page.getByLabel("Nom complet").fill("Testeur Paiement");
await page.getByLabel("E-mail").fill(email);
await page.getByLabel(/Mot de passe/).fill("correct horse battery staple");
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: "Créer mon compte" }).click();
await page.getByText("Vérifiez votre boîte mail").waitFor();
await db.query("update auth.users set email_verified = true where email = $1", [email]);
await page.goto("/connexion");
await page.getByLabel("E-mail").first().fill(email);
await page.getByLabel("Mot de passe", { exact: true }).fill("correct horse battery staple");
await page.getByRole("button", { name: "Se connecter" }).click();
await page.waitForURL(/\/compte/);

// 2. Buying creates a pending order, then a REAL Stripe Checkout Session (test mode) and redirects to Stripe.
await page.goto("/achat/module-prompt-engineering");
await page.getByRole("button", { name: /Payer|Acheter|Continuer/ }).first().click();
await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
say(true, `redirigé vers Stripe Checkout (${new URL(page.url()).host})`);
const order = (await db.query("select o.id, o.status, o.stripe_checkout_session_id sid, o.total_cents from orders o join auth.users u on u.id = o.user_id where u.email = $1 order by o.created_at desc limit 1", [email])).rows[0];
say(order?.status === "pending" && /^cs_test_/.test(order.sid), `commande en attente liée à une session Stripe de test (${order?.sid?.slice(0, 18)}…)`);
const session = await stripe.checkout.sessions.retrieve(order.sid);
say(session.livemode === false && session.amount_total === 19900 && session.client_reference_id === order.id, `session Stripe : mode test, 199,00 €, référence = commande (${session.amount_total})`);
say(session.automatic_tax?.enabled === true, "Stripe Tax actif (Managed Payments)");
// The card form is NOT filled here: payment on Stripe's page is left to a human.

// 3. Webhook: a checkout.session.completed built from the REAL session, signed with the local secret, sent to the local endpoint.
const paid = { ...session, payment_status: "paid", status: "complete", payment_intent: "pi_local_verification", customer: "cus_local_verification" };
const event = { id: `evt_local_${Date.now()}`, object: "event", type: "checkout.session.completed", api_version: null, created: Math.floor(Date.now() / 1000), livemode: false, pending_webhooks: 1, request: { id: null, idempotency_key: null }, data: { object: paid } };
const send = async (e: object, secret = LOCAL_SECRET) => {
  const payload = JSON.stringify(e);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": header }, body: payload });
};
say((await send(event, "whsec_wrong_secret")).status === 400, "signature invalide refusée (400)");
say((await send(event)).status === 200, "événement signé accepté (200)");
await page.goto("/achat/succes?session_id=" + order.sid);
await page.getByText("Paiement confirmé").waitFor({ timeout: 10_000 }).then(() => say(true, "page « Paiement confirmé »"), () => say(false, "page « Paiement confirmé » absente"));
const after = (await db.query("select status from orders where id = $1", [order.id])).rows[0];
const ent = (await db.query("select e.status from entitlements e join auth.users u on u.id = e.user_id join courses c on c.id = e.course_id where u.email = $1 and c.code = 'M4'", [email])).rows[0];
say(after.status === "paid" && ent?.status === "active", `commande payée et accès au module ouvert (${after.status}/${ent?.status})`);
say((await send(event)).status === 200 && (await db.query("select count(*)::int n from entitlements e join auth.users u on u.id = e.user_id where u.email = $1", [email])).rows[0].n === 1, "événement rejoué : aucun doublon d'accès");
await page.goto("/compte/commandes");
await page.getByText(/Payée/).first().waitFor({ timeout: 10_000 }).then(() => say(true, "« Mes commandes » : commande payée"), () => say(false, "commande payée absente de « Mes commandes »"));

// 4. Full refund event: access is withdrawn.
const refund = { ...event, id: `evt_local_r_${Date.now()}`, type: "charge.refunded", data: { object: { id: "ch_local_verification", object: "charge", payment_intent: "pi_local_verification", amount: 19900, amount_captured: 19900, amount_refunded: 19900 } } };
say((await send(refund)).status === 200, "remboursement total reçu (200)");
const revoked = (await db.query("select e.status from entitlements e join auth.users u on u.id = e.user_id join courses c on c.id = e.course_id where u.email = $1 and c.code = 'M4'", [email])).rows[0];
const orderAfter = (await db.query("select status from orders where id = $1", [order.id])).rows[0];
say(orderAfter.status === "refunded" && revoked?.status === "revoked", `commande remboursée, accès retiré (${orderAfter.status}/${revoked?.status})`);

await stripe.checkout.sessions.expire(order.sid).catch(() => undefined);
await browser.close(); await db.end();
