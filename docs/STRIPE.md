# Paiements avec Stripe

TRAIL Academy encaisse avec **Stripe Checkout** (page de paiement hébergée par Stripe : les cartes ne transitent jamais par nos serveurs). Le code est complet et testé ; ce qui reste dépend de **votre compte Stripe**.

## Ce que fait le code
- **Achat** : la commande est créée en base (règles : module publié, offre active, rien d'acheté en double), puis une session Checkout est ouverte. Client Stripe réutilisé aux achats suivants ; code promo possible ; facture générée par Stripe ; TVA par **Stripe Tax** si `STRIPE_AUTOMATIC_TAX=true`.
- **Accès** : donné **uniquement** par le webhook signé (jamais par la page de retour), de façon idempotente (un événement rejoué ne double rien). Remboursement total = accès retiré ; partiel = accès conservé ; litige = suivi.
- **Espace client** : liste des commandes, facture Stripe, portail « moyen de paiement ».
- **Garde-fous** : une clé *live* est refusée tant que `ALLOW_LIVE_PAYMENTS=true` **et** `LEGAL_REVIEW_COMPLETED=true` ne sont pas tous deux posés.

## Mise en route en mode test (≈ 15 minutes)
1. **Créez ou ouvrez votre compte Stripe** (stripe.com) et restez en **mode test** (bascule en haut à droite). Le mode test ne déplace aucun argent.
2. **Clé secrète de test** : *Développeurs → Clés API* → copiez `sk_test_…` (ou créez une clé restreinte `rk_test_…` avec écriture sur Checkout Sessions, Customers, Billing Portal, Webhook Endpoints, Invoices et lecture sur Balance).
3. Dans **Vercel → Settings → Environment Variables** (Production), ajoutez `STRIPE_SECRET_KEY` = cette clé. Ne la communiquez à personne et ne la mettez jamais dans le dépôt.
4. **Enregistrez le webhook et le portail** depuis votre poste, une seule commande :
   ```bash
   STRIPE_SECRET_KEY=sk_test_… NEXT_PUBLIC_SITE_URL=https://trail-academy.vercel.app npm run stripe:setup
   ```
   Elle crée l'endpoint `…/api/stripe/webhook` avec les huit événements utiles et la configuration du portail client, puis affiche le **secret de signature** (`whsec_…`) **une seule fois**.
5. Ajoutez ce secret dans Vercel : `STRIPE_WEBHOOK_SECRET`. **Redéployez** (Deployments → Redeploy) pour que les variables soient prises en compte.
6. **Activez une offre** : *Administration → Produits et prix* → activez l'offre d'un module publié (un module n'est vendable que publié **et** actif).
7. **Vérifiez** : *Administration → Mise en production* doit afficher « API Stripe », « Webhook enregistré chez Stripe » et « Portail de facturation » en vert.
8. **Achat de test** avec un compte apprenant : carte `4242 4242 4242 4242`, date future, CVC quelconque. Contrôlez : retour sur « Paiement confirmé », accès ouvert au module, commande « Payée » dans *Mes commandes*, facture téléchargeable.
9. **Remboursement de test** depuis le tableau de bord Stripe : l'accès doit être retiré (remboursement total) et la commande passer à « Remboursée ».

## Avant le mode live (rien de cela n'est fait pour vous)
- Compte Stripe **activé** : informations de l'entreprise, compte bancaire, vérification d'identité.
- **Réglages de facturation** dans Stripe : raison sociale, adresse, numéro de TVA et mentions obligatoires sur les factures. Les factures Stripe ne remplacent pas votre obligation de mentions légales françaises : faites-les valider.
- **TVA** : décidez de votre régime (franchise en base ou TVA) ; si TVA, activez Stripe Tax et `STRIPE_AUTOMATIC_TAX=true`.
- **Textes légaux validés** (CGV, rétractation) : voir `docs/legal/`. La renonciation au droit de rétractation n'est **pas** implémentée.
- Paiements d'un autre pays, SEPA, Apple Pay : à activer dans Stripe (*Paramètres → Moyens de paiement*) ; Checkout les propose alors automatiquement.
- Clé `sk_live_…`, **nouveau** webhook en mode live (relancez `npm run stripe:setup` avec `--live`), puis `ALLOW_LIVE_PAYMENTS=true` et `LEGAL_REVIEW_COMPLETED=true`.
- Premier achat réel sur votre propre carte, puis remboursement.

## Ce qui n'a jamais été exécuté
Aucun paiement n'a été réalisé contre Stripe (ni en test) : le code est vérifié par des tests avec des événements signés simulés et un faux client Stripe, pas contre le service réel. Votre achat de test (étape 8) est la vraie validation.
