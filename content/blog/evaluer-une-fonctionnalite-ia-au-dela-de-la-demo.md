---
slug: evaluer-une-fonctionnalite-ia-au-dela-de-la-demo
title: Évaluer une fonctionnalité IA : au-delà du « ça marche sur ma démo »
excerpt: Trois exemples réussis ne prouvent rien. Constituez un jeu de cas, définissez des critères clairs et mesurez avant et après chaque changement pour piloter la qualité d'une fonctionnalité IA.
category: Produit
courses: M17
---
La démonstration s'est bien passée : l'assistant a répondu juste aux trois questions préparées. Le lendemain, un utilisateur pose une question légèrement différente et reçoit une réponse erronée. Personne ne sait si c'est un cas isolé ou le symptôme d'un problème général, car personne n'a rien mesuré.

Les sorties d'un modèle de langage sont variables et ouvertes. On ne peut pas les valider comme une fonction classique avec un test unique. Il faut une pratique d'**évaluation** à part entière, qui joue pour l'IA le rôle que les tests jouent pour le code.

## Pourquoi la démo ne suffit pas

- **Un biais de sélection** : on montre les cas qui marchent.
- **Une faible couverture** : quelques exemples ne reflètent ni la diversité des usages, ni les cas limites, ni les formulations maladroites.
- **De la variabilité** : une même question peut produire des réponses différentes d'un essai à l'autre.
- **Des régressions silencieuses** : modifier une consigne ou changer de modèle peut améliorer un cas et en dégrader dix autres, sans que l'on s'en aperçoive.

## Étape 1 : définir ce que « bien » veut dire

Avant de mesurer, décrivez les dimensions de qualité pertinentes pour votre fonctionnalité. Selon le cas :

- **l'exactitude** des faits ;
- la **fidélité aux sources** fournies (aucune information ajoutée) ;
- la **complétude** par rapport à la question ;
- le **respect du format et du ton** ;
- la **sécurité** : absence de contenu inapproprié ou de fuite de données ;
- la **capacité à s'abstenir** quand l'information manque ;
- des critères pratiques : latence, coût par requête.

Transformez chaque dimension en critère observable, par exemple : « la réponse ne contient aucune information absente des extraits fournis ».

## Étape 2 : constituer un jeu de cas

Un jeu d'évaluation est un ensemble de situations représentatives, chacune avec l'entrée et le comportement attendu. Pour le construire :

- partez de **cas réels** (anonymisés, avec les autorisations nécessaires) plutôt que d'exemples idéalisés ;
- couvrez les **cas courants**, les **cas limites**, les **cas ambigus** et les **cas où la bonne réponse est de ne pas répondre** ;
- ajoutez des cas de **sécurité et de robustesse** : demandes hors périmètre, tentatives de détournement ;
- gardez le jeu **stable** pour comparer les versions, et enrichissez-le à chaque défaut découvert en production ;
- commencez petit (quelques dizaines de cas bien choisis valent mieux qu'un grand lot approximatif), puis étendez.

## Étape 3 : choisir la méthode de notation

Trois approches se complètent :

- **Les vérifications automatiques** : format valide, présence d'un champ, comparaison avec une réponse de référence quand elle est unique, longueur, absence de termes interdits.
- **L'évaluation par un modèle** (modèle « juge ») : un second modèle note la réponse selon une grille. Pratique pour passer à l'échelle, mais il a ses propres biais ; il faut le **calibrer** en comparant ses notes à celles d'humains sur un échantillon.
- **L'évaluation humaine** : indispensable pour établir la référence, juger la nuance et le ton, et contrôler les cas sensibles.

Une grille de notation simple, partagée entre les relecteurs, améliore la cohérence des jugements. Faites évaluer certains cas par deux personnes pour mesurer leur désaccord : un désaccord élevé signale que le critère est mal défini.

## Étape 4 : mesurer avant de changer, puis après

Le cœur de la démarche est la comparaison. Pour chaque modification (consigne, modèle, découpage de documents, paramètre) :

1. rejouez le jeu de cas sur la **version actuelle** ;
2. appliquez la modification ;
3. rejouez sur la **nouvelle version** ;
4. comparez globalement, mais aussi **cas par cas**, pour repérer les régressions ;
5. décidez en fonction de seuils fixés à l'avance.

Comme les sorties varient, répétez certaines exécutions et considérez les tendances plutôt qu'un résultat isolé.

## Étape 5 : prolonger l'évaluation en production

Un jeu de test hors ligne ne remplace pas l'observation du réel :

- **mesurez des indicateurs d'usage** : réponses acceptées, corrigées ou abandonnées, demandes de reformulation ;
- **offrez un moyen de signaler** une mauvaise réponse, et réinjectez ces cas dans votre jeu ;
- **déployez progressivement** et comparez, quand c'est possible, deux versions auprès d'utilisateurs différents ;
- **surveillez la dérive** : les usages et les contenus évoluent.

## Un exemple de fiche de critère

```
Critère : fidélité aux sources
Définition : toute affirmation de la réponse est appuyée par un extrait fourni.
Notation : 0 = au moins une affirmation non appuyée ; 1 = toutes appuyées.
Cas limites : une reformulation fidèle compte comme appuyée.
Seuil de mise en production : à définir avec l'équipe avant les tests.
```

## À retenir

- Une démo ne prouve pas la qualité : les sorties sont variables et les cas limites nombreux.
- Définissez des critères observables, puis un jeu de cas représentatif et stable.
- Combinez vérifications automatiques, modèle juge calibré et relecture humaine.
- Comparez avant et après chaque changement, cas par cas.
- Poursuivez l'évaluation en production et alimentez le jeu de cas avec les retours.

Le module M17 de la formation vous guide dans la construction d'un jeu d'évaluation et d'une grille de notation pour votre propre fonctionnalité.
