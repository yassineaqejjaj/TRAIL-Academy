# Mise en production — checklist

Ce document sépare **ce que le code garantit et que les tests vérifient** de **ce que vous seul pouvez faire ou valider**. Rien n'est coché ici à votre place.

L'écran **Administration → Mise en production** (et `npm run check:env`) lit la configuration et interroge la base, le stockage et la passerelle vidéo. Il vous dit ce qui manque ; il ne prouve pas qu'un paiement ou un e-mail réel fonctionne.

## 0. État du déploiement (23 octobre 2026)

| Élément | État |
|---|---|
| Vercel — site | En ligne : https://trailacademy.fr (projet `trail-academy`, relié au dépôt GitHub : chaque push sur `main` redéploie) |
| Railway — projet `trail-academy` | PostgreSQL 18, `storage` (MinIO construit depuis les sources, volume `/data`), `stream-gateway`, `video-worker` : en ligne |
| Migrations 0000→0008 + catalogue | Appliquées sur le vrai PostgreSQL de Railway |
| Bucket `trail` | Créé |
| Variables Vercel | Posées, **sauf** : SMTP (`SMTP_URL`, `EMAIL_FROM`), `LEADS_TO_EMAIL`, `NEXT_PUBLIC_CONTACT_EMAIL`, Stripe (`STRIPE_*`) |
| Premier administrateur, vidéos, pages légales, Stripe | **À faire** (sections 2.A, 2.C, 2.D) |

Sans SMTP, personne ne peut confirmer son e-mail, donc **aucun compte ne peut se connecter** : c'est le premier point à régler.

## 1. Ce qui est prêt dans le code (vérifié par les tests)

| Domaine | État |
|---|---|
| Parcours acheteur et apprenant, administration, quiz, livrables, attestations | Testé (SQL sur PostgreSQL embarqué, unitaires, 9+ parcours Playwright sur build de production) |
| Trois offres : Module 199 € · Parcours 990 € · AI Mastery 1 990 € (TTC) ; entreprises sur devis | Testé |
| Sécurité : RLS, Argon2id, e-mail vérifié obligatoire, limites de débit partagées en base, CSP, HSTS, en-têtes | Testé (en-têtes et absence de violation CSP vérifiées dans le navigateur) |
| RGPD : export JSON et suppression de compte (anonymisation des commandes conservées) | Testé |
| Accessibilité : audit automatisé axe-core (WCAG 2.2 AA, clair et sombre) | Testé — **un audit manuel reste nécessaire** |
| Chaîne vidéo : envoi depuis l'admin → encodage ffmpeg HLS → rattachement à la leçon | Testé avec un vrai ffmpeg sur un échantillon ; **non testé** de bout en bout avec MinIO/Railway |
| Erreurs : pages d'erreur, journal JSON structuré des erreurs serveur | En place |

## 2. Ce que seul vous pouvez faire

### A. Identité et juridique (bloquant avant tout paiement réel)
1. Compléter les brouillons de `docs/legal/` (identité de l'éditeur, SIREN, TVA, médiateur…) et les faire relire par un juriste.
2. Décider du **droit de rétractation** pour un accès numérique immédiat. La plateforme n'implémente aucune renonciation : à définir avec le juriste, puis à faire développer si nécessaire.
3. Décider si l'achat d'un parcours doit **créditer** les modules déjà achetés. Aujourd'hui : non (le prix n'est pas réduit), c'est affiché ainsi.
4. Coller les textes validés dans **Contenu du site → Pages légales**.
5. Renseigner `NEXT_PUBLIC_CONTACT_EMAIL` et `LEADS_TO_EMAIL`.

### B. Infrastructure (voir `DEPLOYMENT.md` pour le pas-à-pas)
1. **Railway** : PostgreSQL, MinIO (ou autre S3), `stream-gateway`, `video-worker` (nouveau : `services/video-worker`, avec ffmpeg), puis `npm run db:migrate -- --seed`.
2. **Vercel** : le site Next.js, toutes les variables de `.env.example` (les `S3_*` et `STREAM_GATEWAY_URL` doivent exister **au build** : la CSP en est dérivée).
3. **Stockage** : bucket privé, règle CORS autorisant `POST` depuis l'adresse du site (envois directs depuis le navigateur).
4. **Domaine** et HTTPS ; `NEXT_PUBLIC_SITE_URL` et `BETTER_AUTH_URL` en `https://…`.
5. **E-mail** : fournisseur SMTP, enregistrements SPF, DKIM et DMARC du domaine. Tant que ce n'est pas fait, les e-mails de confirmation risquent d'atterrir en spam.
6. **Premier administrateur** : `npm run admin:create` (en pointant `DATABASE_URL` vers la base de production).
7. **Sauvegardes** : planifier `scripts/backup.sh` (+ copie du bucket avec `mc mirror` vers un autre fournisseur). Faire **un essai de restauration** avant d'en dépendre. Le script n'a été vérifié que sur sa syntaxe.

