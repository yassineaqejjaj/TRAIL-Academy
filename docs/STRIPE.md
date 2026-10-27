# Paiements avec Stripe

TRAIL Academy encaisse avec **Stripe Checkout** (page de paiement hébergée par Stripe : les cartes ne transitent jamais par nos serveurs). Le code est complet et testé ; ce qui reste dépend de **votre compte Stripe**.

## Ce que fait le code
- **Achat** : la commande est créée en base (règles : module publié, offre active, rien d'acheté en double), puis une session Checkout est ouverte. Client Stripe réutilisé aux achats suivants ; code promo possible ; numéro de TVA pour les professionnels ; reçu et facture par Stripe ; taxes calculées par Stripe Tax.
- **Accès** : donné **uniquement** par le webhook signé (jamais par la page de retour), de façon idempotente (un événement rejoué ne double rien). Remboursement total = accès retiré ; partiel = accès conservé ; litige = suivi.
- **Espace client** : liste des commandes, facture Stripe, portail « moyen de paiement ».
- **Garde-fous** : une clé *live* est refusée tant que `ALLOW_LIVE_PAYMENTS=true` **et** `LEGAL_REVIEW_COMPLETED=true` ne sont pas tous deux posés.

## Modèle de vente : Managed Payments (choisi)
Le site vend via **Stripe Managed Payments** : **Stripe est le vendeur officiel** (*merchant of record*). Stripe calcule et reverse la **TVA et les taxes** dans les pays concernés, prend en charge la **prévention de la fraude**, les **litiges** et le **support acheteur**, et émet les reçus et factures. Vous restez l'éditeur et le créateur du contenu.

Ce que cela change dans le code (vérifié contre l'API Stripe en mode test) :
- **Stripe Tax est toujours actif** et chaque offre porte un **code fiscal produit** : `txcd_20060158` (cours en ligne à la demande, contenu audiovisuel diffusé en continu). Stripe l'exige. Faites confirmer ce code par votre comptable (le contenu uniquement écrit a le code `txcd_20060358`).
- Stripe refuse les données de facture personnalisées et les textes personnalisés sur la page de paiement : ils ne sont pas envoyés.
- Les prix restent affichés **TTC** (la taxe est incluse dans 199 / 990 / 1 990 €) ; ce que vous recevez est le montant **net** des taxes et des frais Stripe.

À faire de votre côté :
- Vérifier dans Stripe (*Paramètres → Managed Payments*) l'**éligibilité** du compte et accepter les conditions, ainsi que les **pays** et les **types de produits** couverts : Managed Payments ne vend que des produits numériques éligibles.
- Mettre à jour vos **textes légaux** : le vendeur sur les reçus et factures n'est plus vous. Les brouillons (`docs/legal/`) contiennent des passages à adapter avec un juriste (CGV, rétractation, mentions, confidentialité : Stripe devient aussi destinataire des données de paiement).
- Comprendre le **calendrier de versement** et les **frais** de Managed Payments (différents du paiement standard) avant de fixer vos prix.

Pour vendre en votre nom propre plutôt que via Managed Payments : `STRIPE_MANAGED_PAYMENTS=off` (le code bascule sur l'autre modèle : TVA via Stripe Tax si `STRIPE_AUTOMATIC_TAX=true`, factures personnalisées, texte d'acceptation des CGV).

## Mise en route en mode test (≈ 15 minutes)
1. **Créez ou ouvrez votre compte Stripe** (stripe.com) et restez en **mode test** (bascule en haut à droite). Le mode test ne déplace aucun argent.
2. **Clé secrète de test** : *Développeurs → Clés API* → copiez `sk_test_…` (ou créez une clé restreinte `rk_test_…` avec écriture sur Checkout Sessions, Customers, Billing Portal, Webhook Endpoints, Invoices et lecture sur Balance).
3. Dans **Vercel → Settings → Environment Variables** (Production), ajoutez `STRIPE_SECRET_KEY` = cette clé. Ne la communiquez à personne et ne la mettez jamais dans le dépôt.
4. **Enregistrez le webhook et le portail** depuis votre poste, une seule commande :
   ```bash
   STRIPE_SECRET_KEY=sk_test_… NEXT_PUBLIC_SITE_URL=https://trailacademy.fr npm run stripe:setup
   ```
   Elle crée l'endpoint `…/api/stripe/webhook` avec les huit événements utiles et la configuration du portail client, puis affiche le **secret de signature** (`whsec_…`) **une seule fois**.
5. Ajoutez ce secret dans Vercel : `STRIPE_WEBHOOK_SECRET`. **Redéployez** (Deployments → Redeploy) pour que les variables soient prises en compte.
6. **Activez une offre** : *Administration → Produits et prix* → activez l'offre d'un module publié (un module n'est vendable que publié **et** actif).
7. **Vérifiez** : *Administration → Mise en production* doit afficher « API Stripe », « Webhook enregistré chez Stripe » et « Portail de facturation » en vert.
8. **Achat de test** avec un compte apprenant : carte `4242 4242 4242 4242`, date future, CVC quelconque. Contrôlez : retour sur « Paiement confirmé », accès ouvert au module, commande « Payée » dans *Mes commandes*, facture téléchargeable.
9. **Remboursement de test** depuis le tableau de bord Stripe : l'accès doit être retiré (remboursement total) et la commande passer à « Remboursée ».

## Avant le mode live (rien de cela n'est fait pour vous)
- Compte Stripe **activé** : informations de l'entreprise, compte bancaire, vérification d'identité.
- **Managed Payments** : éligibilité, conditions acceptées, pays et produits couverts (voir plus haut).
- **TVA et factures** : prises en charge par Stripe en tant que vendeur officiel ; vérifiez toutefois vos propres obligations de déclaration de revenus et le traitement comptable des versements nets avec votre comptable.
- **Textes légaux validés** (CGV, rétractation) : voir `docs/legal/`. La renonciation au droit de rétractation n'est **pas** implémentée.
- Paiements d'un autre pays, SEPA, Apple Pay : à activer dans Stripe (*Paramètres → Moyens de paiement*) ; Checkout les propose alors automatiquement.
- Clé `sk_live_…`, **nouveau** webhook en mode live (relancez `npm run stripe:setup` avec `--live`), puis `ALLOW_LIVE_PAYMENTS=true` et `LEGAL_REVIEW_COMPLETED=true`.
- Premier achat réel sur votre propre carte, puis remboursement.

## Vérification déjà faite (sans carte)
`scripts/verify-stripe-local.mts` rejoue le parcours en local contre **Stripe en mode test** : inscription, clic sur « acheter », **vraie session Checkout** créée et page Stripe atteinte, commande en attente liée à la session (199,00 €, Stripe Tax actif), puis événements **signés** construits à partir de cette session réelle : signature invalide refusée, paiement confirmé → accès ouvert, rejeu sans doublon, remboursement total → accès retiré. Tout passe. Ce script ne remplit jamais le formulaire de carte.

## Ce qui n'a jamais été exécuté
Aucune carte n'a été saisie sur la page de Stripe : l'événement « paiement réussi » est simulé (signé avec un secret local). Reste à valider avec une vraie carte de test sur la page Stripe (étape 8) : la livraison réelle du webhook de production, le reçu Stripe et la carte `4242…`.
