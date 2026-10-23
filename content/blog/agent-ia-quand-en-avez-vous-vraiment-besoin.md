---
slug: agent-ia-quand-en-avez-vous-vraiment-besoin
title: Qu'est-ce qu'un agent IA, et quand en avez-vous vraiment besoin ?
excerpt: Le mot « agent » est partout, souvent à tort. Définition claire, différence avec un simple assistant ou un workflow, et critères pour décider si votre besoin justifie réellement un agent.
category: Agents
courses: M12
---
« Et si on faisait un agent ? » La proposition revient dans presque chaque atelier d'idéation. Elle séduit, parce qu'elle évoque un système autonome qui travaille à votre place. Elle inquiète aussi les équipes techniques, car un agent est plus difficile à rendre fiable qu'un simple appel à un modèle. Avant de s'y engager, il faut savoir de quoi l'on parle, et si le problème l'exige.

## Une définition de travail

Il n'existe pas de définition unique, mais on s'accorde généralement sur ceci : un **agent IA** est un système dans lequel un modèle de langage **décide lui-même, en boucle, des actions à entreprendre** pour atteindre un objectif, en utilisant des **outils** (recherche, calcul, appel d'une interface, lecture ou écriture de fichiers), et en tenant compte des résultats obtenus pour choisir la suite.

Trois ingrédients le caractérisent :

- un **objectif** formulé en langage naturel ;
- des **outils** que le modèle peut appeler ;
- une **boucle** : observer, décider, agir, observer le résultat, recommencer jusqu'à un critère d'arrêt.

C'est la **part de décision laissée au modèle sur le déroulement** qui distingue l'agent.

## Assistant, workflow, agent : trois niveaux

### L'appel simple

Vous envoyez un texte, le modèle répond. Idéal pour reformuler, résumer, classer, extraire.

### Le workflow

Plusieurs appels au modèle (et éventuellement à des outils) sont enchaînés selon un **chemin défini à l'avance** par vous : d'abord extraire, puis vérifier, puis rédiger. Le déroulement est prévisible, testable, et son coût est borné.

### L'agent

Le modèle **choisit** les étapes, leur ordre et le moment de s'arrêter. Il gagne en souplesse pour les tâches ouvertes, mais perd en prévisibilité : durée, coût et résultats varient d'une exécution à l'autre.

## Ce que l'autonomie coûte

- **Des erreurs qui se cumulent.** Une mauvaise décision au début de la boucle contamine les suivantes.
- **Un coût et une durée variables**, car le nombre d'étapes n'est pas connu d'avance.
- **Une évaluation plus difficile** : on ne teste plus seulement une réponse, mais un parcours.
- **Des risques d'actions indésirables** si les outils permettent d'écrire, d'envoyer ou de supprimer.
- **Une surface d'attaque plus large** : du contenu hostile rencontré en cours de route peut tenter d'influencer l'agent.

## Un arbre de décision en cinq questions

1. **Un appel unique suffit-il ?** Si oui, n'allez pas plus loin.
2. **Les étapes sont-elles connues à l'avance ?** Si vous pouvez les écrire, construisez un workflow.
3. **Le chemin dépend-il fortement de ce que l'on découvre en route ?** (investigation, recherche ouverte, dépannage) C'est le terrain naturel d'un agent.
4. **L'erreur est-elle tolérable ou réversible ?** Plus l'impact d'une action est élevé, plus il faut limiter les droits de l'agent et prévoir une validation humaine.
5. **Peut-on mesurer la réussite ?** Sans critère d'évaluation clair, impossible d'améliorer ou de sécuriser.

## Exemples fictifs

- **Mettre à jour un tableau de suivi chaque semaine à partir de trois sources** : workflow. Les étapes sont fixes.
- **Enquêter sur la cause d'une baisse de conversion en explorant plusieurs jeux de données** : candidat pour un agent, avec lecture seule et restitution à un humain.
- **Répondre aux questions fréquentes des clients** : plutôt un appel enrichi par recherche documentaire, avec bascule vers une personne si nécessaire.

## Bonnes pratiques si vous en construisez un

- **Commencez par le plus simple** : un workflow, puis ajoutez de l'autonomie là où elle apporte une valeur démontrée.
- **Donnez peu d'outils, bien décrits**, avec les droits minimaux nécessaires.
- **Bornez la boucle** : nombre maximal d'étapes, budget, durée.
- **Journalisez chaque action**, pour comprendre et corriger.
- **Gardez un humain dans la boucle** pour les décisions irréversibles ou sensibles.
- **Évaluez le parcours complet** sur des scénarios représentatifs, y compris des cas d'échec.

## À retenir

- Un agent est un modèle qui choisit ses actions en boucle, avec des outils, pour atteindre un objectif.
- Tout système utilisant un modèle n'est pas un agent : un workflow à étapes fixes est souvent préférable.
- L'autonomie apporte de la souplesse, mais aussi de l'imprévisibilité, du coût et du risque.
- Justifiez le recours à un agent par un chemin vraiment variable et une erreur maîtrisable.

Le module M12 de la formation permet de concevoir et de cadrer un cas d'usage agentique, de la décision initiale aux garde-fous.
