# Tests

## Ce qui tourne

| Niveau | Commande | Contenu |
|---|---|---|
| Types, lint | `npm run typecheck` / `npm run lint` | propres |
| Unitaires, base, intégration | `npm test` | **185 tests, 17 fichiers** |
| Bout en bout | `npx playwright test` | **9 parcours** dans Chrome, sur un build de production |
| Audit | `npm audit --omit=dev` | 0 vulnérabilité |

### Détail des 185 tests

- **Base de données (PGlite, vraies migrations)** : `db`, `learning`, `commerce`, `admin`, `dev-fixture` — accès par entitlement, expiration, correction des quiz (ensemble exact, réponse libre exclue, limite de tentatives), complétion configurable, attestation unique, achat (offre fermée, déjà détenu, session falsifiée, devise, rejeu, retry après échec), remboursements et litiges, publication conditionnée, historique de prix, ordre, cycles de prérequis, accès manuels motivés, métriques, audit en écriture seule, inscriptions d'intérêt.
- **Couche d'accès sur TCP réel** (`db-layer`) : lecture publique, isolation par utilisateur, aucune fuite de rôle ni d'identité sur connexion réutilisée, rôle de confiance, tables d'auth inaccessibles, annulation sur erreur, paramètres liés, dates en ISO, mode connexion unique.
- **Authentification** (`auth`) : inscription + trigger de profil, Argon2id, e-mail obligatoire, cookie `HttpOnly`, mêmes réponses pour compte inconnu, longueur minimale, réinitialisation qui révoque les sessions.
- **Stripe** (`stripe`) : signatures réelles (valide, absente, mauvais secret, corps altéré), normalisation, nouvel essai sur échec, e-mails isolés.
- **Stockage et vidéo** (`storage`, `stream-gateway`) : clés, politique POST (taille/type/clé), liens de 60 s, jetons (signature, expiration, média), réécriture de playlists, traversée de chemin, plages d'octets.
- **Reste** : catalogue et mapping base→public, conseiller déterministe, schémas de formulaires, Markdown sûr, navigation de leçons, contact et inscriptions d'intérêt.

**Tests par mutation (manuels)** : pour les règles critiques (correction des quiz, garde administrateur, vérification de session Stripe, révocation au remboursement, historique des prix, complétion, préparation à la publication), la règle a été volontairement cassée et la suite a bien échoué, puis a été restaurée.

### Les 9 parcours Playwright

visiteur (catalogue, module non achetable) · conseiller · inscription d'intérêt avec consentement · inscription, refus avant vérification, connexion · lecteur fermé sans accès · parcours apprenant complet (leçons, notes, progression persistante après reconnexion, quiz, livrable) · administrateur (10 écrans, relecture, attestation vérifiable publiquement, journal) · création et publication d'un module avec contrôle de complétude · contrôles d'accès (apprenant refusé en admin, leçon d'autrui, API sans session).

Ils tournent contre une pile démarrée séparément. Localement :

```bash
npm run db:dev &                                   # PostgreSQL embarqué
npm run db:migrate -- --seed --fixture
# variables : voir .github/workflows/ci.yml (DATABASE_SINGLE_CONNECTION, EMAIL_TRANSPORT=console, AUTH_RATE_LIMIT=off…)
npm run build && npx next start -p 3105 &
E2E_CHANNEL=chrome npx playwright test             # réutilise Google Chrome ; sans E2E_CHANNEL : Chromium de Playwright
```

L'e-mail de confirmation est marqué vérifié par SQL dans ces tests (le lien lui-même est couvert par le test d'authentification). L'accès payant est arrangé par SQL : la fonction qui le provisionne est testée sur la base, **le paiement Stripe ne l'est pas**.

## Ce qui n'est pas testé

Stripe réel ; PostgreSQL de production ; MinIO/S3 réel (envoi, CORS, téléchargement) et lecture HLS par `hls.js` via la passerelle ; SMTP réel ; Google OAuth ; déploiement Vercel/Railway ; exécution de la CI sur GitHub ; `docker-compose.yml` (pas de démon Docker à la création) ; accessibilité (audit automatisé) ; performance (Lighthouse, Core Web Vitals) ; charge.

## Pièges rencontrés (utiles à savoir)

- La base embarquée n'a qu'un backend : sans `DATABASE_SINGLE_CONNECTION=true`, deux connexions peuvent exécuter des requêtes dans la transaction d'un utilisateur et faire échouer une lecture de session. Un vrai PostgreSQL n'a pas ce problème.
- Les limiteurs en mémoire gardent leur état entre deux exécutions sur le même serveur : relancer le serveur avant chaque exécution des e2e.
- Le cache de pages (ISR) de Next.js est écrit sur disque : reconstruire (`next build`) après avoir réinitialisé la base avant de prendre des captures.
