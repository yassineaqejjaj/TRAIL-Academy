# Produit

## Grille tarifaire (seed ; modifiable en admin, historique conservé)

| Offre | Prix | Accès |
|---|---|---|
| Module Standard (14 modules) | 199 € TTC | 12 mois |
| Module Avancé (Vibe Coding, RAG, Agentic AI, AI Evaluation & Observability) | 299 € TTC | 12 mois |
| Product Manager Augmenté (9 modules) | 990 € TTC | 18 mois |
| AI Product Manager (13 modules) | 1 490 € TTC | 18 mois |
| AI Mastery (18 modules) | 1 990 € TTC | 18 mois |
| AI Mastery Mentored (18 modules + accompagnement) | 2 990 € TTC — **offre fermée** tant que l'accompagnement n'est pas défini | 18 mois |
| Team 5 / Team 20 (5 / 20 licences AI Mastery) | 7 500 € / 24 000 € HT | 12 mois |
| Private Workshop | de 2 500 à 3 500 € HT par journée | — |
| Enterprise Custom | sur devis | — |

Chaque offre démarre **fermée** : elle s'ouvre explicitement, et seulement si tous ses modules sont publiés et si un prix existe. Les offres entreprise et sur devis ne sont pas achetables en ligne.

**Prix de lancement (« fondateur ») — propositions à tester, non appliquées automatiquement :** Standard 149 €, Avancé 229 €, PM Augmenté 790 €, AI PM 1 190 €, AI Mastery 1 590 €, Mentored 2 490 € (TTC), uniquement sur des offres réellement disponibles et pour une période définie. Pour en lancer un aujourd'hui : changer le prix dans *Produits et prix* (historique conservé, commandes passées inchangées) puis le remettre à la fin de la période. Il n'y a pas encore de dates automatiques de début/fin.

## Règles produit appliquées (et testées)

- Les 18 modules et 4 phases sont visibles ; **seul un module publié dont l'offre est ouverte s'achète**. La base refuse sinon (pas seulement l'interface).
- Un contenu déjà détenu n'est jamais refacturé ; un parcours prolonge un accès existant sans doublon.
- Un module ne peut pas être publié s'il manque du contenu (leçon vide, quiz sans question, question sans bonne réponse, objectifs absents). Publier n'ouvre pas la vente. Dépublier ferme les offres concernées sans retirer l'accès des apprenants existants.
- Complétion d'un module : leçons obligatoires + quiz réussis + devoirs acceptés (configurable par module). L'attestation est émise **une seule fois**, privée, vérifiable par code, jamais présentée comme une certification d'État ni une qualification RNCP.
- Correction automatique pour les questions objectives uniquement ; réponses libres et livrables relus par le formateur. **Aucune IA n'est l'autorité finale.**
- Jamais de témoignage, avis, chiffre ou logo inventé ; un témoignage ne se publie qu'avec une référence de consentement. Les durées et niveaux sont des estimations à confirmer.
- La répartition pédagogique 70 % pratique / 20 % interaction / 10 % théorie est une **cible de conception**, pas une mesure.

## Conseiller de parcours

Déterministe (6 questions : rôle, expérience, familiarité avec l'IA, objectif, aisance technique, temps disponible), règles lisibles dans `src/lib/advisor/rules.ts`, explication de chaque recommandation, séquence et durée indicative. S'exécute dans le navigateur ; aucune donnée n'est envoyée.

## Commerce

Stripe Checkout en paiement unique, codes promotionnels, factures Stripe, portail de facturation, historique des commandes. Politique de révocation et traitement des litiges : voir `DATABASE.md`. E-mails transactionnels (confirmation, remboursement) par SMTP ; les échecs sont journalisés sans bloquer le paiement. Les paiements réels sont bloqués par deux drapeaux explicites tant que la revue juridique n'est pas faite.

## Administration et CMS

Tableau de bord (revenu net, achats, remboursements, litiges, inscriptions, apprenants actifs, complétions, produits les plus achetés, entonnoir de commande, livrables à relire), modules, chapitres, leçons, ressources, sous-titres, quiz, devoirs, parcours, produits et prix, coupons, commandes (demande de remboursement), apprenants (accès manuel motivé), relecture, contenu du site, journal d'audit. Le catalogue public lit la base (ISR 60 s, invalidé après chaque modification).

## Design

Le design fourni (fond crème #FAF8F4, marine #0B1F3A, teal #0B7A83, titres Sora, texte Inter, cartes à 16 px, filtres en pilules, barre latérale d'administration) est appliqué à l'en-tête, l'accueil, le catalogue, la fiche module, le lecteur, le tableau de bord et l'administration, avec un mode sombre en plus. Le titre d'accueil reste celui du cahier des charges (« Maîtrisez l'IA. Appliquez-la à votre métier. ») ; la variante du design est modifiable dans le CMS. Les écrans du design qui relèvent de phases ultérieures (espace équipe, administration des entreprises, éditeur des règles du conseiller, paramètres) ne sont pas construits.

## Hors périmètre actuel

Entreprises (organisations, sièges, rapports : phase E), cohortes en direct, tutorat par IA, anglais (architecture prête, textes en français), transcodage vidéo depuis le navigateur.
