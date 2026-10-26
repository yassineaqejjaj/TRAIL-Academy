import { stripeMode } from "./stripe/guard";

export type Status = "ok" | "warn" | "fail" | "info";
export interface Check { id: string; group: string; label: string; status: Status; detail: string }

type Env = Record<string, string | undefined>;

/** Latest migration the code expects; tests keep it equal to the newest file in db/migrations. */
export const EXPECTED_MIGRATION = "0012_business_profiles.sql";

const set = (v: string | undefined) => Boolean(v && v.trim());
const weak = /^(change|changeme|secret|ci-only|test|dev|example|placeholder)/i;

/**
 * Configuration checks that need nothing but environment variables (so they run in `npm run check:env` before a deploy
 * and on the admin "Mise en production" screen). They report what is configured; they cannot prove a provider works:
 * the live checks and the real-trial checklist in docs/GO_LIVE.md do that.
 */
export function envChecks(env: Env): Check[] {
  const c: Check[] = [];
  const add = (group: string, id: string, label: string, status: Status, detail: string) => c.push({ id, group, label, status, detail });

  const site = env.NEXT_PUBLIC_SITE_URL ?? "";
  const local = /localhost|127\.0\.0\.1|\.local\b/.test(site);
  add("Site", "site_url", "Adresse publique du site", !set(site) ? "fail" : local || !site.startsWith("https://") ? "fail" : "ok",
    !set(site) ? "NEXT_PUBLIC_SITE_URL est vide." : local || !site.startsWith("https://") ? `« ${site} » n'est pas une adresse HTTPS publique (cookies sécurisés, HSTS, liens des e-mails).` : site);
  add("Site", "contact_email", "E-mail de contact public", set(env.NEXT_PUBLIC_CONTACT_EMAIL) ? "ok" : "warn", set(env.NEXT_PUBLIC_CONTACT_EMAIL) ? "Renseigné." : "NEXT_PUBLIC_CONTACT_EMAIL est vide : aucune adresse n'est affichée aux visiteurs.");
  add("Site", "leads_email", "Destinataire des demandes (contact, devis)", set(env.LEADS_TO_EMAIL) ? "ok" : "fail", set(env.LEADS_TO_EMAIL) ? "Renseigné." : "LEADS_TO_EMAIL est vide : les demandes de devis ne seront reçues par personne.");

  add("Base de données", "database", "DATABASE_URL", set(env.DATABASE_URL) ? "ok" : "fail", set(env.DATABASE_URL) ? "Renseigné." : "Sans base de données, le site fonctionne en lecture seule sur le catalogue statique.");
  add("Base de données", "single_connection", "Connexion unique (PGlite)", env.DATABASE_SINGLE_CONNECTION === "true" ? "fail" : "ok", env.DATABASE_SINGLE_CONNECTION === "true" ? "DATABASE_SINGLE_CONNECTION=true est réservé à la base embarquée de développement." : "Désactivé.");

  const secret = env.BETTER_AUTH_SECRET ?? "";
  add("Authentification", "auth_secret", "BETTER_AUTH_SECRET", secret.length >= 32 && !weak.test(secret) ? "ok" : "fail", secret.length >= 32 && !weak.test(secret) ? "Long et non trivial." : "Absent, trop court (< 32 caractères) ou de type exemple. Générer : openssl rand -base64 32.");
  add("Authentification", "auth_rate_limit", "Limitation de débit des connexions", env.AUTH_RATE_LIMIT === "off" ? "fail" : "ok", env.AUTH_RATE_LIMIT === "off" ? "AUTH_RATE_LIMIT=off est réservé aux tests de bout en bout." : "Active.");
  add("Authentification", "google", "Connexion Google", set(env.GOOGLE_CLIENT_ID) && set(env.GOOGLE_CLIENT_SECRET) ? "info" : "info", set(env.GOOGLE_CLIENT_ID) && set(env.GOOGLE_CLIENT_SECRET) ? "Configurée (non testée ici)." : "Non configurée (facultatif).");

  const mailOk = env.EMAIL_TRANSPORT !== "console" && set(env.SMTP_URL) && set(env.EMAIL_FROM);
  add("E-mail", "smtp", "Envoi d'e-mails (SMTP)", mailOk ? "ok" : "fail", mailOk ? "SMTP_URL et EMAIL_FROM renseignés. Vérifiez SPF, DKIM et DMARC de votre domaine." : "SMTP_URL / EMAIL_FROM manquants ou EMAIL_TRANSPORT=console : sans e-mail, personne ne peut confirmer son compte.");

  const s3 = set(env.S3_ENDPOINT) && set(env.S3_BUCKET) && set(env.S3_ACCESS_KEY_ID) && set(env.S3_SECRET_ACCESS_KEY);
  add("Stockage et vidéo", "s3", "Stockage d'objets S3", s3 ? "ok" : "fail", s3 ? "Renseigné." : "S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID ou S3_SECRET_ACCESS_KEY manquant : ni livrables ni vidéos.");
  const pub = env.S3_PUBLIC_ENDPOINT ?? env.S3_ENDPOINT ?? "";
  add("Stockage et vidéo", "s3_public", "Adresse du stockage joignable par les navigateurs", /^https:\/\//.test(pub) && !/localhost|127\.0\.0\.1|\.railway\.internal/.test(pub) ? "ok" : s3 ? "fail" : "info",
    /^https:\/\//.test(pub) ? pub : "Les envois directs depuis le navigateur exigent une adresse HTTPS publique (S3_PUBLIC_ENDPOINT) et une règle CORS pour le site.");
  const gw = set(env.STREAM_GATEWAY_URL) && (env.STREAM_SIGNING_SECRET ?? "").length >= 32;
  add("Stockage et vidéo", "gateway", "Passerelle de streaming HLS", gw ? "ok" : "fail", gw ? "STREAM_GATEWAY_URL et STREAM_SIGNING_SECRET (≥ 32 caractères) renseignés." : "STREAM_GATEWAY_URL absent ou STREAM_SIGNING_SECRET trop court : les leçons vidéo ne pourront pas être lues.");

  const sm = stripeMode(env);
  add("Paiement", "stripe_key", "Clé Stripe", sm.ok ? "ok" : sm.reason === "not_configured" ? "fail" : "fail",
    sm.ok ? (sm.mode === "test" ? "Mode TEST : aucun paiement réel n'est possible." : "Mode LIVE actif : les paiements sont réels.") : sm.reason === "live_blocked" ? "Clé live bloquée : ALLOW_LIVE_PAYMENTS et LEGAL_REVIEW_COMPLETED doivent tous deux valoir true." : sm.reason === "invalid_key" ? "STRIPE_SECRET_KEY n'a pas le format attendu." : "STRIPE_SECRET_KEY est vide : l'achat est fermé.");
  add("Paiement", "stripe_webhook", "Secret du webhook Stripe", set(env.STRIPE_WEBHOOK_SECRET) && /^whsec_/.test(env.STRIPE_WEBHOOK_SECRET ?? "") ? "ok" : "fail", set(env.STRIPE_WEBHOOK_SECRET) ? "Renseigné (le point d'entrée /api/stripe/webhook doit être déclaré chez Stripe)." : "Sans webhook, une commande payée ne donne jamais accès au contenu.");
  const testKeyWithLiveFlags = sm.ok && sm.mode === "test" && (env.ALLOW_LIVE_PAYMENTS === "true" || env.LEGAL_REVIEW_COMPLETED === "true");
  add("Paiement", "live_flags", "Garde-fous du mode live", testKeyWithLiveFlags ? "warn" : "ok", testKeyWithLiveFlags ? "Les drapeaux live sont activés alors que la clé est en mode test." : "Cohérents.");

  add("Exploitation", "cron", "CRON_SECRET (expiration des accès)", set(env.CRON_SECRET) && (env.CRON_SECRET ?? "").length >= 16 ? "ok" : "fail", set(env.CRON_SECRET) ? "Renseigné." : "Sans CRON_SECRET, la tâche quotidienne /api/cron/expire est refusée et les accès expirés ne sont pas marqués.");
  return c;
}

export const worst = (checks: Check[]): Status => (checks.some((x) => x.status === "fail") ? "fail" : checks.some((x) => x.status === "warn") ? "warn" : "ok");
