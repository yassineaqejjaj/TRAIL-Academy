# Politique de confidentialité

> **BROUILLON — À COMPLÉTER ET À FAIRE VALIDER PAR UN JURISTE avant publication.** Ce texte décrit ce que la plateforme fait réellement ; il ne constitue pas un avis juridique. Chaque mention `[À COMPLÉTER : …]` est une information que seul l’éditeur peut fournir ; chaque `[À VALIDER : …]` est un choix juridique à arrêter avec un juriste.

*Dernière mise à jour : [À COMPLÉTER].*

Cette politique explique quelles données TRAIL Academy collecte, pourquoi, avec qui elles sont partagées et comment exercer vos droits (RGPD et loi Informatique et Libertés).

## 1. Responsable de traitement
[À COMPLÉTER : identité de l’éditeur, adresse], joignable à [À COMPLÉTER : adresse e-mail dédiée aux demandes de données]. Délégué à la protection des données : [À COMPLÉTER ou « non désigné »].

## 2. Données traitées, finalités et bases légales
| Données | Finalité | Base légale [À VALIDER] | Conservation [À VALIDER] |
|---|---|---|---|
| Nom, adresse e-mail, mot de passe (haché avec Argon2id, jamais stocké en clair) | Créer et sécuriser le compte, donner accès aux formations | Exécution du contrat | Jusqu’à suppression du compte |
| Connexion avec Google (si vous la choisissez) : identifiant et e-mail fournis par Google | Authentification | Exécution du contrat | Jusqu’à suppression du compte |
| Commandes, montants, statut, identifiants Stripe | Accès aux contenus achetés, facturation, comptabilité | Exécution du contrat ; obligation légale | [À COMPLÉTER : durée comptable, généralement 10 ans], détachées de votre identité après suppression du compte |
| Progression, réponses aux quiz, livrables déposés, notes, favoris, attestations | Fournir la formation, évaluer, délivrer l’attestation | Exécution du contrat | Jusqu’à suppression du compte (attestations : [À COMPLÉTER]) |
| Réservations de sessions en direct, liste d’attente, adresse e-mail transmise à l’animateur | Organiser les visioconférences, envoyer l’invitation | Exécution du contrat | [À COMPLÉTER] |
| Avis déposés (note, texte, nom affiché) | Publier un avis après votre accord exprès | Consentement (retirable) | Jusqu’au retrait ou à la suppression du compte |
| Appartenance à une organisation cliente : progression par module, quiz réussis, dernière activité (jamais les réponses, notes ni livrables) | Permettre au responsable de votre organisation de suivre la formation | Consentement exprès à l’acceptation de l’invitation (retirable à tout moment depuis « Mon organisation ») | Jusqu’à la sortie de l’organisation ou la suppression du compte |
| Messages des formulaires de contact et de devis | Répondre à votre demande | Intérêt légitime ; mesures précontractuelles | [À COMPLÉTER : par exemple 3 ans après le dernier échange] |
| Adresse e-mail pour être prévenu(e) d’une ouverture ou recevoir la lettre | Information demandée | Consentement (retirable à tout moment) | Jusqu’au retrait |
| Adresse IP, navigateur, compteurs de limitation de débit, journaux techniques | Sécurité, prévention des abus et de la fraude | Intérêt légitime | [À COMPLÉTER : durée des journaux] |

Les données de carte bancaire sont traitées exclusivement par Stripe ; elles ne transitent pas par nos serveurs et ne sont pas stockées par TRAIL Academy.

## 3. Organisations clientes
Si votre employeur ou une organisation cliente vous invite, il vous est demandé d’accepter, avant tout partage, que son responsable voie votre progression par module, la réussite de vos quiz et votre date de dernière activité. Il ne voit jamais vos réponses, notes, livrables ni les retours du formateur. Vous pouvez arrêter ce partage à tout moment depuis **Mon espace → Mon organisation** ; les licences attribuées par l’organisation sont alors retirées. [À VALIDER : rôle de responsable de traitement ou de sous-traitant de l’organisation cliente, information des salariés, contrat de sous-traitance si nécessaire.]

