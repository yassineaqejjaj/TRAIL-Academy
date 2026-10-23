---
slug: ia-ml-deep-learning-ia-generative-differences
title: IA, machine learning, deep learning, IA générative : la différence
excerpt: Quatre termes employés comme des synonymes en réunion. Voici comment les distinguer, comment ils s'emboîtent, et pourquoi cette précision change vos décisions produit.
category: Fondamentaux
courses: M1
---
Lors d'un comité de pilotage, quelqu'un déclare : « On va mettre de l'IA dans le parcours de réclamation. » Trois personnes hochent la tête, mais chacune imagine autre chose : un moteur de règles, un modèle de classification entraîné sur l'historique, un assistant conversationnel. Le budget, l'équipe, les données nécessaires et les risques sont pourtant très différents d'un cas à l'autre.

Ce flou de vocabulaire n'est pas anodin. Il pousse à choisir la mauvaise technique, à sous-estimer le travail sur les données ou à promettre ce qu'un système ne peut pas tenir. Voici une grille simple pour s'y retrouver.

## Un emboîtement, pas une liste

Le plus utile est de voir ces notions comme des cercles concentriques.

- **L'intelligence artificielle (IA)** est le domaine le plus large : tout système qui réalise une tâche que l'on associe d'ordinaire à l'intelligence humaine (raisonner, classer, planifier, comprendre ou produire du langage).
- **Le machine learning (apprentissage automatique)** est une approche de l'IA : au lieu d'écrire les règles à la main, on laisse un algorithme les déduire à partir d'exemples.
- **Le deep learning (apprentissage profond)** est une famille de méthodes de machine learning fondées sur des réseaux de neurones à nombreuses couches, très efficaces sur les données complexes comme les images, le son ou le texte.
- **L'IA générative** désigne des modèles, le plus souvent issus du deep learning, qui produisent de nouveaux contenus (texte, image, code, audio) plutôt que de seulement classer ou prédire.

Une conséquence directe : toute IA générative est de l'IA, mais toute IA n'est pas du machine learning. Un système expert à base de règles « si… alors… » relève bien de l'IA, sans apprentissage.

## L'IA « classique » à base de règles

Avant l'apprentissage, on codait la connaissance. Un moteur de règles pour router des tickets de support pourrait ressembler à ceci :

```
si le message contient "facture" alors file = facturation
si le message contient "mot de passe" alors file = accès
sinon file = général
```

C'est transparent, prévisible et facile à auditer. Mais cela devient ingérable dès que les cas se multiplient ou que les formulations varient. C'est précisément la limite que le machine learning cherche à dépasser.

## Le machine learning : apprendre à partir d'exemples

En machine learning, vous fournissez des exemples (des messages déjà étiquetés par file de traitement) et l'algorithme ajuste ses paramètres pour reproduire ces étiquettes sur des cas nouveaux. On distingue classiquement :

- l'**apprentissage supervisé**, où les exemples sont étiquetés (classification, prédiction d'une valeur) ;
- l'**apprentissage non supervisé**, où l'on cherche des structures sans étiquette (regroupements) ;
- l'**apprentissage par renforcement**, où un agent apprend par essais et récompenses.

Ce qui compte pour un chef de produit : **la qualité du système dépend de la qualité et de la représentativité des données**. Le travail de collecte, de nettoyage et d'étiquetage est souvent plus lourd que le choix de l'algorithme.

## Le deep learning : quand les données sont complexes

Les méthodes classiques exigent souvent que l'on construise soi-même les variables pertinentes. Les réseaux de neurones profonds, eux, apprennent leurs propres représentations à partir de données brutes. Ils sont donc particulièrement adaptés à la reconnaissance d'images, à la parole et au langage. La contrepartie est connue : besoin de données et de puissance de calcul plus importants, et résultats plus difficiles à expliquer.

## L'IA générative : produire plutôt que prédire

Un modèle de langage est entraîné à prédire la suite probable d'un texte. De cette tâche simple émergent des capacités utiles : rédiger, résumer, traduire, reformuler, écrire du code. Mais cette mécanique explique aussi ses limites : le modèle produit du **plausible**, pas nécessairement du **vrai**. D'où les réponses assurées mais fausses, souvent appelées hallucinations.

Autre différence de nature : un modèle de classification donne une réponse dans un ensemble fermé (« facturation », « accès »), ce qui se mesure facilement. Une sortie générative est ouverte, ce qui rend l'évaluation plus délicate.

## Une mini-méthode pour choisir la bonne famille

Face à un besoin, posez ces questions dans l'ordre :

1. **Peut-on écrire la règle ?** Si oui et si elle est stable, une règle explicite est souvent plus sûre et moins chère.
2. **Dispose-t-on d'exemples fiables ?** Si oui, un modèle de machine learning classique peut convenir pour classer ou prédire.
3. **La donnée est-elle non structurée (images, audio, textes libres) ?** Le deep learning devient pertinent.
4. **Faut-il produire un contenu nouveau ou dialoguer ?** L'IA générative est alors candidate, avec un dispositif de contrôle de la qualité.

Appliquée au routage de tickets : des règles suffisent si les motifs sont stables ; un classifieur entraîné aide si les formulations sont variées ; un modèle génératif peut rédiger une réponse suggérée, à faire relire.

## À retenir

- L'IA est le domaine, le machine learning une approche, le deep learning une famille de méthodes, l'IA générative une capacité de production de contenu.
- Plus la technique est puissante, plus elle est coûteuse en données et plus ses résultats sont difficiles à expliquer.
- La bonne question n'est pas « comment mettre de l'IA ? » mais « quel problème, quelles données, quel niveau de risque ? ».
- Une règle simple reste parfois le meilleur choix.

Ces distinctions sont développées pas à pas, avec des exercices, dans le module M1 de la formation.
