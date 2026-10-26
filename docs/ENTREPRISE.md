# Offre entreprise : suivi de progression par organisation

## Fonctionnement

1. **Devis signé** (hors plateforme). Vous créez ensuite, dans **Administration → Entreprises** : l'organisation, un lien d'invitation pour le responsable, un pack de licences (nombre de places, parcours, date de fin).
2. Le **responsable** crée son compte, ouvre son lien privé (usage unique, 14 jours par défaut) et accepte. Il accède à **Mon équipe**.
3. Le responsable crée des liens d'invitation pour ses collaborateurs. Chaque collaborateur crée un compte, ouvre son lien et **accepte explicitement le partage de sa progression**.
4. Le responsable **attribue une licence** (parcours du pack) : la personne reçoit l'accès aux modules du parcours jusqu'à la date de fin du pack. Retirer la licence retire cet accès (pas les achats personnels).
5. **Suivi** : progression par module, quiz réussis, dernière activité, moyenne de l'équipe, export CSV.

## Confidentialité (par conception)

- Le responsable lit le suivi uniquement via `org_progress_report()` : jamais les réponses aux quiz, notes, livrables ni retours du formateur (testé dans `tests/organizations.test.ts`).
- Un membre non accepté n'est jamais visible. Un membre peut quitter l'organisation à tout moment (**Mon espace → Mon organisation**) : le partage s'arrête et les licences reçues sont retirées. Les consentements et retraits sont journalisés (`consent_records`).
- Les liens d'invitation ne sont stockés que sous forme de hash et ne s'affichent qu'une fois.

## Limites actuelles

- Pas de paiement ni de facturation dans la plateforme : tout passe par le devis.
- Les invitations se font par lien à copier (aucun e-mail automatique).
- Pas de rapports planifiés par e-mail, pas de groupes ni d'objectifs d'équipe.
- Les textes de confidentialité décrivant ce partage sont des brouillons à faire valider (voir `docs/legal/`), notamment le rôle de l'organisation cliente dans le traitement des données.
