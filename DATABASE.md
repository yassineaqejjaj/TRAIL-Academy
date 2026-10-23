# Base de données

PostgreSQL ≥ 15. Migrations dans `db/migrations/` (rejouables avec `npm run db:migrate`, enregistrées dans `auth.schema_migrations`, une transaction par fichier). Le seed (`db/seed.sql`) est **généré** depuis `src/lib/catalog/data.ts` ; il ne contient ni client, ni revenu, ni témoignage. `db/dev-fixture.sql` ajoute du contenu de démonstration clairement factice (jamais en production : `--fixture` est refusé quand `NODE_ENV=production`).

| Fichier | Contenu |
|---|---|
| `0000_platform.sql` | Rôles `anon` / `authenticated` / `service_role`, schéma `auth` (tables Better Auth : `users`, `sessions`, `accounts`, `verifications`, `rate_limits`), `auth.uid()`, privilèges par défaut |
| `0001_schema.sql` | Types, identité (`profiles`, `user_roles` + trigger de création), catalogue, commerce, entreprise, apprentissage, CMS, exploitation, `provision_order` |
| `0002_rls.sql` | RLS **activée sur toutes les tables** (refus par défaut), fonctions `is_admin`, `has_active_entitlement`, `can_view_lesson`, politiques |
| `0003_learning.sql` | Progression, notes, signets, `record_lesson_progress`, `submit_quiz`, `get_quiz_options`, `try_complete_course`, attestations, `verify_attestation`, `expire_entitlements` |
| `0004_commerce.sql` | `create_checkout_order`, `attach_checkout_session`, `process_stripe_event` |
| `0005_admin.sql` | Journal d'audit (triggers), `publish_course` / `course_readiness`, prix, ordre, accès manuels, relecture, `admin_metrics`, `interest_signups` |
| `0006_rate_limit.sql` | Limiteur de débit partagé : `app_rate_limits`, `hit_rate_limit`, `purge_rate_limits` (service uniquement) |
| `0007_gdpr.sql` | `export_my_data` (utilisateur, ses données seulement), `anonymize_user` (service) |
| `0008_video_pipeline.sql` | File d'encodage : `video_assets`, `admin_register_video`, `admin_retry_video`, `claim_video_job` (SKIP LOCKED, reprise après 30 min, 3 essais), `finish_video_job` |

## Rôles et identité

Le compte de connexion de l'application doit pouvoir créer des rôles (super-utilisateur, comme sur Railway). À chaque transaction : `SET LOCAL ROLE …` puis `set_config('app.uid', <uuid>, true)` ; `auth.uid()` lit ce réglage. Les tables du schéma `auth` n'ont **aucun droit** accordé aux trois rôles : seule la bibliothèque d'authentification, connectée en propriétaire, les lit.

## Contraintes et règles notables

- Accès uniques par `(user_id, course_id)` : racheter prolonge, ne duplique jamais.
- `processed_webhook_events.stripe_event_id` unique : idempotence.
- `audit_logs` : écriture seule (trigger de refus de modification/suppression, aucune politique de suppression).
- Un seul prix actif par produit ; l'historique reste ; `order_items` fige prix et durée.
- Un témoignage ne peut être publié sans vérification et référence de consentement (contrainte).
- Les bonnes réponses (`quiz_options`) ne sont lisibles que par l'administrateur ; les apprenants passent par `get_quiz_options`, qui ne les renvoie pas.
- Les clés d'objet de livrable doivent commencer par `submissions/<id utilisateur>/` (politique d'insertion).

## Politique de révocation d'accès (à confirmer juridiquement)

Remboursement total : accès de la commande retiré · partiel : conservé · litige ouvert : suspendu · gagné : rétabli (expiration recalculée à la date de rétablissement) · perdu : reste retiré. Rembourser une ancienne commande ne retire pas un accès qu'une commande plus récente a prolongé.

## Vérification

Migrations, politiques et fonctions sont testées sur PostgreSQL embarqué (PGlite) ; les migrations sont aussi appliquées sur une base réelle en TCP. **Non exécuté sur un serveur PostgreSQL de production.**
