# TRAIL Academy

**T**raining **R**oadmap for **A**pplied **I**ntelligence & **L**eadership — *Learn AI. Apply AI. Lead with AI.*

Plateforme de formation professionnelle à l'intelligence artificielle, pensée pour **un formateur unique** qui l'exploite sans développeur : catalogue de 18 modules, parcours, lecteur de cours, quiz, livrables relus, attestations vérifiables, paiement Stripe, espace d'administration et CMS. Interface en français, architecture prête pour l'anglais.

> **État du projet : phases A à D construites** (fondations, apprentissage, commerce, administration). Les phases E (entreprises) et F (durcissement) ne sont pas commencées.
> **Aucune intégration externe n'a été testée en conditions réelles** (Supabase hébergé, Stripe, Resend, Mux) : voir [Ce qui est vérifié, ce qui ne l'est pas](#ce-qui-est-vérifié-ce-qui-ne-lest-pas).
> **Les paiements en production sont bloqués par conception** tant qu'une revue juridique n'est pas faite.

---

## Sommaire

1. [Présentation fonctionnelle](#1-présentation-fonctionnelle)
2. [Présentation technique](#2-présentation-technique)
3. [Démarrage rapide](#3-démarrage-rapide)
4. [Ce qui est vérifié, ce qui ne l'est pas](#ce-qui-est-vérifié-ce-qui-ne-lest-pas)
5. [Feuille de route](#5-feuille-de-route)
6. [Documentation détaillée](#6-documentation-détaillée)
7. [Avertissement légal](#7-avertissement-légal)

---

## 1. Présentation fonctionnelle

### 1.1 Offre

| Offre | Contenu | Prix | Accès |
|---|---|---|---|
| Module Standard | 1 module (14 modules concernés) | 199 € TTC | 12 mois |
| Module Avancé | Vibe Coding (M6), RAG (M11), Agentic AI (M12), AI Evaluation & Observability (M17) | 299 € TTC | 12 mois |
| Product Manager Augmenté | 9 modules : M3, M4, M5, M6, M7, M9, M14, M16, M18 | 990 € TTC | 18 mois |
| AI Product Manager | 13 modules : M1, M2, M3, M8, M10–M18 | 1 490 € TTC | 18 mois |
| AI Mastery | les 18 modules et les deux parcours | 1 990 € TTC | 18 mois |
| AI Mastery Mentored | 18 modules + accompagnement (offre fermée tant que l'accompagnement n'est pas défini) | 2 990 € TTC | 18 mois |
| Team 5 | 5 licences AI Mastery | 7 500 € HT | 12 mois |
| Team 20 | 20 licences AI Mastery | 24 000 € HT | 12 mois |
| Private Workshop | journée de formation privée | de 2 500 à 3 500 € HT | — |
| Enterprise Custom | programme personnalisé | sur devis | — |

Les prix sont des **données** modifiables dans l'administration (historique conservé). Les **prix fondateurs** de lancement (149 / 229 / 790 / 1 190 / 1 590 / 2 490 €) sont des propositions à tester, uniquement sur des offres réellement disponibles et pour une période définie : ils ne sont pas appliqués automatiquement (voir [`PRODUCT.md`](PRODUCT.md)).

**Règles métier clés**
- Les 18 modules sont visibles publiquement, mais **seuls les modules publiés et validés peuvent être achetés**. Les autres affichent « Bientôt disponible ».
- Un contenu déjà acquis **n'est jamais refacturé** : acheter un parcours qui contient un module déjà détenu prolonge l'accès, sans doublon.
- Stripe reste la source de vérité du paiement, des taxes et des factures.
- Les attestations sont **privées et vérifiables** ; elles ne sont **ni une certification d'État ni une qualification RNCP**.
- Aucun témoignage, avis, chiffre ou logo n'est inventé : un témoignage ne se publie qu'avec une référence de consentement.

### 1.2 Catalogue

18 modules en 4 phases (Fondations IA · Productivité & Construction · Produit & Leadership · Systèmes & Ingénierie), avec prérequis, ordre recommandé, niveau, durée estimée, outils, objectifs mesurables et livrable. Trois modules sont les premiers emplacements de contenu réel : **Prompt Engineering (M4)**, **Context Engineering (M5)**, **Vibe Coding (M6)**. Les autres restent « bientôt disponibles ». Le module M7 utilise l'intitulé officiel de BMAD (*Breakthrough Method for Agile AI-Driven Development*, vérifié sur le dépôt officiel).

### 1.3 Parcours par profil

**Visiteur**
- Accueil, catalogue (recherche, phase, niveau, parcours, disponibilité, durée), fiche formation, parcours avec tableau comparatif, tarifs, page entreprises avec demande de devis, formateur, ressources/blog, pages légales (modèles).
- **Conseiller de parcours** : questionnaire de 6 questions, recommandation **déterministe et expliquée** (règles éditables dans `src/lib/advisor/rules.ts`, aucune IA requise).
- Inscription « me prévenir » à la sortie d'un module, newsletter (consentement explicite).

**Apprenant**
- Inscription / connexion (e-mail + mot de passe, vérification d'e-mail, réinitialisation).
- Tableau de bord : « reprendre où vous en étiez », formations avec progression et date d'expiration, parcours actif, livrables et attestations.
- **Lecteur de cours** : vidéo en streaming signé, vitesse de lecture, sous-titres, chapitres, transcription, ressources, notes horodatées, signets, reprise de lecture, plan du cours, navigation entre leçons, accessible sur mobile.
- **Quiz** : choix unique, choix multiples, réponse libre ; correction automatique des questions objectives, seuil de réussite configurable, historique des tentatives, limite de tentatives.
- **Livrables** : réponse écrite et/ou fichier (types et taille contrôlés), stockage privé, relecture humaine avec retour.
- **Complétion** : leçons obligatoires + quiz + livrables acceptés (règles configurables par module) → **attestation** avec code de vérification public (`/verification/<code>`), imprimable.
- Achat Stripe, historique des commandes, factures, portail de facturation.

**Formateur / administrateur (compte unique)**
- Tableau de bord : revenu net, achats, remboursements, litiges, inscriptions, apprenants actifs, complétions, produits les plus achetés, entonnoir de commande, livrables à relire.
- Modules : création/édition, prérequis, règles de complétion, SEO, chapitres et leçons (réordonnables), ressources, sous-titres, quiz, devoirs, aperçu, **publication conditionnée par un contrôle de complétude**.
- Parcours, produits et prix (avec historique), coupons, commandes (demande de remboursement), apprenants (octroi/retrait d'accès avec motif obligatoire), relecture des livrables, **journal d'audit** non modifiable.
- CMS : bandeau d'accueil, profil du formateur, FAQ, témoignages vérifiés, articles (SEO, formations liées), textes légaux.

**Responsable d'équipe (entreprises)** : modèle de données et règles d'accès prêts (organisations, licences, allocations, RLS) ; **interface non construite** (phase E).

### 1.4 Parcours d'achat

```
Fiche module publié → connexion → /achat/<offre> → Stripe Checkout (mode test)
      │                                                    │
      │            (redirection = affichage seulement)     ▼
      ▼                                         Webhook Stripe SIGNÉ
 /achat/succes ◄── "confirmation en cours" ◄─── vérifié + idempotent
                                                           │
                                                           ▼
                                    commande « payée » + accès activé + e-mail
```

L'accès payant n'est **jamais** accordé depuis la redirection du navigateur : uniquement par le webhook vérifié.

---

## 2. Présentation technique

### 2.1 Stack

| Couche | Choix |
|---|---|
| Front + serveur | Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript, Tailwind CSS 4, lucide-react, polices Inter + Sora |
| Données | PostgreSQL (Supabase), migrations SQL versionnées, Row Level Security |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Stockage | Supabase Storage (buckets privés) |
| Paiement | Stripe Checkout + webhooks (SDK `stripe` 23) |
| Vidéo | Mux (URL signées, JWT RS256) via un adaptateur ; hls.js côté client |
| E-mail | Resend (adaptateur) |
| Validation | Zod 4 |
| Contenu | `react-markdown` (HTML brut jamais rendu) |
| Tests | Vitest 5, React Testing Library, PGlite (Postgres embarqué), Playwright (écrit, non exécuté) |

### 2.2 Architecture

Application Next.js unique, sans microservice. **Les règles métier sensibles vivent dans PostgreSQL**, sous forme de fonctions `SECURITY DEFINER`, afin d'être transactionnelles, impossibles à contourner depuis le client et testables sans réseau.

```
src/
  app/                 routes (pages serveur par défaut)
    pages publiques    /, /formations, /parcours, /tarifs, /entreprise, /formateur,
                       /ressources, /conseiller, /legal/[slug], /verification/[code]
    achat/             récapitulatif, succès (affichage seul)
    compte/            tableau de bord, commandes
    apprendre/         lecteur, quiz, livrables
    admin/             administration (cours, parcours, produits, coupons, commandes,
                       apprenants, devoirs, cms, journal)
    api/               contact, interest, progress, resources/[id], cron/expire, stripe/webhook
  components/          design system (ui/), layout, cartes, markdown
  lib/
    catalog/           modèle public + chargeur DB (repli sur données statiques)
    advisor/           règles + moteur déterministe
    learning/          requêtes, navigation, schémas
    stripe/            garde mode live, normalisation d'événements, gestionnaire webhook
    admin/             schémas de formulaires, contexte et messages d'erreur
    video/             signature Mux
    cms.ts, email.ts, uploads.ts, rate-limit.ts, env.ts
  proxy.ts             rafraîchit la session, redirection « optimiste » des zones privées
supabase/
  migrations/0001…0005 schéma, RLS, apprentissage, commerce, administration
  seed.sql             généré depuis src/lib/catalog/data.ts (npm run seed:generate)
  dev-fixture.sql      contenus factices de TEST uniquement (jamais en production)
tests/  e2e/  scripts/
```

### 2.3 Autorisation en trois couches

1. **`proxy.ts`** : redirection optimiste (jamais la frontière de sécurité).
2. **Code serveur** : `requireUser()` / `requireAdmin()` avant toute lecture ou action.
3. **PostgreSQL** : RLS activée sur **toutes** les tables (refus par défaut) et chaque fonction d'administration revérifie `is_admin()` elle-même.

Les écritures sensibles (commandes, paiements, droits d'accès, événements webhook, rôles, audit) n'ont **aucune politique pour les apprenants** : seul le rôle service y accède, côté serveur.

### 2.4 Modèle de données (extrait)

- **Identité** : `profiles`, `user_roles` (`learner` | `enterprise_manager` | `admin`)
- **Catalogue** : `learning_phases`, `courses`, `course_prerequisites`, `learning_paths`, `learning_path_courses`, `chapters`, `lessons`, `lesson_resources`
- **Évaluation** : `quizzes`, `quiz_questions`, `quiz_options` (bonnes réponses lisibles par l'admin seulement), `quiz_attempts`, `assignments`, `assignment_submissions`, `attestations`
- **Commerce** : `products`, `product_course_access`, `prices` (historique), `coupons`, `orders`, `order_items` (instantané prix/durée), `payments`, `entitlements`, `processed_webhook_events`
- **Entreprise** : `organizations`, `organization_members`, `license_packs`, `license_allocations`
- **CMS & exploitation** : `pages`, `page_sections`, `blog_posts`, `testimonials`, `faq_items`, `audit_logs` (append-only), `email_events`, `consent_records`, `interest_signups`, `system_settings`

Détail et politiques RLS : [`DATABASE.md`](DATABASE.md).

### 2.5 Fonctions SQL principales

| Fonction | Rôle |
|---|---|
| `record_lesson_progress` | progression, reprise, dernière leçon ; évalue la complétion |
| `submit_quiz` / `get_quiz_options` | correction côté base ; la clé de correction n'est jamais exposée avant correction |
| `try_complete_course` | applique les règles de complétion, émet **une seule** attestation |
| `create_checkout_order` | applique les règles d'achat (publié, actif, prix, déjà détenu) |
| `process_stripe_event` | applique un événement Stripe vérifié, **de façon atomique et idempotente** (paiement, échec, expiration, remboursement total/partiel, litige) |
| `provision_order` | accorde/prolonge les accès sans doublon |
| `publish_course` / `course_readiness` | publication conditionnée à un contrôle de complétude |
| `set_product_price` / `set_product_active` | historique des prix ; une offre ne s'ouvre que si tous ses modules sont publiés |
| `admin_grant_access` / `admin_revoke_access` / `review_submission` | actions d'administration journalisées |
| `admin_metrics` | indicateurs du tableau de bord |

**Politique de révocation d'accès (à valider juridiquement)** : remboursement total → accès de la commande retiré ; remboursement partiel → accès conservé ; litige ouvert → accès suspendu ; litige gagné → accès rétabli ; litige perdu → accès retiré.

### 2.6 Sécurité

- Validation Zod, limitation de débit (en mémoire — **à remplacer par un store partagé en multi-instance**), champ pot-de-miel, en-têtes de sécurité, redirections de callback limitées au même site, pas d'énumération de comptes à la réinitialisation.
- Webhook Stripe : signature vérifiée sur le **corps brut**, recoupement session/devise, annulation de l'enregistrement d'idempotence si le traitement échoue (le retry Stripe peut réussir).
- Garde « paiement réel » : une clé `sk_live_…` est refusée sauf si `ALLOW_LIVE_PAYMENTS=true` **et** `LEGAL_REVIEW_COMPLETED=true`.
- Fichiers : liste d'extensions **et** de types MIME, taille limitée, noms assainis, dossier par utilisateur imposé par RLS Storage ; téléchargements par liens signés de courte durée.
- Vidéo : jamais d'URL permanente ; jeton signé de 2 h. Le streaming signé dissuade le partage, il **n'empêche pas absolument** le téléchargement.
- Journal d'audit en écriture seule sur le contenu, les prix, les commandes, les paiements et les droits d'accès.

Détails : [`SECURITY.md`](SECURITY.md).

### 2.7 Qualité

- **154 tests Vitest** passent (14 fichiers) : catalogue, conseiller, formulaires, Stripe (signatures réelles), Markdown, et surtout **migrations + RLS + règles métier sur PostgreSQL embarqué (PGlite)**.
- Les règles critiques ont été **testées par mutation** : casser volontairement la correction des quiz, la vérification admin, la garde de session Stripe, la révocation au remboursement ou l'historique des prix fait échouer les tests.
- `tsc`, ESLint et `next build` sont propres ; `npm audit --omit=dev` : 0 vulnérabilité (5 alertes « high » dans l'outillage ESLint de développement, aucune critique).

---

## 3. Démarrage rapide

**Prérequis** : Node.js ≥ 20 (testé avec Node 26), npm.

```bash
npm install
cp .env.example .env.local    # facultatif : le site public fonctionne sans identifiants
npm run dev                   # http://localhost:3000
```

Sans Supabase, le site public affiche le catalogue statique ; les pages d'authentification indiquent « non configuré » ; le formulaire de devis renvoie 503 plutôt que de simuler un envoi.

### Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest (inclut migrations + RLS sur PGlite) |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run seed:generate` | régénère `supabase/seed.sql` depuis `src/lib/catalog/data.ts` |
| `npm run e2e` | Playwright (nécessite `npx playwright install chromium` — **non exécuté à ce jour**) |

### Variables d'environnement (`.env.example`)

| Variable | Usage |
|---|---|
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL` | URL canonique, contact |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client Supabase (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur uniquement**, contourne la RLS |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe **en mode test** |
| `ALLOW_LIVE_PAYMENTS`, `LEGAL_REVIEW_COMPLETED` | doivent être `true` tous deux pour accepter une clé live (ne pas activer avant revue juridique) |
| `STRIPE_AUTOMATIC_TAX` | `true` une fois Stripe Tax configuré (aucun taux codé en dur) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `LEADS_TO_EMAIL` | e-mails transactionnels et demandes de devis |
| `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_PRIVATE_KEY` | lecture vidéo signée |
| `CRON_SECRET` | autorise `/api/cron/expire` |

### Mettre en route une base (Supabase)

1. Créer un projet Supabase ; appliquer `supabase/migrations/0001…0005` dans l'ordre, puis `supabase/seed.sql`.
2. S'inscrire sur le site, puis donner le rôle administrateur (avec le rôle service) :
   `insert into user_roles values ('<uuid-utilisateur>', 'admin');`
3. Auth : URL du site et redirection `<site>/auth/callback`, confirmation d'e-mail activée.
4. Facultatif en développement local : `supabase/dev-fixture.sql` ajoute des leçons/quiz **factices** pour essayer le lecteur (jamais en production).

### Stripe (mode test)

Webhook vers `<site>/api/stripe/webhook` avec les événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Procédure complète : [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## Ce qui est vérifié, ce qui ne l'est pas

| Élément | État |
|---|---|
| Schéma, RLS, règles d'apprentissage, de commerce et d'administration | ✅ testés sur PostgreSQL embarqué (PGlite, schémas `auth`/`storage` simulés) |
| Vérification de signature des webhooks, normalisation, gestionnaire | ✅ testés avec de vraies signatures Stripe générées localement |
| Validation des formulaires, Markdown sûr, liste blanche de fichiers, JWT Mux (format) | ✅ testés |
| Pages publiques : rendu, filtres, redirections des zones privées, API sans identifiants (400/401/429/503) | ✅ vérifiés en HTTP et en navigateur (accueil, catalogue) |
| **Supabase hébergé** (Auth, Storage, triggers `auth.users`, politiques de stockage) | ⚠️ **jamais exécuté** |
| **Stripe** : création de session, portail, factures, Stripe Tax, codes promo, remboursements, litiges de bout en bout | ⚠️ **jamais exécuté** |
| **Resend**, **Mux** (lecture HLS, jetons acceptés par Mux), envoi/téléversement de fichiers | ⚠️ **jamais exécuté** |
| Écrans d'administration, lecteur, quiz, livrables avec de vraies données | ⚠️ compilés et testés au niveau base, **non exercés en live** |
| Tests Playwright (`e2e/`) | ⚠️ écrits, **non exécutés** |
| Accessibilité (audit automatisé), Lighthouse, Core Web Vitals | ❌ non mesurés |

Liste exhaustive et à jour : [`TESTING.md`](TESTING.md) et [`TASKS.md`](TASKS.md).

---

## 5. Feuille de route

| Phase | Contenu | État |
|---|---|---|
| A | Fondations, design system, schéma, auth, catalogue, site public | ✅ construite |
| B | Lecteur, progression, quiz, livrables, complétion, attestations | ✅ construite |
| C | Stripe (mode test), commandes, webhooks, accès, expiration, e-mails | ✅ construite |
| D | Administration, CMS, journal d'audit, catalogue piloté par la base | ✅ construite |
| E | Entreprises : organisations, licences, sièges, rapports | ⬜ non commencée |
| F | Durcissement : tests e2e, accessibilité, performance, monitoring, sauvegardes | ⬜ non commencée |

**À faire en priorité** : exécuter tout le parcours contre un projet Supabase et un compte Stripe de test ; appliquer le design aux écrans restants ; interface entreprise ; éditeur des règles du conseiller ; file de relecture des réponses libres ; téléversement vidéo direct ; consentement cookies et analytics ; suppression/export de compte.

**Interface** : le design fourni (palette crème/marine/teal, Sora + Inter) est appliqué à l'en-tête, l'accueil, le catalogue, la fiche formation, le lecteur, le tableau de bord et l'administration. Les prix suivent la grille tarifaire fournie ensuite par le formateur (voir [`PRODUCT.md`](PRODUCT.md)).

---

## 6. Documentation détaillée

| Document | Contenu |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | décisions d'architecture |
| [`PRODUCT.md`](PRODUCT.md) | règles produit, commerce, révocation, design |
| [`DATABASE.md`](DATABASE.md) | migrations, contraintes, RLS |
| [`TESTING.md`](TESTING.md) | tests, mutations, limites |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | déploiement, Stripe, sauvegardes |
| [`SECURITY.md`](SECURITY.md) | mesures et blocages juridiques |
| [`CONTENT_GUIDE.md`](CONTENT_GUIDE.md) | publier du contenu authentique |
| [`TASKS.md`](TASKS.md) | liste de tâches et dépendances externes |

---

## 7. Avertissement légal

Ce dépôt est un socle technique. **Il n'est ni certifié ni déclaré conforme** au droit français de la formation professionnelle, à la protection des consommateurs, au RGPD ou à l'accessibilité, et n'est pas éligible à un financement public sans vérification indépendante. Les pages légales sont des **modèles à faire valider par un professionnel du droit**. La gestion du droit de rétractation pour contenus numériques, les CGV, la fiscalité et les obligations liées à la formation professionnelle restent à traiter avant toute ouverture des paiements réels. Aucune vidéo, aucun témoignage ni aucune biographie n'a été inventé : les contenus doivent être fournis et validés par le formateur.
