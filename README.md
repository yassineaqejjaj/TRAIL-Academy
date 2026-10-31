# TRAIL Academy

<!-- portfolio-summary:start -->

![Project overview](docs/assets/github-cover.svg)

> **Plateforme de formation professionnelle à l'IA** | **Statut :** en ligne en mode test (paiements réels non ouverts) · [site](https://trailacademy.fr)
>
> [Architecture](ARCHITECTURE.md) · [Demo / verification](TESTING.md) · [Source code](https://github.com/yassineaqejjaj/TRAIL-Academy)

<!-- portfolio-summary:end -->


**T**raining **R**oadmap for **A**pplied **I**ntelligence & **L**eadership — *Learn AI. Apply AI. Lead with AI.*

Une plateforme de formation professionnelle à l'intelligence artificielle, conçue pour qu'**un formateur unique** la fasse vivre sans développeur : catalogue de 30 modules et 6 parcours (produit, tech, marketing, RH, juridique, finance), lecteur de cours, quiz, livrables relus par un humain, attestations vérifiables, paiement, sessions en visio, offre entreprise, administration et gestion de contenu.

![Accueil de TRAIL Academy](docs/screenshots/01-accueil.png)

> **État honnête du projet** (octobre 2026). Le site tourne sur **Vercel** (base PostgreSQL, MinIO et services vidéo sur **Railway**) : <https://trailacademy.fr>. Les 30 modules sont rédigés (631 leçons, 856 questions de quiz, plus de 220 schémas, 90 ateliers no-code) et publiés, mais **aucune offre n'est ouverte à la vente** et **aucune vidéo n'est encore téléversée**. Le paiement a été validé de bout en bout **en mode test Stripe** (achat et remboursement) ; les paiements réels restent bloqués par conception tant que la revue juridique n'a pas eu lieu. **514 tests unitaires et 23 parcours de bout en bout** (Playwright, avec contrôle d'accessibilité et de CSP). Ce qui n'a jamais tourné : [voir la section 9](#9-ce-qui-est-vérifié-et-ce-qui-ne-lest-pas).

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

- **30 modules** en 5 phases (Fondations IA · Productivité & Construction · Produit & Leadership · Systèmes & Ingénierie · IA pour les métiers : marketing et communication, RH, juridique, finance), avec prérequis, ordre recommandé, objectifs mesurables et **livrable concret** pour chaque module ;
- **Une pédagogie par la pratique** : un cycle en quatre temps, **Comprendre, Essayer, Vérifier, Livrer** (leçon courte, atelier no-code, quiz et grille de critères, livrable relu par le formateur), sans pourcentage de répartition annoncé ;
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
| **Marketing et communication, RH, juridique, finance** | Trois modules écrits pour leur fonction, après les fondations : contenu et réputation, recrutement et compétences, recherche et contrats, contrôle de gestion et audit |
| **Entreprises** | Trois offres sur devis (AI Discovery Workshop, AI Skills Accelerator, Enterprise AI Academy), licences d'équipe, suivi de progression par organisation ; **sur devis** |

### L'offre

| Offre | Contenu | Prix | Accès |
|---|---|---|---|
| **Module** | 1 module au choix (30 modules) | 199 € TTC | 12 mois |
| **Parcours** | un parcours au choix parmi six : Product Manager Augmenté (9 modules), AI Product Manager (13), Marketing & Communication Augmentés, RH Augmentées, Juridique Augmenté, Finance Augmentée (8 modules chacun) | 990 € TTC | 18 mois |
| **AI Mastery** | les 30 modules et les 6 parcours, un seul achat (pas de service individuel en plus) | 1 990 € TTC | 18 mois |
| Entreprises | licences d'équipe, programme sur mesure, ateliers privés : **sur devis** (formulaire), hors grille ; suivi dans « Mon équipe » ([`docs/ENTREPRISE.md`](docs/ENTREPRISE.md)) | — | — |

Trois offres seulement, sans option cachée. Les paiements passent par **Stripe Managed Payments** (Stripe vendeur officiel : taxes, facturation, litiges) : voir [`docs/STRIPE.md`](docs/STRIPE.md). Un parcours ou AI Mastery **contient** les modules déjà détenus sans réduction de prix (décision commerciale à confirmer, voir `docs/GO_LIVE.md`) ; une offre dont tous les modules sont déjà détenus ne peut pas être rachetée.

Les prix sont des **données** modifiables dans l'administration (historique conservé, commandes passées inchangées).

### Pour apprendre, et pour décider d'acheter

- **Schémas intégrés** aux leçons (Mermaid : processus, séquences, matrices, chronologies), accessibles et adaptés aux thèmes clair et sombre.
- **Lecture audio** des textes (synthèse vocale du navigateur, vitesse et voix au choix, bloc lu surligné).
- **Évaluation de niveau gratuite** (`/evaluation`, 15 questions, calculée dans le navigateur), **démonstration interactive** de la plateforme (`/apercu-plateforme`) et **exemples de livrables** fictifs (`/exemples-livrables`).
- **Aperçu gratuit sans compte** d'une vraie leçon par module, **programme détaillé** public (titres des leçons), **suggestions de modules suivants** après achat, partage LinkedIn de l'attestation, lettre d'information sous les articles.

### Ateliers pratiques no-code et low-code

Chaque module se termine par **3 ateliers sans code** (90 au total) sur des plateformes no-code ou low-code, de préférence libres ou gratuites ; les livrables se font sans code, les exercices Python historiques sont facultatifs. Voir [`CONTENT_GUIDE.md`](CONTENT_GUIDE.md).

### Conseiller et sessions en visio

- **Conseiller en texte libre** : la personne décrit son métier et son objectif avec ses mots ; le conseiller en déduit son profil, classe les modules les plus proches (similarité de texte avec le catalogue, synonymes), propose un parcours, un premier module et des compléments, et **explique pourquoi** en citant ses propres mots. Calculé dans le navigateur, rien n'est envoyé. Une **synthèse rédigée par un modèle de langage** est possible en option (n'importe quel modèle compatible OpenAI, y compris libre et auto-hébergé : `ADVISOR_LLM_*`) ; elle est désactivée par défaut, ne choisit jamais les modules, et son résultat est assaini. Non testée contre un vrai modèle (testée avec un faux).
- **Tuteur dans les leçons** (construit, **non déployé**) : un panneau « Poser une question » qui répond **uniquement à partir du texte du cours, avec citations** vers la section exacte, explique plus simplement, donne un exemple, reformule, et sur les exercices donne des indices sans jamais la solution. Recherche plein texte en base avec les droits de la personne ; sans modèle de langage configuré, il affiche les passages du cours les plus proches. Voir [`docs/TUTEUR_IA.md`](docs/TUTEUR_IA.md).
- **Sessions en visio** : calendrier, réservation avec liste d'attente, lien privé réservé aux inscrits, fichier .ics, flux d'abonnement public, gestion complète côté formateur. Voir [`docs/SESSIONS.md`](docs/SESSIONS.md).

