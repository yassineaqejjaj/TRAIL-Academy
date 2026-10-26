# Textes légaux — brouillons

Ces sept textes sont des **points de départ rédigés à partir de ce que la plateforme fait réellement** (données collectées, sous-traitants, cookies, prix, durées d'accès). Ils ne sont **ni publiés ni validés** : le code ne contient aucun texte juridique définitif.

## Comment les publier

1. Compléter chaque `[À COMPLÉTER : …]` (identité de l'éditeur, SIREN, médiateur, etc.).
2. Les faire relire par un juriste (CGV, droit de rétractation, formation professionnelle et RGPD en particulier).
3. Dans l'administration : **Contenu du site → Pages légales**, coller le texte de chaque page (Markdown) et enregistrer. La page publique affiche tant qu'elle n'est pas finalisée un bandeau « validation juridique requise ».
4. Quand tout est validé : mettre `LEGAL_REVIEW_COMPLETED=true` (avec `ALLOW_LIVE_PAYMENTS=true`) — c'est le garde-fou technique qui autorise les paiements réels. Il ne remplace pas la relecture.

L'écran **Administration → Mise en production** indique combien de pages légales sont renseignées.

## Points que le code ne décide pas à votre place

- **Droit de rétractation** : l'accès aux contenus numériques est immédiat après paiement. La renonciation expresse au droit de rétractation (avec recueil du consentement avant l'achat) est un choix juridique : **elle n'est pas implémentée** tant que vous ne l'avez pas arrêtée avec un juriste.
- **TVA** : les prix sont affichés TTC ; le calcul réel dépend de votre statut (franchise en base, taux, TVA intracommunautaire) et de la configuration Stripe Tax.
- **Formation professionnelle** : si vous vendez à des entreprises ou via des financements (OPCO, CPF), les obligations spécifiques (déclaration d'activité, Qualiopi, convention de formation) sont à traiter hors plateforme.

## Ce que contiennent les brouillons (version complète)

Sept textes rédigés à partir du fonctionnement réel de la plateforme (Stripe Managed Payments, sessions en direct, avis sur invitation, conseiller local, cookies strictement nécessaires). Chacun garde son bandeau « BROUILLON … JURISTE » (vérifié par `tests/legal-drafts.test.ts`) : **retirez le bandeau seulement après relecture par un juriste.**

- `[À COMPLÉTER : …]` = fait que seul l'éditeur connaît (identité, SIREN, adresse, médiateur, régions d'hébergement, durées).
- `[À VALIDER : …]` = choix juridique à arrêter (rôle du vendeur dans Managed Payments, rétractation et renonciation, TVA, limitation de responsabilité, transferts hors UE, juridiction).

Points à faire examiner en priorité : qui est le vendeur dans les CGV avec Managed Payments ; régime de rétractation pour un contenu numérique à accès immédiat (non implémenté) ; sous-traitants et transferts hors UE ; statut de l'éditeur (TVA, déclaration d'activité, Qualiopi) ; obligation de déclaration d'accessibilité ; propriété intellectuelle des supports (une partie des slides d'origine portait la marque d'un employeur : à régler avant publication).
