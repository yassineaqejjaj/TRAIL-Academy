---
slug: combien-coute-une-fonctionnalite-ia
title: Combien coûte une fonctionnalité IA ? Une méthode de calcul avec des prix fictifs
excerpt: Le coût d'une fonctionnalité IA dépend des volumes, de la longueur des textes et du modèle. Apprenez à l'estimer pas à pas, avec des prix fictifs à remplacer par les vôtres.
category: Stratégie
courses: M15
---
« Combien ça va nous coûter ? » La question arrive vite quand on propose d'intégrer un assistant dans un produit, et la réponse « ça dépend » est la plus honnête mais la moins utile. Il est pourtant possible de produire une estimation raisonnable en quelques étapes, à condition de comprendre ce qui fait varier la facture.

Précision importante : **tous les prix de cet article sont fictifs**. Les tarifs réels varient selon les fournisseurs et évoluent régulièrement ; remplacez-les par ceux de votre contrat.

## Comprendre l'unité de facturation : le token

Les modèles de langage traitent le texte par morceaux appelés **tokens** (un mot en comporte souvent un ou plusieurs ; le décompte exact dépend du modèle et de la langue). La plupart des fournisseurs facturent séparément :

- les **tokens d'entrée** : tout ce que vous envoyez (consignes, historique, documents, question) ;
- les **tokens de sortie** : ce que le modèle produit.

Les tarifs sont généralement exprimés par million de tokens, avec un prix de sortie supérieur au prix d'entrée. Certains fournisseurs proposent aussi des réductions pour du contenu mis en cache ou du traitement différé : vérifiez ce qui s'applique chez vous.

## La formule de base

```
coût par requête =
  (tokens d'entrée × prix d'entrée par token)
+ (tokens de sortie × prix de sortie par token)

coût mensuel = coût par requête × nombre de requêtes par mois
```

## Un exemple complet avec des valeurs fictives

Imaginons un assistant qui répond à des questions à partir d'extraits de documents.

Hypothèses fictives :

- prix d'entrée : 2 € par million de tokens ;
- prix de sortie : 8 € par million de tokens ;
- par requête : 3 000 tokens d'entrée (consigne, extraits, question) et 500 tokens de sortie ;
- 20 000 requêtes par mois.

Calcul :

```
entrée : 3 000 × 2 € / 1 000 000 = 0,006 € par requête
sortie :   500 × 8 € / 1 000 000 = 0,004 € par requête
total  : 0,010 € par requête

mensuel : 0,010 € × 20 000 = 200 €
```

Avec ces valeurs fictives, l'inférence coûterait donc 200 € par mois. Mais ce n'est qu'une partie de la facture.

## Les postes de coût qu'on oublie

- **Les appels multiples.** Une fonctionnalité qui enchaîne vérification, reformulation et génération multiplie le coût par requête. Un agent qui boucle peut consommer bien plus qu'un appel unique.
- **Les nouvelles tentatives et les erreurs.** Une requête refaite est payée deux fois.
- **L'historique de conversation.** À chaque tour, il est renvoyé en entrée : le coût d'un échange long croît plus vite que sa durée.
- **La recherche documentaire.** Indexation, stockage, calcul des représentations numériques, mise à jour du corpus.
- **L'évaluation et les tests**, qui consomment aussi des requêtes.
- **L'observabilité et la sécurité** : journalisation, surveillance, outils annexes.
- **Le coût humain** : conception, revue de qualité, support, mise à jour des consignes et des données.

## Une méthode en six étapes

1. **Décrivez le parcours** : combien d'appels au modèle par action utilisateur ?
2. **Estimez les tailles** : tokens d'entrée et de sortie par appel, à partir d'exemples réels anonymisés ou de textes représentatifs.
3. **Estimez les volumes** : utilisateurs actifs × actions par utilisateur × appels par action.
4. **Calculez trois scénarios** : prudent, attendu, fort usage. L'incertitude porte surtout sur le volume.
5. **Ajoutez les coûts annexes** (stockage, outils, supervision, temps humain).
6. **Rapportez à la valeur** : coût par utilisateur ou par tâche accomplie, comparé au temps gagné, au revenu ou au coût évité.

## Leviers pour maîtriser le coût

- **Choisir le modèle à la tâche.** Un modèle plus léger suffit souvent pour classer ou extraire ; réservez le plus puissant aux cas qui l'exigent.
- **Raccourcir le contexte** : ne transmettre que les extraits utiles, résumer l'historique.
- **Limiter la longueur des sorties** quand le besoin le permet.
- **Mettre en cache** les réponses ou les parties de contexte répétées, quand c'est pertinent.
- **Fixer des plafonds** : budget par utilisateur, nombre maximal d'étapes, alertes de dépassement.
- **Mesurer en continu** : le coût réel par fonctionnalité doit être suivi comme une métrique produit.

## À retenir

- Le coût d'inférence suit les tokens d'entrée et de sortie multipliés par les volumes.
- Les estimations doivent partir du parcours complet, pas d'un seul appel.
- Prévoyez trois scénarios de volume et incluez les coûts annexes et humains.
- Rapportez le coût à la valeur créée, par tâche ou par utilisateur.
- Les prix changent : vérifiez toujours les tarifs réels avant de décider.

Le module M15 de la formation fournit un modèle de calcul à adapter à votre cas, avec des exercices de chiffrage.