## 3 bis. Conseiller de parcours
Le conseiller qui vous propose un parcours à partir de la description de votre métier et de votre objectif fonctionne **dans votre navigateur** : le texte saisi n’est pas enregistré. [À VALIDER : si une synthèse par un modèle de langage externe est activée un jour, cette page devra citer le fournisseur, les données transmises et la base légale avant activation ; elle est désactivée par défaut.] Évitez d’y saisir des informations confidentielles ou le nom de votre employeur.

## 3 ter. Tuteur dans les leçons
Si le tuteur est activé, la question que vous posez dans une leçon (et, si vous l'avez sélectionné, le passage concerné) est envoyée, avec des extraits du cours, à un service de modèle de langage pour rédiger la réponse : [À COMPLÉTER : nom du fournisseur, localisation, garanties de transfert]. Aucune conversation n'est conservée par TRAIL Academy. Ne saisissez pas de données personnelles ni confidentielles. Chaque réponse est signalée comme générée par une IA et cite les passages du cours utilisés. [À VALIDER : base légale, durée de conservation côté fournisseur, information des personnes, contrat de sous-traitance.]

## 4. Destinataires et sous-traitants
| Sous-traitant | Rôle | Localisation / garanties [À COMPLÉTER ET VALIDER] |
|---|---|---|
| Vercel | Hébergement de l’application | États-Unis possible ; clauses contractuelles types / Data Privacy Framework |
| Railway | Base de données, stockage de fichiers, diffusion vidéo | Région choisie : [À COMPLÉTER] |
| Stripe | Paiement, facturation, taxes ; agit aussi comme vendeur officiel dans Managed Payments | [À COMPLÉTER] ; Stripe est responsable de traitement pour ses propres obligations |
| [À COMPLÉTER : prestataire d’e-mails, par exemple Brevo] | Envoi des e-mails transactionnels | [À COMPLÉTER] |
| Jitsi Meet (ou autre outil de visio configuré) | Sessions de formation en direct | Selon le serveur configuré : [À COMPLÉTER] |
| Google | Uniquement si vous choisissez la connexion avec Google | États-Unis possible |

Aucune donnée n’est vendue. Aucune donnée n’est transmise à des régies publicitaires.

## 5. Transferts hors Union européenne
Certains prestataires peuvent traiter des données aux États-Unis. Les transferts reposent sur [À COMPLÉTER : décision d’adéquation / Data Privacy Framework / clauses contractuelles types, selon chaque prestataire].

## 6. Sécurité
Mots de passe hachés, connexions chiffrées (HTTPS), accès aux données cloisonné par utilisateur au niveau de la base, limitation du nombre de tentatives, vidéos diffusées par liens signés temporaires, journalisation des actions d’administration. Aucune mesure ne garantit un risque nul ; en cas de violation de données susceptible de vous porter préjudice, nous vous en informons et prévenons la CNIL dans les délais légaux.

## 7. Vos droits
Accès, rectification, effacement, limitation, opposition, portabilité, retrait du consentement, directives sur le sort de vos données après décès.
- Depuis **Mon espace → Mes données** : téléchargement de vos données (JSON) et suppression du compte.
- Pour toute autre demande : [À COMPLÉTER : adresse e-mail]. Réponse sous un mois.
- Réclamation possible auprès de la CNIL (cnil.fr).

À la suppression du compte, vos fichiers déposés sont effacés ; les commandes déjà payées sont conservées sous forme anonymisée. Le compte client Stripe n’est pas supprimé automatiquement : [À COMPLÉTER : procédure de suppression chez Stripe sur demande].

## 8. Mineurs
Le site s’adresse à des professionnels majeurs. [À VALIDER : âge minimal.]

## 9. Modification
Toute modification importante est signalée sur cette page avec la nouvelle date de mise à jour.
