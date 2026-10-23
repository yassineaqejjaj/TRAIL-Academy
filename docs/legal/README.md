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
