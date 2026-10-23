# TRAIL Academy

<!-- portfolio-summary:start -->

![Project overview](docs/assets/github-cover.svg)

> **Professional AI learning platform** | **Status:** En développement : intégrations externes et paiements réels non validés.
>
> [Architecture](ARCHITECTURE.md) · [Demo / verification](TESTING.md) · [Source code](https://github.com/yassineaqejjaj/TRAIL-Academy)

<!-- portfolio-summary:end -->


**T**raining **R**oadmap for **A**pplied **I**ntelligence & **L**eadership — *Learn AI. Apply AI. Lead with AI.*

Une plateforme de formation professionnelle à l'intelligence artificielle, conçue pour qu'**un formateur unique** la fasse vivre sans développeur : catalogue de 18 modules, parcours, lecteur de cours, quiz, livrables relus par un humain, attestations vérifiables, paiement, administration et gestion de contenu.

![Accueil de TRAIL Academy](docs/screenshots/01-accueil.png)

> **État honnête du projet.** Les phases A à D (fondations, apprentissage, commerce, administration) sont construites et testées : 375 tests automatisés et 20 parcours de bout en bout dans un vrai navigateur, contre PostgreSQL, sur un build de production, le tout vérifié aussi par la CI GitHub. Les phases E (entreprises) et F (durcissement) ne sont pas commencées. **Rien n'a encore tourné contre Stripe, un stockage S3, un serveur SMTP ou un déploiement Vercel/Railway réels** : voir [ce qui est vérifié et ce qui ne l'est pas](#9-ce-qui-est-vérifié-et-ce-qui-ne-lest-pas). Les paiements réels sont bloqués par conception tant qu'une revue juridique n'a pas eu lieu.

## Sommaire

1. [Le produit](#1-le-produit)
2. [Comment ça marche](#2-comment-ça-marche)
3. [Fonctionnalités en images](#3-fonctionnalités-en-images)
4. [Architecture technique](#4-architecture-technique)
5. [Bonnes pratiques d'ingénierie](#5-bonnes-pratiques-dingénierie)
6. [Bonnes pratiques produit](#6-bonnes-pratiques-produit)
7. [Démarrer](#7-démarrer)
8. [Déployer sur Vercel et Railway](#8-déployer-sur-vercel-et-railway)
9. [Ce qui est vérifié et ce qui ne l'est pas](#9-ce-qui-est-vérifié-et-ce-qui-ne-lest-pas)
10. [Feuille de route](#10-feuille-de-route)
11. [Structure du dépôt et documentation](#11-structure-du-dépôt-et-documentation)
12. [Avertissement légal](#12-avertissement-légal)

---

## 1. Le produit

### Le problème

Les professionnels qui doivent intégrer l'IA à leur métier trouvent surtout des contenus génériques ou trop techniques, sans progression claire ni livrable concret, et des promesses difficiles à vérifier. Côté formateur, vendre et suivre une formation en ligne demande souvent un assemblage fragile d'outils.

### La réponse

TRAIL Academy propose une formation **pratique, progressive et mesurable**, conçue et enseignée par un praticien qui construit réellement des produits IA :

- **18 modules** en 4 phases (Fondations IA · Productivité & Construction · Produit & Leadership · Systèmes & Ingénierie), avec prérequis, ordre recommandé, objectifs mesurables et **livrable concret** pour chaque module ;
- **Une pédagogie par la pratique** : cible de conception de 70 % de pratique, 20 % d'interaction, 10 % de théorie (un objectif de conception, pas une mesure) ;
- **Une validation honnête** : quiz corrigés automatiquement, livrables relus par le formateur, attestation privée et vérifiable. Jamais présentée comme une certification d'État ou une qualification RNCP ;
- **Une exploitation par une seule personne** : tout se pilote depuis l'administration, sans toucher au code.

### Pour qui

| Public | Ce qu'il y trouve |
|---|---|
| **Product Managers, Product Owners, AI Product Managers** | Intégrer l'IA à la pratique produit : discovery, stratégie, delivery, évaluation |
| **Consultants, chefs de projet, business analysts** | Cadrer, chiffrer et piloter des projets IA avec des méthodes réutilisables |
| **Transformation digitale, managers** | Gouvernance, AI Act, économie de l'IA, conduite du changement |
| **Profils tech et data** | RAG, agents, sécurité des LLM, évaluation et observabilité |
| **Professionnels en montée en compétence** | Un parcours des fondations aux usages avancés, à leur rythme |
| **Entreprises (secondaire)** | Licences d'équipe, formations sur mesure, ateliers privés *(interface de gestion : phase E)* |

### L'offre

| Offre | Contenu | Prix | Accès |
|---|---|---|---|
| **Module** | 1 module au choix (18 disponibles) | 199 € TTC | 12 mois |
| **Parcours** | Product Manager Augmenté (9 modules) **ou** AI Product Manager (13 modules), au choix | 990 € TTC | 18 mois |
| **AI Mastery** | les 18 modules et les deux parcours | 1 990 € TTC | 18 mois |
| Entreprises | licences d'équipe, programme sur mesure, ateliers privés : **sur devis** (formulaire), hors grille | — | — |

Trois offres seulement, sans option cachée. Un parcours ou AI Mastery **contient** les modules déjà détenus sans réduction de prix (décision commerciale à confirmer, voir `docs/GO_LIVE.md`) ; une offre dont tous les modules sont déjà détenus ne peut pas être rachetée.

Les prix sont des **données** modifiables dans l'administration (historique conservé, commandes passées inchangées).

### Pour apprendre, et pour décider d'acheter

- **Schémas intégrés** aux leçons (Mermaid : processus, séquences, matrices, chronologies), accessibles et adaptés au mode sombre.
- **Lecture audio** des textes (synthèse vocale du navigateur, vitesse et voix au choix, bloc lu surligné).
- **Aperçu gratuit sans compte** d'une vraie leçon par module, **programme détaillé** public (titres des leçons), **suggestions de modules suivants** après achat, partage LinkedIn de l'attestation, lettre d'information sous les articles.

### Conseiller et sessions en visio

- **Conseiller en texte libre** : la personne décrit son métier et son objectif avec ses mots ; le conseiller en déduit son profil, classe les modules les plus proches (similarité de texte avec le catalogue, synonymes), propose un parcours, un premier module et des compléments, et **explique pourquoi** en citant ses propres mots. Calculé dans le navigateur, rien n'est envoyé. Une **synthèse rédigée par un modèle de langage** est possible en option (n'importe quel modèle compatible OpenAI, y compris libre et auto-hébergé : `ADVISOR_LLM_*`) ; elle est désactivée par défaut, ne choisit jamais les modules, et son résultat est assaini. Non testée contre un vrai modèle (testée avec un faux).
- **Sessions en visio** : calendrier, réservation avec liste d'attente, lien privé réservé aux inscrits, fichier .ics, flux d'abonnement public, gestion complète côté formateur. Voir [`docs/SESSIONS.md`](docs/SESSIONS.md).

### De vrais avis, uniquement

Aucun avis n'est généré. Le formateur invite une personne réelle par un **lien privé à usage unique** ; elle écrit avec ses mots et **consent** à la publication ; le formateur **vérifie et consigne comment**, puis publie (la base refuse sinon). La section « Témoignages » n'apparaît qu'à partir de 3 avis publiés. Guide et messages types : [`docs/BETA_TESTERS.md`](docs/BETA_TESTERS.md).

### Les règles qui font la confiance

- **Seul un module publié et validé s'achète.** Les 18 modules sont visibles, mais « Bientôt disponible » tant que le contenu authentique n'est pas là ; le paiement est refusé côté base de données, pas seulement masqué.
- **On ne paie jamais deux fois le même contenu** : un parcours qui contient un module déjà détenu prolonge l'accès, sans doublon.
- **Aucune invention** : pas de témoignage sans consentement vérifiable, pas de vidéo ni de contenu fictif, pas de chiffre non vérifié.
- **L'accès payant ne s'ouvre que sur un événement de paiement signé et vérifié**, jamais sur une simple redirection du navigateur.

---

## 2. Comment ça marche

### Le parcours d'un apprenant

```mermaid
flowchart LR
  A[Découvre le catalogue<br/>ou le conseiller] --> B[Fiche module<br/>objectifs, programme, prix]
  B --> C{Module publié<br/>et offre ouverte ?}
  C -- non --> D[Inscription « me prévenir »<br/>avec consentement]
  C -- oui --> E[Paiement sécurisé Stripe]
  E --> F[Webhook signé et vérifié]
  F --> G[Accès activé<br/>12 ou 18 mois]
  G --> H[Leçons, notes, signets,<br/>reprise de lecture]
  H --> I[Quiz auto-corrigé]
  H --> J[Livrable relu<br/>par le formateur]
  I & J --> K[Module validé]
  K --> L[Attestation privée<br/>vérifiable par code]
```

1. **Découvrir** : catalogue filtrable, parcours comparés, et un **conseiller déterministe** (6 questions, règles visibles, aucune IA) qui explique pourquoi il recommande un parcours.
2. **Acheter** : Stripe Checkout (mode test tant que le juridique n'est pas validé). Une commande « en attente » est créée ; l'accès n'est accordé que par le webhook vérifié, de façon idempotente.
3. **Apprendre** : tableau de bord « reprendre où vous en étiez », lecteur avec plan du cours, notes, signets, ressources, transcription, vitesse et sous-titres pour la vidéo.
4. **Être évalué** : quiz (choix unique, multiple, réponse libre), seuil et nombre de tentatives configurables ; livrables texte ou fichier, relus par un humain avec retour.
5. **Valider** : quand toutes les règles du module sont remplies (leçons, quiz, livrables), une **attestation** est émise une seule fois, avec un code de vérification public.

### Le travail du formateur

```mermaid
flowchart LR
  A[Crée le module<br/>prérequis, objectifs] --> B[Ajoute chapitres,<br/>leçons, ressources, quiz, devoirs]
  B --> C[Contrôle de complétude<br/>automatique]
  C -- incomplet --> B
  C -- prêt --> D[Publie le module]
  D --> E[Fixe le prix et ouvre l'offre]
  E --> F[Suit ventes, progression,<br/>relit les livrables]
```

Un module ne peut pas être publié s'il manque du contenu (leçon vide, quiz sans question, question sans bonne réponse, objectifs absents). Publier **n'ouvre pas** la vente : l'offre s'ouvre explicitement, et seulement si tous ses modules sont publiés et ont un prix.

### Pourquoi les règles sont dans la base de données

Les règles qui comptent (accès, correction, complétion, paiement, remboursement) sont des **fonctions PostgreSQL transactionnelles**, testées sans réseau. Elles ne peuvent pas être contournées depuis le navigateur, et chaque requête d'un utilisateur s'exécute avec son propre rôle pour que la sécurité par ligne (RLS) s'applique réellement.

---

## 3. Fonctionnalités en images

*Captures réelles de l'application (build de production, base PostgreSQL locale). Les comptes sont fictifs ; les contenus de leçon sont des textes de remplacement sans vidéo, fournis par `db/dev-fixture.sql`.*

### Site public

| Catalogue | Fiche module |
|---|---|
| ![Catalogue](docs/screenshots/02-catalogue.png) | ![Fiche module](docs/screenshots/03-fiche-module.png) |
| **Parcours** | **Conseiller de parcours** |
| ![Parcours](docs/screenshots/04-parcours.png) | ![Conseiller](docs/screenshots/06-conseiller.png) |

<details><summary><strong>Page d'accueil complète et tarifs</strong></summary>

![Accueil complet](docs/screenshots/01-accueil-complet.jpg)
![Tarifs](docs/screenshots/05-tarifs.jpg)

</details>

### Espace apprenant

| Tableau de bord | Lecteur de cours |
|---|---|
| ![Tableau de bord](docs/screenshots/08-tableau-de-bord.png) | ![Lecteur](docs/screenshots/09-lecteur.png) |
| **Quiz** | **Livrable** |
| ![Quiz](docs/screenshots/10-quiz.png) | ![Livrable](docs/screenshots/11-livrable.png) |

**Attestation vérifiable publiquement** (code unique, données minimales) :

![Attestation](docs/screenshots/12-attestation.png)

### Administration du formateur

| Tableau de bord | Fiche module et publication |
|---|---|
| ![Admin tableau de bord](docs/screenshots/13-admin-tableau-de-bord.png) | ![Admin module](docs/screenshots/14-admin-module.png) |
| **Chapitres et leçons** | **Relecture des livrables** |
| ![Admin contenu](docs/screenshots/15-admin-contenu.png) | ![Admin relecture](docs/screenshots/16-admin-relecture.png) |
| **Produits et prix** | **Contenu du site (CMS)** |
| ![Admin produits](docs/screenshots/20-admin-produits.png) | ![Admin CMS](docs/screenshots/21-admin-cms.png) |

### Formateur, données personnelles et mise en production

| | |
|---|---|
| ![Page formateur](docs/screenshots/23-formateur.png) | ![Mes données (RGPD)](docs/screenshots/25-compte-donnees.png) |
| Page du formateur (photo et domaines d'expertise ; la biographie se complète depuis l'administration) | Export JSON et suppression du compte |
| ![Vidéo d'une leçon](docs/screenshots/26-admin-video.png) | ![Mise en production](docs/screenshots/24-admin-production.jpg) |
| Envoi de la vidéo, encodage HLS, statut | Contrôles de configuration et vérifications en direct |

Le **journal d'audit** (écriture seule) enregistre qui a changé quoi sur le contenu, les prix, les commandes, les paiements et les accès : [`22-admin-journal.png`](docs/screenshots/22-admin-journal.png).

### Mode sombre et mobile

| Mode sombre | Lecteur sur mobile | Catalogue sur mobile |
|---|---|---|
| ![Mode sombre](docs/screenshots/17-mode-sombre.png) | <img src="docs/screenshots/18-mobile-lecteur.png" width="260" alt="Lecteur mobile"> | <img src="docs/screenshots/19-mobile-catalogue.png" width="260" alt="Catalogue mobile"> |

---

## 4. Architecture technique

### Une pile entièrement open source

| Besoin | Brique | Licence |
|---|---|---|
| Application web | **Next.js 16** (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4 | MIT |
| Base de données | **PostgreSQL** (migrations SQL, Row Level Security) via `pg` | PostgreSQL / MIT |
| Authentification | **Better Auth** : e-mail + mot de passe (Argon2id), vérification d'e-mail, réinitialisation, Google en option | MIT |
| Stockage de fichiers | **MinIO** (API S3) via AWS SDK v3, envoi direct navigateur → bucket | AGPL-3.0 / Apache-2.0 |
| Vidéo | **HLS auto-hébergé** : `ffmpeg` pour l'encodage, **passerelle de streaming** maison (jetons signés `jose`), `hls.js` côté client | LGPL / MIT |
| E-mail | **SMTP** via `nodemailer` (n'importe quel relais ; **Mailpit** en local) | MIT-0 / MIT |
| Validation, contenu | Zod, `react-markdown` (HTML brut jamais rendu) | MIT |
| Tests | Vitest, React Testing Library, PGlite (PostgreSQL embarqué), Playwright | MIT / Apache-2.0 |
| CI | GitHub Actions | — |

**Hébergement** : l'application sur **Vercel** ; PostgreSQL, MinIO et la passerelle de streaming sur **Railway**.

**Seule exception assumée : Stripe.** Il n'existe pas d'équivalent open source d'un processeur de paiement (agrément bancaire, conformité PCI). Stripe est isolé derrière un adaptateur (`src/lib/stripe/`), et sa logique métier côté base est indépendante du fournisseur. Vercel est lui-même un service propriétaire, retenu à la demande du propriétaire du projet.

### Vue d'ensemble

```mermaid
flowchart TB
  subgraph Vercel
    W[Next.js<br/>pages serveur, actions, API<br/>+ proxy.ts]
  end
  subgraph Railway
    P[(PostgreSQL<br/>RLS + fonctions métier)]
    M[(MinIO<br/>bucket privé)]
    G[Passerelle de streaming HLS<br/>jetons signés]
  end
  U[Navigateur] -->|HTTPS| W
  W -->|SET LOCAL ROLE + auth.uid| P
  W -->|URL pré-signées| M
  U -->|upload direct, taille et type limités| M
  U -->|segments HLS + jeton| G
  G -->|lecture| M
  W -->|jeton de lecture| U
  ST[Stripe] -->|webhook signé| W
  W -->|SMTP| MAIL[Relais SMTP]
```

### Autorisation en trois couches

1. **`proxy.ts`** : redirection « optimiste » vers la connexion (jamais la frontière de sécurité).
2. **Code serveur** : `requireUser()` / `requireAdmin()` avant toute lecture ou action ; entrées validées par Zod.
3. **PostgreSQL** : RLS activée sur **toutes** les tables (refus par défaut). Chaque requête utilisateur s'exécute dans une transaction `SET LOCAL ROLE authenticated` avec l'identité passée par `app.uid` ; les fonctions d'administration revérifient `is_admin()` elles-mêmes. Les tables d'authentification n'appartiennent à aucun rôle applicatif.

```ts
// src/lib/db/context.ts — le rôle et l'identité s'arrêtent avec la transaction : une connexion
// réutilisée par le pool ne garde jamais les privilèges d'un autre utilisateur.
await asUser(user.id, (q) => q("select * from orders"));   // ne voit que ses commandes
await asAnon((q) => q("select * from courses"));          // données publiques
await asService((q) => q("select process_stripe_event($1,$2,$3)", [...])); // code serveur de confiance
```

### Modèle de données (extrait)

`users` *(auth)* → `profiles`, `user_roles` · `courses`, `learning_phases`, `learning_paths`, `chapters`, `lessons`, `lesson_resources` · `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `assignments`, `assignment_submissions`, `attestations` · `products`, `prices` *(historique)*, `coupons`, `orders`, `order_items` *(instantané prix/durée)*, `payments`, `entitlements`, `processed_webhook_events` · `organizations`, `license_packs`, `license_allocations` *(phase E)* · `pages`, `page_sections`, `blog_posts`, `testimonials`, `faq_items`, `audit_logs` *(écriture seule)*, `email_events`, `consent_records`, `interest_signups`.

Fonctions clés : `record_lesson_progress`, `submit_quiz`, `try_complete_course`, `create_checkout_order`, `process_stripe_event` (atomique et idempotente), `provision_order`, `publish_course`, `set_product_price`, `admin_grant_access`, `review_submission`, `admin_metrics`. Détail : [`DATABASE.md`](DATABASE.md).

### Le paiement, sans jamais faire confiance au navigateur

```mermaid
sequenceDiagram
  participant N as Navigateur
  participant A as Application
  participant D as PostgreSQL
  participant S as Stripe
  N->>A: Acheter ce module
  A->>D: create_checkout_order (règles : publié, ouvert, pas déjà détenu)
  A->>S: Session Checkout (client_reference_id = commande)
  N->>S: Paiement
  N->>A: Redirection /achat/succes (affichage seulement)
  S->>A: Webhook signé
  A->>A: Vérifie la signature sur le corps brut
  A->>D: process_stripe_event (transaction unique)
  D-->>D: enregistre l'événement + commande payée + accès + audit
  A-->>N: e-mail de confirmation
```

Doublons, rejeux, sessions falsifiées, mauvaise devise, paiements différés ou échoués, remboursements totaux ou partiels, litiges : tout est géré dans `process_stripe_event` et couvert par des tests ([`DATABASE.md`](DATABASE.md)).

---

## 5. Bonnes pratiques d'ingénierie

| Pratique | Mise en œuvre dans ce dépôt |
|---|---|
| **Sécurité en profondeur** | Trois couches d'autorisation ; RLS partout ; rôle PostgreSQL par transaction ; secrets uniquement par variables d'environnement ; en-têtes de sécurité ; liens de fichiers pré-signés de courte durée |
| **Règles métier près des données** | Fonctions SQL transactionnelles, idempotentes, testées sans réseau (`db/migrations/`) |
| **Idempotence** | Clé d'événement unique pour les webhooks ; l'enregistrement est annulé si le traitement échoue, pour que le nouvel essai de Stripe réussisse |
| **Défaut sûr** | Offre fermée tant que non explicitement ouverte ; clés Stripe *live* refusées sans deux drapeaux explicites ; absence de configuration = message clair, jamais une fausse réussite |
| **Validation aux frontières** | Zod sur chaque formulaire et route ; types MIME **et** extensions vérifiés ; taille plafonnée par le bucket lui-même (POST pré-signé) |
| **Traçabilité** | Journal d'audit en écriture seule (acteur, avant/après) sur contenu, prix, commandes, paiements, accès ; toute action manuelle sensible exige un motif |
| **Tests proportionnés au risque** | 375 tests dont migrations + RLS sur PostgreSQL ; **tests par mutation manuelle** des règles critiques (casser la règle doit faire échouer un test) ; 20 parcours de bout en bout |
| **Environnements reproductibles** | Migrations versionnées et rejouables (`npm run db:migrate`), seed généré depuis le code, base locale sans Docker (`npm run db:dev`), `docker-compose.yml` production-like |
| **CI** | `.github/workflows/ci.yml` : types, lint, tests, audit des dépendances, build, puis e2e Playwright sur le build de production |
| **Dépendances** | 0 vulnérabilité sur les dépendances de production (`npm audit --omit=dev`) ; bibliothèques établies pour l'authentification et le chiffrement, rien de fait maison côté cryptographie |
| **Accessibilité** | Cible WCAG 2.2 AA : sémantique native, focus visibles, cibles ≥ 44 px, contrastes, lien d'évitement, thèmes clair/sombre, `prefers-reduced-motion` *(audit automatisé à faire)* |
| **Observabilité honnête** | Erreurs applicatives sans fuite d'informations ; journal d'audit ; supervision externe à brancher (voir feuille de route) |
| **Documentation vivante** | Un document par sujet, chiffres issus du code, limites écrites noir sur blanc |

Conventions : aucune concaténation SQL (requêtes paramétrées uniquement, `Q` en témoigne), requêtes d'une page regroupées dans une seule transaction, composants serveur par défaut, composants client seulement pour l'interactivité.

---

## 6. Bonnes pratiques produit

| Pratique | Application |
|---|---|
| **Promesses vérifiables** | Aucun témoignage, avis, chiffre ou logo inventé ; la répartition 70/20/10 est présentée comme un objectif de conception ; durées et niveaux signalés comme indicatifs |
| **Honnêteté sur la disponibilité** | « Bientôt disponible » et « Achat bientôt ouvert » distingués ; l'utilisateur laisse son e-mail avec consentement explicite plutôt que d'acheter du vide |
| **Prix comme donnée, pas comme code** | Prix et offres modifiables en admin, historique conservé ; expérimentation de prix de lancement possible sans déploiement |
| **Jamais deux fois le même contenu** | Règle commerciale imposée par la base, pas par l'interface |
| **Évaluation humaine pour ce qui engage** | Le quiz est automatique, mais le livrable et l'attestation relèvent du formateur ; aucune IA n'est l'autorité finale |
| **Un produit pour une seule personne** | Contrôle de complétude avant publication, relecture centralisée, tableau de bord, CMS : le formateur n'a besoin ni de développeur ni d'administrateur |
| **Mesurer ce qui est mesurable** | Entonnoir de commande côté serveur ; les vues de pages ne sont pas suivies tant qu'une mesure respectueuse de la vie privée et le consentement ne sont pas en place |
| **Vie privée par défaut** | Données minimales (la vérification d'attestation n'expose que titre, date et nom), consentements enregistrés, désinscription possible, durées de conservation à définir |
| **Conformité en amont** | Pages légales fournies en modèles *signalés comme à valider* ; blocage technique des paiements réels avant revue juridique |
| **Extensibilité sans complexité prématurée** | Données prêtes pour entreprises, cohortes et nouvelles langues, sans interface spéculative |

---

## 7. Démarrer

**Prérequis** : Node.js ≥ 20.9 (24 recommandé ; 24 requis pour la passerelle de streaming ; testé avec 26), npm. Aucun compte externe n'est nécessaire pour voir le site.

### A. Le site public, sans rien configurer

```bash
npm install
npm run dev          # http://localhost:3000, catalogue de démonstration intégré
```

### B. Toute la plateforme en local, sans Docker

```bash
npm install
cp .env.example .env.local     # puis renseigner BETTER_AUTH_SECRET (openssl rand -base64 32)
# les scripts npm run db:* / admin:create lisent automatiquement .env.local

npm run db:dev                 # PostgreSQL embarqué (PGlite) persistant sur 127.0.0.1:54329
npm run db:migrate -- --seed --fixture   # schéma, catalogue, contenu de démonstration
npm run dev
```

Dans `.env.local`, pour ce mode : `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres`, `DATABASE_SINGLE_CONNECTION=true`, `EMAIL_TRANSPORT=console` (les e-mails de confirmation s'affichent dans le terminal). Puis inscrivez-vous, ouvrez le lien de confirmation, et passez-vous administrateur :

```bash
npm run admin:create -- vous@exemple.fr
```

### C. Pile production-like (Docker)

```bash
docker compose up -d     # PostgreSQL 17, MinIO (S3), Mailpit (boîte mail sur :8025)
```

`DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/trail`, `SMTP_URL=smtp://127.0.0.1:1025`, `S3_ENDPOINT=http://127.0.0.1:9000` (voir `.env.example`). La passerelle vidéo se lance avec `docker compose --profile video up`. *Ce fichier n'a pas pu être exécuté dans l'environnement de création (pas de démon Docker).*

### Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | 375 tests (unitaires, base de données, intégration) |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm run db:dev` | PostgreSQL local embarqué |
| `npm run db:migrate [-- --seed] [-- --fixture]` | Applique les migrations (rejouable) |
| `npm run admin:create -- <email>` | Donne le rôle administrateur |
| `npm run seed:generate` | Régénère `db/seed.sql` depuis `src/lib/catalog/data.ts` |
| `npx playwright test` | Parcours de bout en bout (`E2E_CHANNEL=chrome` réutilise Chrome installé) |
| `npm run screenshots` | Régénère `docs/screenshots` depuis l'application qui tourne |
| `scripts/encode-hls.sh` | Encode une vidéo en HLS adaptatif et l'envoie dans le bucket (manuel ; l'admin passe par `services/video-worker`) |
| `npm run stripe:setup` | Enregistre le webhook Stripe et le portail client (clé de test d'abord) : voir [`docs/STRIPE.md`](docs/STRIPE.md) |
| `npm run check:env -- --env-file=<fichier>` | Vérifie la configuration de production (0 = aucun point bloquant) |
| `scripts/backup.sh` | Sauvegarde logique `pg_dump` (+ copie S3 facultative) |

### Configuration

Toutes les variables sont dans [`.env.example`](.env.example), regroupées par service (site, base, authentification, SMTP, stockage S3, vidéo, Stripe, tâches). Sans une variable, la fonctionnalité correspondante se désactive **explicitement** (message à l'écran ou code 503), jamais silencieusement.

---

## 8. Déployer sur Vercel et Railway

| Service | Où | Rôle |
|---|---|---|
| Application Next.js | **Vercel** | pages, actions serveur, API, tâche planifiée d'expiration des accès (`vercel.json`) |
| PostgreSQL | **Railway** (plugin) | base unique, RLS |
| MinIO | **Railway** (image `minio/minio`, volume) | fichiers privés + vidéos HLS |
| Passerelle de streaming | **Railway** (`services/stream-gateway`, Dockerfile) | sert les segments sur jeton signé |
| SMTP | au choix (relais transactionnel ou Postal auto-hébergé) | e-mails de confirmation et de réinitialisation |

Étapes principales : créer le projet Railway (PostgreSQL, MinIO, passerelle) ; appliquer les migrations avec le workflow **Apply database migrations** ou `npm run db:migrate` ; importer le dépôt dans Vercel et renseigner les variables ; configurer le webhook Stripe en mode test ; créer l'administrateur. Pas à pas, réglages réseau (SSL, pool de connexions, régions) et vérifications : [`DEPLOYMENT.md`](DEPLOYMENT.md). **Aucun déploiement n'a été effectué.**

---

## 9. Ce qui est vérifié et ce qui ne l'est pas

| Élément | État |
|---|---|
| Schéma, migrations, RLS, règles d'apprentissage, de commerce et d'administration | ✅ 375 tests sur PostgreSQL embarqué ; migrations rejouées de bout en bout sur une base en TCP |
| Couche d'accès (rôle par transaction, aucune fuite de privilèges entre requêtes, tables d'auth fermées) | ✅ testée sur une vraie connexion TCP |
| Authentification : inscription, vérification obligatoire, session HttpOnly, réinitialisation qui révoque les sessions, Argon2id | ✅ testée de bout en bout (bibliothèque + base) |
| Application complète en navigateur : visiteur, inscription, progression persistante, quiz, livrable, relecture, attestation, publication d'un module, contrôles d'accès | ✅ 20 parcours Playwright dans Chrome, sur build de production |
| Les 27 routes publiques, apprenant et admin | ✅ HTTP 200 sans erreur ni avertissement de console (relevé en mode développement) |
| Vérification de signature Stripe, normalisation, traitement des événements | ✅ testés avec de vraies signatures générées localement |
| Passerelle de streaming (jetons, traversée de chemins, plages d'octets, réécriture des playlists) | ✅ testée avec un faux stockage |
| Signature des URL S3 (taille, type, durée) | ✅ testée hors ligne |
| **PostgreSQL serveur réel** (Railway, Docker) | ⚠️ non exécuté (PGlite est un vrai PostgreSQL compilé en WASM, mais ce n'est pas un serveur de production) |
| **Stripe** (Checkout, portail, factures, taxes, codes promo, remboursements, litiges de bout en bout) | ⚠️ jamais exécuté |
| **MinIO/S3 réel** (envoi, téléchargement, CORS) et **lecture vidéo HLS** par `hls.js` via la passerelle | ⚠️ jamais exécuté |
| **SMTP réel**, **Google OAuth**, **déploiement Vercel/Railway**, **`docker-compose.yml`** | ⚠️ jamais exécutés |
| **CI GitHub Actions** (types, lint, 375 tests, audit, build, puis 20 parcours Playwright sur Chromium/Ubuntu) | ✅ exécutée avec succès sur GitHub (commit `6ac17d7`) |
| Accessibilité (audit automatisé), Lighthouse, Core Web Vitals | ❌ non mesurés |

Détails et protocole : [`TESTING.md`](TESTING.md).

---

## 10. Feuille de route

| Phase | Contenu | État |
|---|---|---|
| A | Fondations, design system, schéma, catalogue, site public | ✅ |
| B | Lecteur, progression, quiz, livrables, complétion, attestations | ✅ |
| C | Stripe (mode test), commandes, webhooks, accès, expiration, e-mails | ✅ *(non exécuté contre Stripe)* |
| D | Administration, CMS, journal d'audit, catalogue piloté par la base | ✅ |
| — | Migration vers une pile 100 % open source (PostgreSQL, Better Auth, S3, HLS, SMTP) | ✅ |
| E | Entreprises : organisations, licences, sièges, rapports | ⬜ |
| F | Durcissement : accessibilité, performance, supervision, sauvegardes, CSP | ⬜ |

Prochaines étapes prioritaires : exécuter la chaîne complète contre Railway et Stripe en mode test ; interface entreprise ; éditeur des règles du conseiller ; file de relecture des réponses libres ; consentement cookies et mesure d'audience respectueuse (Plausible/Umami) ; export et suppression de compte ; supervision (GlitchTip/OpenTelemetry) ; dates de début et de fin pour les prix de lancement. Liste complète : [`TASKS.md`](TASKS.md).

---

## 11. Structure du dépôt et documentation

```
src/app/            routes : site public, compte, apprendre, admin, achat, API (auth, progress, stripe…)
src/components/     système de design et composants
src/lib/            db (pool, rôles), auth, catalogue, conseiller, apprentissage, stripe, stockage, vidéo, e-mail, CMS
db/                 migrations/ (0000 plateforme … 0005 admin), seed.sql (généré), dev-fixture.sql (démo)
services/           stream-gateway/ (service Railway)
scripts/            migrate, dev-db, create-admin, check-env, backup.sh, encode-hls.sh, generate-seed, capture-screenshots
tests/ e2e/         Vitest (unitaires, base, intégration) et Playwright
docs/screenshots/   captures réelles utilisées ci-dessus
.github/workflows/  CI, migrations manuelles
```

| Document | Contenu |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | décisions d'architecture et leurs raisons |
| [`PRODUCT.md`](PRODUCT.md) | règles produit, commerce, révocation d'accès, design |
| [`DATABASE.md`](DATABASE.md) | rôles, migrations, RLS, fonctions |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Vercel, Railway, Stripe, sauvegardes |
| [`SECURITY.md`](SECURITY.md) | mesures, limites, blocages juridiques |
| [`TESTING.md`](TESTING.md) | stratégie, couverture, ce qui n'est pas testé |
| [`CONTENT_GUIDE.md`](CONTENT_GUIDE.md) | publier du contenu authentique, encoder la vidéo |
| [`TASKS.md`](TASKS.md) | tâches et dépendances externes |

**Licence** : aucune n'est encore définie dans ce dépôt public ; en l'absence de licence, tous droits sont réservés. À choisir par le propriétaire.

---

## 12. Avertissement légal

Ce dépôt est un socle technique. **Il n'est ni certifié ni déclaré conforme** au droit français de la formation professionnelle, à la protection des consommateurs, au RGPD ou à l'accessibilité, et n'est pas éligible à un financement public sans vérification indépendante. Les pages légales sont des **modèles à faire valider par un professionnel du droit**. Le droit de rétractation pour contenus numériques, les conditions générales de vente, la fiscalité et les obligations de la formation professionnelle restent à traiter avant toute ouverture des paiements réels. Aucune vidéo, aucun témoignage et aucune biographie n'ont été inventés : les contenus doivent être fournis et validés par le formateur.