### De vrais avis, uniquement

Aucun avis n'est généré. Le formateur invite une personne réelle par un **lien privé à usage unique** ; elle écrit avec ses mots et **consent** à la publication ; le formateur **vérifie et consigne comment**, puis publie (la base refuse sinon). La section « Témoignages » n'apparaît qu'à partir de 3 avis publiés. Guide et messages types : [`docs/BETA_TESTERS.md`](docs/BETA_TESTERS.md).

### Les règles qui font la confiance

- **Seul un module publié dont l'offre est ouverte s'achète.** Les libellés publics distinguent « Disponible à l'achat », « Aperçu gratuit · inscriptions bientôt ouvertes » et « En préparation » ; le paiement est refusé côté base de données, pas seulement masqué.
- **On ne paie jamais deux fois le même contenu** : un parcours qui contient un module déjà détenu prolonge l'accès, sans doublon.
- **Aucune invention** : pas de témoignage sans consentement vérifiable, pas de vidéo ni de contenu fictif présenté comme réel, pas de chiffre non vérifié. Les exemples pédagogiques sont toujours signalés comme fictifs.
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

1. **Découvrir** : catalogue filtrable, parcours comparés, un **conseiller** (questionnaire ou texte libre) et l'**évaluation de niveau**.
2. **Acheter** : Stripe Checkout avec Managed Payments (mode test tant que le juridique n'est pas validé). Une commande « en attente » est créée ; l'accès n'est accordé que par le webhook vérifié, de façon idempotente.
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

*Captures réelles de l'application avec le design d'octobre 2026 (build de production, base PostgreSQL locale, thème sombre par défaut ; thème clair disponible via le bouton soleil/lune ; voir [`docs/DESIGN.md`](docs/DESIGN.md)). Les comptes sont fictifs ; les contenus de leçon sont des textes de remplacement sans vidéo, fournis par `db/dev-fixture.sql`.*

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

### Mobile

| Lecteur sur mobile | Catalogue sur mobile |
|---|---|
| <img src="docs/screenshots/18-mobile-lecteur.png" width="260" alt="Lecteur mobile"> | <img src="docs/screenshots/19-mobile-catalogue.png" width="260" alt="Catalogue mobile"> |

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
| E-mail | **SMTP** via `nodemailer` (relais Brevo en production ; **Mailpit** en local) | MIT-0 / MIT |
| Validation, contenu | Zod, `react-markdown` (HTML brut jamais rendu) | MIT |
| Tests | Vitest, React Testing Library, PGlite (PostgreSQL embarqué), Playwright | MIT / Apache-2.0 |
| CI | GitHub Actions | — |

**Hébergement** : l'application sur **Vercel** ; PostgreSQL 18, MinIO, la passerelle de streaming et le worker d'encodage vidéo sur **Railway**.

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

`users` *(auth)* → `profiles`, `user_roles` · `courses`, `learning_phases`, `learning_paths`, `chapters`, `lessons`, `lesson_resources` · `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `assignments`, `assignment_submissions`, `attestations` · `products`, `prices` *(historique)*, `coupons`, `orders`, `order_items` *(instantané prix/durée)*, `payments`, `entitlements`, `processed_webhook_events` · `organizations`, `organization_members`, `organization_invitations`, `license_packs`, `license_allocations` · `live_sessions` et réservations · `review_invitations`, `review_submissions` · `video_assets` · `pages`, `page_sections`, `blog_posts`, `testimonials`, `faq_items`, `audit_logs` *(écriture seule)*, `email_events`, `consent_records`, `interest_signups`.

Fonctions clés : `record_lesson_progress`, `submit_quiz`, `try_complete_course`, `create_checkout_order`, `process_stripe_event` (atomique et idempotente), `provision_order`, `publish_course`, `set_product_price`, `admin_grant_access`, `review_submission`, `admin_metrics`. Plus `org_progress_report`, `allocate_license_seat`, `accept_org_invitation`, `book_live_session`, `user_contact`. Détail : [`DATABASE.md`](DATABASE.md).

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
| **Tests proportionnés au risque** | 514 tests dont migrations + RLS sur PostgreSQL ; **tests par mutation manuelle** des règles critiques (casser la règle doit faire échouer un test) ; 23 parcours de bout en bout, dont contrôle axe (WCAG 2.2 AA) et CSP sur les pages publiques |
| **Environnements reproductibles** | Migrations versionnées et rejouables (`npm run db:migrate`), seed généré depuis le code, base locale sans Docker (`npm run db:dev`), `docker-compose.yml` production-like |
| **CI** | `.github/workflows/ci.yml` : types, lint, tests, audit des dépendances, build, puis e2e Playwright sur le build de production |
| **Dépendances** | 0 vulnérabilité sur les dépendances de production (`npm audit --omit=dev`) ; bibliothèques établies pour l'authentification et le chiffrement, rien de fait maison côté cryptographie |
| **Accessibilité** | Cible WCAG 2.2 AA : sémantique native, focus visibles, cibles ≥ 44 px, contrastes, lien d'évitement, thèmes clair et sombre à contrastes vérifiés, `prefers-reduced-motion` (contrôle automatisé axe à chaque livraison ; **audit manuel non réalisé**) |
| **Limitation de débit et en-têtes** | Compteurs en base partagés entre instances (formulaires, authentification, paiement) ; CSP et HSTS pilotés par l'environnement |
| **Données personnelles** | Export JSON et suppression de compte, consentements journalisés, partage de progression avec une organisation soumis à consentement explicite |
| **Visibilité** | Données structurées schema.org, `llms.txt`, robots d'IA autorisés sur les pages publiques, FAQ, flux RSS ([`docs/SEO.md`](docs/SEO.md)) |
| **Observabilité honnête** | Erreurs applicatives sans fuite d'informations ; journal d'audit ; supervision externe à brancher (voir feuille de route) |
| **Documentation vivante** | Un document par sujet, chiffres issus du code, limites écrites noir sur blanc |

Conventions : aucune concaténation SQL (requêtes paramétrées uniquement, `Q` en témoigne), requêtes d'une page regroupées dans une seule transaction, composants serveur par défaut, composants client seulement pour l'interactivité.

---

## 6. Bonnes pratiques produit

| Pratique | Application |
|---|---|
| **Promesses vérifiables** | Aucun témoignage, avis, chiffre ou logo inventé ; aucune répartition pédagogique chiffrée n'est annoncée ; durées et niveaux signalés comme indicatifs |
| **Honnêteté sur la disponibilité** | « Disponible à l'achat », « Aperçu gratuit · inscriptions bientôt ouvertes » et « En préparation » distingués ; l'utilisateur laisse son e-mail avec consentement explicite plutôt que d'acheter du vide |
| **Prix comme donnée, pas comme code** | Prix et offres modifiables en admin, historique conservé ; expérimentation de prix de lancement possible sans déploiement |
| **Jamais deux fois le même contenu** | Règle commerciale imposée par la base, pas par l'interface |
| **Évaluation humaine pour ce qui engage** | Le quiz est automatique, mais le livrable et l'attestation relèvent du formateur ; aucune IA n'est l'autorité finale |
| **Un produit pour une seule personne** | Contrôle de complétude avant publication, relecture centralisée, tableau de bord, CMS : le formateur n'a besoin ni de développeur ni d'administrateur |
| **Mesurer ce qui est mesurable** | Entonnoir de commande côté serveur ; les vues de pages ne sont pas suivies tant qu'une mesure respectueuse de la vie privée et le consentement ne sont pas en place |
| **Vie privée par défaut** | Données minimales (la vérification d'attestation n'expose que titre, date et nom), consentements enregistrés, désinscription possible, durées de conservation à définir |
| **Conformité en amont** | Sept textes légaux rédigés ([`docs/legal/`](docs/legal/)), *signalés comme à valider par un juriste* ; blocage technique des paiements réels avant revue juridique |
| **Un design par jetons** | Deux thèmes (sombre « verre » par défaut, clair sobre) définis par jetons dans `globals.css`, avec un bouton soleil/lune, préférence mémorisée dans le navigateur et sans flash au chargement ; contrastes vérifiés automatiquement ; mouvements coupés avec `prefers-reduced-motion` ([`docs/DESIGN.md`](docs/DESIGN.md)) |
| **Extensibilité sans complexité prématurée** | Cohortes et nouvelles langues prévues dans les données, sans interface spéculative ; l'offre entreprise a son interface de suivi |

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
| `npm test` | 514 tests (unitaires, base de données, intégration) |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm run db:dev` | PostgreSQL local embarqué |
| `npm run db:migrate [-- --seed] [-- --fixture]` | Applique les migrations (rejouable) |
| `npm run admin:create -- <email>` | Donne le rôle administrateur |
| `npm run seed:generate` | Régénère `db/seed.sql` depuis `src/lib/catalog/data.ts` (option `-- --migration` pour la migration des modules métier) |
| `npm run tutor:index [-- --course M4]` | Découpe les leçons en extraits pour la recherche du tuteur (à relancer après un chargement de contenu) |
| `npm run content:load -- --module M4` | Charge le contenu rédigé d'un module en brouillon (`--sync` met à jour les textes ; `--blog` pour les articles) |
| `npx playwright test` | Parcours de bout en bout (`E2E_CHANNEL=chrome` réutilise Chrome installé) |
| `npm run screenshots` | Régénère `docs/screenshots` depuis l'application qui tourne |
| `scripts/encode-hls.sh` | Encode une vidéo en HLS adaptatif et l'envoie dans le bucket (manuel ; l'admin passe par `services/video-worker`) |
| `npm run stripe:setup` | Enregistre le webhook Stripe et le portail client (clé de test d'abord) : voir [`docs/STRIPE.md`](docs/STRIPE.md) |
| `npx tsx scripts/verify-stripe-local.mts` | Rejoue localement des événements Stripe signés pour vérifier l'achat sans carte |
| `npm run check:env -- --env-file=<fichier>` | Vérifie la configuration de production (0 = aucun point bloquant) |
| `scripts/backup.sh` | Sauvegarde logique `pg_dump` (+ copie S3 facultative) |

### Configuration

Toutes les variables sont dans [`.env.example`](.env.example), regroupées par service (site, base, authentification, SMTP, stockage S3, vidéo, Stripe, tâches). Sans une variable, la fonctionnalité correspondante se désactive **explicitement** (message à l'écran ou code 503), jamais silencieusement.

---

## 8. Déployer sur Vercel et Railway

| Service | Où | Rôle |
|---|---|---|
| Application Next.js | **Vercel** (déploiement automatique à chaque push) | pages, actions serveur, API, tâche planifiée d'expiration des accès (`vercel.json`) |
| PostgreSQL 18 | **Railway** | base unique, RLS ; accessible depuis Vercel par le proxy TCP de Railway |
| MinIO | **Railway** (`services/storage`, construit depuis les sources) | fichiers privés + vidéos HLS |
| Passerelle de streaming | **Railway** (`services/stream-gateway`) | sert les segments sur jeton signé |
| Worker vidéo | **Railway** (`services/video-worker`, `ffmpeg`) | encode les vidéos téléversées en HLS |
| SMTP | **Brevo** | e-mails de confirmation et de réinitialisation (un message de test est arrivé en boîte de réception) |
| Paiement | **Stripe** (mode test, Managed Payments) | Checkout, webhook signé, portail client |

Les services Railway se déploient avec `railway up services/<nom> --path-as-root -s <nom>`. Les migrations s'appliquent avec `npm run db:migrate` (ou le workflow **Apply database migrations**) **avant** de pousser le code qui en dépend. Pas à pas, réglages réseau et vérifications : [`DEPLOYMENT.md`](DEPLOYMENT.md), [`docs/GO_LIVE.md`](docs/GO_LIVE.md) (liste de mise en production) et [`docs/STRIPE.md`](docs/STRIPE.md).

---

## 9. Ce qui est vérifié et ce qui ne l'est pas

| Élément | État |
|---|---|
| Schéma, migrations (0000 à 0013), RLS, règles d'apprentissage, de commerce, d'administration, d'entreprise | ✅ 514 tests sur PostgreSQL embarqué ; migrations appliquées en production |
| Couche d'accès (rôle par transaction, aucune fuite de privilèges entre requêtes) | ✅ testée sur une vraie connexion TCP |
| Authentification : inscription, vérification obligatoire, session HttpOnly, réinitialisation, Argon2id | ✅ testée de bout en bout |
| Application complète en navigateur (visiteur, inscription, quiz, livrable, relecture, attestation, publication, avis, sessions en visio, évaluation de niveau, démonstration, parcours entreprise) | ✅ 23 parcours Playwright sur build de production ; 3 d'entre eux dépendent de données et peuvent échouer sur une base locale non neuve (la CI repart d'une base propre) |
| Accessibilité automatisée (axe, WCAG 2.2 AA) et CSP sur les pages publiques (thèmes clair et sombre) | ✅ à chaque livraison |
| **Stripe en mode test** : achat, webhook signé, accès, remboursement, portail client | ✅ validé de bout en bout par le propriétaire ; événements signés rejoués en local |
| **SMTP Brevo** | ✅ un e-mail réel reçu ; délivrabilité sous un domaine propre (SPF, DKIM, DMARC) non vérifiée |
| **Déploiement Vercel + Railway**, migrations en production, 30 modules chargés | ✅ en ligne |
| **Stripe en mode réel**, éligibilité à Managed Payments, frais | ❌ non validés |
| **MinIO en production, encodage et lecture vidéo HLS** | ⚠️ jamais exécutés avec une vraie vidéo |
| **`docker-compose.yml`**, **restauration d'une sauvegarde**, **Google OAuth**, synthèse par modèle de langage du conseiller | ⚠️ jamais exécutés |
| Textes légaux, rôle de l'organisation cliente (RGPD), relecture des modules juridique, RH et finance par un professionnel | ❌ à faire par un juriste ou un professionnel du domaine |
| Audit d'accessibilité manuel, Lighthouse, Core Web Vitals, positionnement dans les moteurs et les assistants IA | ❌ non mesurés |

Détails et protocole : [`TESTING.md`](TESTING.md).

---

## 10. Feuille de route

| Phase | Contenu | État |
|---|---|---|
| A | Fondations, design system, schéma, catalogue, site public | ✅ |
| B | Lecteur, progression, quiz, livrables, complétion, attestations | ✅ |
| C | Stripe (Managed Payments), commandes, webhooks, accès, expiration, e-mails | ✅ validé en mode test |
| D | Administration, CMS, journal d'audit, catalogue piloté par la base | ✅ |
| — | Pile 100 % open source (PostgreSQL, Better Auth, S3, HLS, SMTP) et déploiement Vercel + Railway | ✅ |
| E | Entreprises : organisations, invitations avec consentement, licences, rapport de progression | ✅ *(non rejoué en production)* |
| F | Durcissement : limitation de débit, CSP, export et suppression RGPD, sauvegardes, accessibilité automatisée | ◐ fait ; audit manuel, supervision et restauration testée restent à faire |
| G | Contenu : 30 modules rédigés, 12 articles, scripts de 266 vidéos | ✅ rédaction ; **vidéos à enregistrer** |

**Avant d'ouvrir à la vente** (liste complète dans [`docs/GO_LIVE.md`](docs/GO_LIVE.md)) : faire valider les textes légaux et les modules sensibles ; confirmer Managed Payments ; enregistrer et téléverser les vidéos ; activer les offres ; passer Stripe en mode réel avec les deux garde-fous ; nom de domaine, SPF/DKIM/DMARC ; révoquer les clés échangées en clair pendant le développement. Idées ensuite : éditeur des règles du conseiller, mesure d'audience respectueuse de la vie privée, supervision, e-mails d'invitation et de rappel. Liste complète : [`TASKS.md`](TASKS.md).

---

## 11. Structure du dépôt et documentation

```
src/app/            routes : site public, compte, apprendre, admin, achat, API (auth, progress, stripe…)
src/components/     système de design et composants
src/lib/            db (pool, rôles), auth, catalogue, conseiller, évaluation, apprentissage, stripe, stockage, vidéo, e-mail, CMS, SEO, organisations
db/                 migrations/ (0000 plateforme … 0013 organisations), seed.sql (généré), dev-fixture.sql (démo)
content/            modules/ (30 modules rédigés, JSON), blog/ (12 articles), FORMAT.md (règles de rédaction)
services/           storage/ (MinIO), stream-gateway/, video-worker/ (services Railway)
scripts/            migrate, dev-db, create-admin, check-env, backup.sh, encode-hls.sh, generate-seed, load-content, stripe-setup, capture-screenshots
tests/ e2e/         Vitest (unitaires, base, intégration) et Playwright
docs/                guides (Stripe, sessions, entreprise, SEO, mise en production, avis), textes légaux (legal/), design ([`DESIGN.md`](docs/DESIGN.md)), captures (screenshots/ : refaites avec le nouveau design)
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
| [`docs/GO_LIVE.md`](docs/GO_LIVE.md) | liste de mise en production (ce qui reste à faire par le propriétaire) |
| [`docs/STRIPE.md`](docs/STRIPE.md) | configuration Stripe, Managed Payments, tests, remboursements |
| [`docs/SESSIONS.md`](docs/SESSIONS.md) | sessions en visio, calendrier, liste d'attente |
| [`docs/DESIGN.md`](docs/DESIGN.md) | jetons des deux thèmes, ThemeToggle, règles pour les nouveaux composants et écarts avec la maquette |
| [`docs/TUTEUR_IA.md`](docs/TUTEUR_IA.md) | tuteur IA : conception, ce qui est construit, mise en service |
| [`docs/ENTREPRISE.md`](docs/ENTREPRISE.md) | organisations, licences, suivi de progression et confidentialité |
| [`docs/SEO.md`](docs/SEO.md) | référencement et visibilité dans les assistants IA |
| [`docs/BETA_TESTERS.md`](docs/BETA_TESTERS.md) | recueillir de vrais avis |
| [`docs/legal/`](docs/legal/) | textes légaux (brouillons à faire valider) |

**Licence** : aucune n'est encore définie dans ce dépôt public ; en l'absence de licence, tous droits sont réservés. À choisir par le propriétaire.

---

## 12. Avertissement légal

Ce dépôt est un socle technique. **Il n'est ni certifié ni déclaré conforme** au droit français de la formation professionnelle, à la protection des consommateurs, au RGPD ou à l'accessibilité, et n'est pas éligible à un financement public sans vérification indépendante. Les pages légales sont des **brouillons détaillés à faire valider par un professionnel du droit**, comme les modules juridique, RH et finance (pédagogiques, sans valeur d'avis juridique). Le droit de rétractation pour contenus numériques, les conditions générales de vente, la fiscalité et les obligations de la formation professionnelle restent à traiter avant toute ouverture des paiements réels. Aucun témoignage n'a été inventé et aucune vidéo n'existe encore : les vidéos et les avis doivent être fournis par le formateur ; la biographie provient du formateur.
