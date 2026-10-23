# Liste des tâches

Légende : ✅ fait et testé · 🟡 construit, **non exécuté contre le service réel** · ⬜ à faire.

## Fondations (phase A) ✅
Design system, catalogue (18 modules, 4 phases, parcours, offres), site public, conseiller déterministe, formulaire de devis, pages légales (modèles), sitemap/robots, CI.

## Apprentissage (phase B)
- ✅ Progression, reprise, notes, signets, plan du cours, quiz (correction en base), livrables, règles de complétion, attestation + vérification publique (testé en base et en navigateur)
- 🟡 Lecture vidéo HLS via la passerelle (passerelle testée avec un faux stockage ; jamais jouée par `hls.js` sur un vrai bucket)
- 🟡 Envoi direct de fichiers vers S3 (signature de la politique testée hors ligne ; jamais envoyé vers un vrai MinIO)
- ⬜ File de relecture des réponses libres de quiz · ⬜ attestation PDF · ⬜ e-mail à la complétion

## Commerce (phase C)
- ✅ Règles d'achat, traitement idempotent des événements (paiement, échec, expiration, remboursement total/partiel, litige), vérification de signature (signatures réelles)
- 🟡 Session Checkout, portail de facturation, factures, Stripe Tax, codes promo, remboursement depuis l'admin — jamais exécutés contre Stripe
- 🟡 E-mails de confirmation et de remboursement (SMTP non testé)
- ⬜ E-mail d'échec de paiement, rappels d'expiration
- ⬜ **Validation juridique** (CGV, rétractation, formation professionnelle, taxes) — bloque l'ouverture réelle

## Administration (phase D) ✅ (testée en base et en navigateur)
Tableau de bord, modules (création, contenu, publication conditionnée), parcours, produits et prix (historique), coupons (synchronisation Stripe 🟡), commandes, apprenants, relecture, CMS, journal d'audit.
- ⬜ Éditeur des règles du conseiller · ⬜ écran de paramètres et conformité · ⬜ transcodage vidéo depuis le navigateur · ⬜ dates de début/fin automatiques pour les prix de lancement

## Migration pile open source ✅
PostgreSQL + RLS (rôle par transaction), Better Auth, S3 (MinIO), HLS auto-hébergé, SMTP, 9 parcours e2e, 185 tests.
- ✅ CI GitHub (types, lint, tests, audit, build, e2e) exécutée avec succès
- 🟡 PostgreSQL serveur réel · 🟡 `docker-compose.yml` · 🟡 workflow de migration manuel · 🟡 Google OAuth

## Entreprises (phase E) ⬜
Organisations, licences (Team 5/20), attribution de sièges, invitations, rapports. Modèle de données et politiques déjà en place ; interface à construire.

## Durcissement (phase F) ⬜
Audit d'accessibilité automatisé, Lighthouse/Core Web Vitals, CSP, limiteurs partagés pour les formulaires, antivirus des fichiers, suppression/export de compte, consentement cookies + mesure d'audience, supervision (GlitchTip/OpenTelemetry), sauvegardes et restauration testées, tests de charge.

## Décisions en attente
- Contenu exact de **AI Mastery Mentored** (et passage depuis AI Mastery) avant ouverture.
- Titre de l'accueil : brief (« Maîtrisez l'IA. Appliquez-la à votre métier. ») ou design (« Devenez le professionnel qui maîtrise vraiment l'IA. ») — modifiable dans le CMS.
- Licence du dépôt public.

## Dépendances externes
Railway (PostgreSQL, MinIO, passerelle) · Vercel · Stripe (mode test d'abord) · relais SMTP · domaine · contenus et biographie du formateur · revue juridique · supervision.