### C. Paiement (pas à pas dans `docs/STRIPE.md`)
0. **Managed Payments** (Stripe vendeur officiel) : éligibilité du compte, conditions, frais et calendrier de versements ; adapter CGV et mentions légales en conséquence (le vendeur sur les reçus n'est plus vous).
1. Compte Stripe activé, informations de l'entreprise, TVA / Stripe Tax selon votre cas.
2. Essai complet **en mode test** : achat avec la carte `4242 4242 4242 4242`, réception du webhook, accès ouvert, facture, remboursement. Rien de cela n'a été exécuté contre Stripe.
3. Déclarer le webhook `https://<votre-domaine>/api/stripe/webhook` et renseigner `STRIPE_WEBHOOK_SECRET`.
4. Seulement ensuite : clé `sk_live_…` **et** `ALLOW_LIVE_PAYMENTS=true` **et** `LEGAL_REVIEW_COMPLETED=true`.

### D. Contenu
1. Encoder et envoyer les vidéos (Administration → Cours → Contenu → leçon → Vidéo). Ajouter sous-titres et transcriptions.
2. Rédiger les leçons, quiz, livrables, ressources ; publier chaque module (la publication est bloquée tant qu'il manque des éléments).
3. Activer l'offre de chaque module dans **Produits et prix** (un module n'est vendable que publié **et** actif).
4. Ajouter la biographie du formateur dans **Contenu du site → Formateur**. Aucun texte biographique n'est inventé dans le code.
5. N'ajouter des témoignages que réels, vérifiés et autorisés.

### E. Dernières vérifications
1. `npm run check:env -- --env-file=<fichier de production>` → 0 bloquant.
2. Écran **Mise en production** → tous les points « OK ».
3. Un achat réel de test (module le moins cher) sur votre propre carte, puis remboursement, avant l'ouverture au public.
4. Audit d'accessibilité manuel (clavier + lecteur d'écran) et Lighthouse sur la page d'accueil et une leçon.

## 2bis. Spécifique aux sessions et au conseiller
- Sessions : le service Jitsi public est gratuit mais sans garantie ; décidez si vous auto-hébergez. Informez les participants avant tout enregistrement. Les e-mails de confirmation exigent le SMTP.
- Conseiller : la synthèse par modèle de langage est **désactivée** tant que `ADVISOR_LLM_URL` et `ADVISOR_LLM_MODEL` ne sont pas définis. Si vous l'activez, le texte saisi est envoyé à ce modèle (mentionnez-le dans la politique de confidentialité) et il faut tester la qualité des synthèses : seule l'intégration avec un faux serveur a été testée.

## 3. Ce qui n'a jamais été exécuté (à dire clairement)

Stripe (test ou live) · PostgreSQL « serveur » (les tests utilisent PGlite) · MinIO/S3 réels (envoi, CORS) · lecture HLS dans un navigateur via la passerelle · SMTP réel · Google OAuth · déploiements Vercel et Railway · `docker-compose.yml` · `scripts/backup.sh` · performance sous charge.

## Suite de l'audit du 27 octobre 2026

**Déjà traité dans le code** : chiffres du catalogue calculés depuis une source unique (plus de « 18 » ou « 4 phases » en dur), trois états de disponibilité (« Disponible à l'achat », « Aperçu gratuit · inscriptions bientôt ouvertes », « En préparation »), liste d'attente visible partout (bandeau, accueil, page `/ouverture`, fiches modules) avec choix de la formation, accueil refondu autour des résultats et de trois formations phares (Prompt Engineering, Vibe Coding, Agentic AI), méthode 70/20/10 remplacée par le cycle Comprendre, Essayer, Vérifier, Livrer (concret et vérifiable), trois offres entreprise (AI Discovery Workshop, AI Skills Accelerator, Enterprise AI Academy), titres des fiches plus explicites pour le référencement, trame de trois e-mails ([`EMAILS_LANCEMENT.md`](EMAILS_LANCEMENT.md)).

**Reste à faire par vous (le code ne peut pas le décider)** :

1. **Nom de domaine : fait** (`trailacademy.fr`, acheté chez OVH et relié à Vercel ; `NEXT_PUBLIC_SITE_URL` et `BETTER_AUTH_URL` pointent dessus). Reste : mettre à jour l'URL du webhook Stripe avec `npm run stripe:setup` (ou dans le tableau de bord Stripe) vers `https://trailacademy.fr/api/stripe/webhook`, ajouter le domaine dans Search Console, et configurer SPF, DKIM et DMARC chez OVH pour l'envoi d'e-mails depuis ce domaine.
2. **Pages légales.** Compléter les champs `[À COMPLÉTER]` de `docs/legal/` (identité, SIREN, adresse, TVA, médiateur, hébergement), les faire valider, puis les publier dans l'administration. Vérifier avec un professionnel la **déclaration d'activité** de prestataire de formation (délai à respecter après la première convention ou le premier contrat) et la nécessité de **Qualiopi** si vous visez des financements publics ou mutualisés (OPCO).
3. **Service de relecture des livrables.** Décider et afficher : nombre de soumissions incluses, délai de réponse visé, critères d'acceptation. Aujourd'hui rien n'est promis publiquement ; à fixer avant les ventes pour tenir la promesse quand le volume augmente.
4. **Crédit lors du passage d'un module à un parcours.** Décider si le prix d'un module déjà acheté est déduit du parcours. Ce n'est pas implémenté : il faut une règle commerciale puis un code promo ou un calcul dans la commande.
5. **Premier lancement.** Ouvrir d'abord les trois formations phares : enregistrer leurs vidéos (scripts fournis), activer leurs offres, vérifier un achat réel en mode test puis réel, puis mettre `NEXT_PUBLIC_SALES_OPEN=true` pour retirer le bandeau « inscriptions bientôt ouvertes ».
6. **Preuves.** Ajouter des avis authentiques (lien privé à usage unique), des exemples de travaux d'apprenants avec leur accord, des extraits de projets que vous avez le droit de partager. Distinguer toujours les « 1 500 professionnels formés » (expérience personnelle) du nombre d'apprenants de la plateforme.
7. **Mesure.** Mettre en place Search Console et, si vous le souhaitez, une mesure d'audience respectueuse de la vie privée (Plausible ou Umami, avec la page cookies mise à jour) pour suivre inscriptions, clics vers les aperçus et achats. Lancer un Lighthouse mobile et corriger ce qu'il relève : aucune mesure de vitesse n'a été faite.
