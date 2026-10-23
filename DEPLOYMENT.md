# Déploiement — Vercel + Railway

> **Aucun déploiement n'a été effectué** et rien de ce document n'a été exécuté contre Vercel ou Railway. Il décrit la cible et les points à vérifier. Ne pas ouvrir les paiements réels avant la revue juridique (voir `SECURITY.md`).

| Service | Hébergeur | Rôle |
|---|---|---|
| Application Next.js | Vercel | pages, actions serveur, API, tâche planifiée `/api/cron/expire` |
| PostgreSQL | Railway (plugin) | base unique |
| MinIO | Railway (image `minio/minio` + volume) | fichiers privés, vidéos HLS |
| Passerelle de streaming | Railway (`services/stream-gateway`) | HLS sur jeton signé |
| SMTP | au choix (relais transactionnel, ou Postal auto-hébergé) | e-mails |

Choisir des régions proches : base Railway en Europe de l'Ouest et fonctions Vercel dans la même zone (réglage de région de fonction dans Vercel).

## 1. Railway

1. **PostgreSQL** : ajouter le plugin. Le compte `postgres` est super-utilisateur, ce que les migrations exigent (création des rôles `anon`, `authenticated`, `service_role`). Vercel ne voit pas le réseau privé de Railway : utiliser l'URL du **proxy TCP public** et `DATABASE_SSL=require` (certificat auto-signé). Pour de nombreux visiteurs, placer **PgBouncer** devant (service Railway) ou garder `DATABASE_POOL_MAX` petit : chaque instance serverless ouvre son propre pool.
2. **MinIO** : service depuis l'image `minio/minio`, commande `server /data --console-address ":9001"`, volume monté sur `/data`, variables `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` (mots de passe forts), `MINIO_API_CORS_ALLOW_ORIGIN=https://votre-domaine`. Exposer le port 9000 par un domaine public (les navigateurs envoient et téléchargent directement) ; créer le bucket privé `trail` (`mc mb`). Utiliser de préférence une clé d'accès dédiée plutôt que le compte racine.
3. **Passerelle** : nouveau service, *Root Directory* = `services/stream-gateway` (Dockerfile + `railway.json` fournis, vérification `/healthz`). Variables : `S3_ENDPOINT` (URL interne MinIO), `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `STREAM_SIGNING_SECRET` (même valeur que l'application), `SITE_ORIGIN=https://votre-domaine`. Exposer un domaine public → `STREAM_GATEWAY_URL`.

## 2. Migrations

Appliquer `db/migrations/` à chaque déploiement qui en ajoute, **avant** de mettre l'application à jour :

```bash
DATABASE_URL="<url publique>" DATABASE_SSL=require npm run db:migrate -- --seed   # --seed : uniquement sur une base vide
```

ou le workflow GitHub **Apply database migrations** (déclenchement manuel, secrets `DATABASE_URL` et `DATABASE_SSL`, environnement `production` à protéger par des relecteurs). L'exécuteur est rejouable et transactionnel (un fichier = une transaction).

## 3. Vercel

Importer le dépôt (framework détecté, `vercel.json` déclare la tâche planifiée). Variables (voir `.env.example`) :

