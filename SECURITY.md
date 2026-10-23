# Sécurité et conformité

## En place

- **Autorisation en trois couches** (proxy optimiste → code serveur → RLS et fonctions revérifiant `is_admin()`), RLS sur toutes les tables, rôle PostgreSQL par transaction.
- **Authentification** (Better Auth) : Argon2id, e-mail vérifié obligatoire, cookies `HttpOnly` (et `Secure` en HTTPS), sessions en base, réinitialisation qui révoque les sessions, mêmes messages pour compte inconnu et mauvais mot de passe, limitation de débit en base (5 connexions/min, 5 inscriptions/10 min) plus une seconde limite par IP en mémoire.
- **Fichiers** : extensions **et** types MIME en liste blanche, taille plafonnée par la politique du bucket, noms assainis, clés préfixées par propriétaire vérifiées côté serveur et par la base, objet confirmé avant enregistrement, liens de téléchargement de 60 s, bucket jamais public.
- **Vidéo** : aucun lien permanent ; jeton HS256 de 2 h lié à un média ; la passerelle refuse toute traversée de chemin et toute extension inconnue.
- **Paiement** : signature Stripe vérifiée sur le corps brut, recoupement session/devise, traitement atomique et idempotent, accès accordé uniquement par webhook, remboursement demandé depuis l'admin mais appliqué à la réception du webhook ; clés *live* refusées sans `ALLOW_LIVE_PAYMENTS=true` **et** `LEGAL_REVIEW_COMPLETED=true`.
- **Entrées** : Zod partout, requêtes SQL toujours paramétrées, Markdown sans HTML brut, JSON-LD échappé, redirections limitées au même site.
- **Traçabilité** : journal d'audit en écriture seule ; toute action manuelle sensible (accès, remboursement) exige un motif.
- **Données** : consentements enregistrés (`consent_records`), vérification d'attestation à données minimales, e-mails d'inscription normalisés et dédoublonnés sans énumération.
- **Secrets** : uniquement variables d'environnement ; `.env*` ignorés ; clé de service jamais exposée au navigateur.
- **Dépendances** : `npm audit --omit=dev` = 0 vulnérabilité ; vérifié en CI.

## Limites connues

- Limiteur de débit **partagé en base** (`hit_rate_limit`, migration 0006) pour devis, intérêt, progression, achat, envois et actions de connexion ; en cas de panne de la base il laisse passer et journalise (les endpoints protégés dépendent de la même base).
- **CSP** (`config/security-headers.ts`) dérivée de l'environnement : `object-src 'none'`, `frame-ancestors 'none'`, sources média/connexion limitées au stockage et à la passerelle configurés, `form-action` limité à soi-même, Stripe Checkout et Google ; HSTS en HTTPS. `script-src` conserve `'unsafe-inline'` (scripts d'amorçage de Next.js) : une CSP à nonce rendrait toutes les pages dynamiques.
- **RGPD** : export JSON (`export_my_data`) et suppression de compte (`anonymize_user`) depuis *Mon espace → Mes données* ; commandes et paiements conservés sans lien avec la personne. Le compte client Stripe n'est pas supprimé automatiquement.
- Pas de CSP, pas d'analyse antivirus des fichiers envoyés, pas de suppression/export de compte en libre-service, pas de consentement cookies ni de mesure d'audience, pas de supervision d'erreurs branchée.
- Le streaming signé dissuade le partage ; il n'empêche pas absolument de copier une vidéo.
- Pool de connexions serverless : prévoir PgBouncer ou un pool réduit.

## Blocages juridiques avant tout paiement réel (non traités par le code, volontairement)

Obligations de la formation professionnelle en France, droit de rétractation et consentement pour contenus numériques (aucune renonciation générique n'est codée), conditions générales de vente, fiscalité et facturation, informations RGPD et durées de conservation, déclaration d'accessibilité. Les textes légaux fournis sont des **modèles à faire valider par un professionnel du droit**.
