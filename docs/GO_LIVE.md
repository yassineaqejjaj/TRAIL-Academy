# Mise en production — checklist

Ce document sépare **ce que le code garantit et que les tests vérifient** de **ce que vous seul pouvez faire ou valider**. Rien n'est coché ici à votre place.

L'écran **Administration → Mise en production** (et `npm run check:env`) lit la configuration et interroge la base, le stockage et la passerelle vidéo. Il vous dit ce qui manque ; il ne prouve pas qu'un paiement ou un e-mail réel fonctionne.

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

### C. Paiement
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

## 3. Ce qui n'a jamais été exécuté (à dire clairement)

Stripe (test ou live) · PostgreSQL « serveur » (les tests utilisent PGlite) · MinIO/S3 réels (envoi, CORS) · lecture HLS dans un navigateur via la passerelle · SMTP réel · Google OAuth · déploiements Vercel et Railway · `docker-compose.yml` · `scripts/backup.sh` · performance sous charge.