| Groupe | Variables |
|---|---|
| Site | `NEXT_PUBLIC_SITE_URL`, `BETTER_AUTH_URL` (même valeur), `NEXT_PUBLIC_CONTACT_EMAIL` |
| Base | `DATABASE_URL`, `DATABASE_SSL=require`, `DATABASE_POOL_MAX`, `DATABASE_AUTH_POOL_MAX` |
| Auth | `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `GOOGLE_CLIENT_ID/SECRET` (optionnels) |
| SMTP | `SMTP_URL`, `EMAIL_FROM`, `LEADS_TO_EMAIL` |
| Stockage | `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |
| Vidéo | `STREAM_GATEWAY_URL`, `STREAM_SIGNING_SECRET` |
| Paiement | `STRIPE_SECRET_KEY` (**test**), `STRIPE_WEBHOOK_SECRET`, `ALLOW_LIVE_PAYMENTS=false`, `LEGAL_REVIEW_COMPLETED=false`, `STRIPE_AUTOMATIC_TAX` |
| Tâches | `CRON_SECRET` (Vercel l'envoie en `Authorization: Bearer`) |

Ne **jamais** définir `DATABASE_SINGLE_CONNECTION`, `AUTH_RATE_LIMIT=off` ni `EMAIL_TRANSPORT=console` en production.

Google : URI de redirection autorisée `https://votre-domaine/api/auth/callback/google`.

## 4. Premier administrateur

S'inscrire sur le site, confirmer l'e-mail, puis : `DATABASE_URL=<url publique> DATABASE_SSL=require npm run admin:create -- vous@exemple.fr`.

## 5. Stripe (mode test d'abord)

Webhook vers `https://votre-domaine/api/stripe/webhook` avec : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. Copier le secret de signature dans `STRIPE_WEBHOOK_SECRET`. Localement : `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Tester avec les cartes de test (succès, 3-D Secure, refus), les remboursements et litiges depuis le tableau de bord, et le « renvoi » d'un événement pour confirmer l'idempotence. Les prix sont transmis en `price_data` depuis la base : aucune synchronisation de catalogue Stripe n'est nécessaire.

## 6. Vidéo

Deux services Railway, tous deux avec le même bucket privé :

- `stream-gateway` (`services/stream-gateway`) : sert les playlists et segments aux porteurs d'un jeton signé.
- `video-worker` (`services/video-worker`, Dockerfile avec **ffmpeg**, aucun port public) : variables `DATABASE_URL` (+ `DATABASE_SSL`), `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Il lit la file `video_assets`, encode en HLS adaptatif (360/720/1080 p selon la source, sans agrandissement), dépose le résultat dans `video/<id>/` et rattache la vidéo à la leçon.

Flux : **Administration → leçon → Vidéo → Envoyer** (envoi direct navigateur → bucket, 4 Go max.) ; le statut passe de « en attente » à « prête » (ou « échec », avec bouton *Relancer*). Prérequis : règle CORS du bucket autorisant `POST` depuis le site. `scripts/encode-hls.sh` reste disponible pour un encodage manuel. Détails : `CONTENT_GUIDE.md`.

## 7. Sauvegardes et reprise

- PostgreSQL : sauvegardes de volume Railway **et** export logique planifié avec `scripts/backup.sh` (`pg_dump` au format custom, copie facultative vers un stockage distinct ; jamais d'artefact public : un dump contient des données personnelles). Le script n'a pas encore été exécuté. **Tester une restauration** dans une base vierge avant le lancement.
- MinIO : `mc mirror` périodique vers un second stockage ; les objets sont reproductibles si les sources vidéo sont conservées.
- Conserver hors ligne : secrets (`BETTER_AUTH_SECRET`, `STREAM_SIGNING_SECRET`), sources vidéo.

## 8. Supervision (à brancher — non fait)

Suggestions open source : GlitchTip (compatible Sentry) pour les erreurs, Plausible ou Umami pour l'audience (avec consentement), OpenTelemetry pour les traces ; alertes sur le webhook Stripe (échecs) et la base.

## Liste de contrôle avant ouverture

- [ ] Migrations appliquées, restauration testée · [ ] administrateur créé · [ ] SMTP réel testé (confirmation, réinitialisation) · [ ] envoi de fichier et lecture vidéo testés de bout en bout · [ ] webhook Stripe testé en mode test (paiement, rejeu, remboursement, litige) · [ ] audit d'accessibilité · [ ] pages légales rédigées et validées · [ ] revue juridique (CGV, rétractation, formation professionnelle, taxes) **avant** `LEGAL_REVIEW_COMPLETED=true` et toute clé réelle · [ ] CSP et supervision.
