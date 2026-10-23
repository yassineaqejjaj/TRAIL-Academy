---
slug: du-prompt-engineering-au-context-engineering
title: Du prompt engineering au context engineering
excerpt: Peaufiner une phrase ne suffit plus quand l'assistant doit travailler sur vos documents et vos outils. Le context engineering consiste à composer ce que le modèle voit à chaque étape.
category: Prompting
courses: M5
---
Votre assistant répond très bien dans une démonstration de dix minutes. Dans l'usage quotidien, il oublie une consigne donnée plus tôt, se perd dans de longs documents, ou répète une erreur déjà corrigée. Vous reformulez le prompt, sans effet durable. Le problème n'est plus la phrase que vous écrivez : c'est **tout ce que le modèle a sous les yeux** au moment de répondre.

C'est ce déplacement que traduit l'expression *context engineering* : passer de l'art de rédiger une consigne à l'art de composer un contexte.

## Ce que recouvre le « contexte »

Un modèle de langage ne connaît que ce qui figure dans sa **fenêtre de contexte**, c'est-à-dire la quantité de texte qu'il peut prendre en compte en une fois, en plus de ce qu'il a appris à l'entraînement. Ce contexte peut contenir :

- les **instructions système** qui fixent le comportement général ;
- la **consigne** de l'utilisateur ;
- l'**historique** de la conversation ;
- des **documents** ou extraits récupérés (par exemple via une recherche) ;
- les **définitions d'outils** que le modèle peut appeler, et leurs résultats ;
- des **exemples** de sorties attendues ;
- une forme de **mémoire** : notes ou résumés conservés d'une session à l'autre.

Le prompt engineering optimise surtout la deuxième ligne. Le context engineering s'occupe de l'ensemble, et surtout de ce qu'on y met, de ce qu'on en retire et du moment.

## Pourquoi plus de contexte n'est pas mieux

On pourrait croire qu'il suffit de tout fournir. En pratique, un contexte surchargé pose plusieurs problèmes :

- **Le bruit** : des informations hors sujet distraient le modèle et diluent les consignes importantes.
- **Les contradictions** : deux documents qui se contredisent produisent des réponses incohérentes.
- **Le coût et la latence** : plus on envoie de texte, plus le traitement est long et facturé, selon les modèles.
- **Les limites de la fenêtre** : au-delà, il faut tronquer ou résumer, et l'on perd des détails.

Le bon objectif n'est donc pas le contexte le plus grand, mais le **contexte le plus utile pour cette étape précise**.

## Quatre leviers pour travailler le contexte

### Sélectionner

Ne fournir que ce qui sert la tâche. Pour répondre à une question sur une politique interne, quelques extraits pertinents valent mieux que le manuel entier. C'est le principe de la recherche documentaire associée à la génération.

### Structurer

Séparer clairement les instructions, les documents et les exemples, avec des titres ou des balises. Placer les consignes essentielles à un endroit stable et visible, et nommer chaque bloc.

### Compresser

Quand la conversation s'allonge, remplacer l'historique brut par un **résumé** des décisions et des faits établis. Attention : un résumé perd de l'information, vérifiez qu'il conserve les contraintes importantes.

### Persister

Conserver hors de la conversation ce qui doit durer : un fichier de consignes du projet, un glossaire, des décisions déjà prises. Le contexte est alors reconstitué proprement à chaque session, au lieu de dépendre de la mémoire d'un long échange.

## Une mini-méthode d'audit de contexte

Prenez un cas où l'assistant déçoit et appliquez cette séquence :

1. **Listez** tout ce que le modèle reçoit réellement à l'étape fautive : instructions, historique, documents, outils.
2. **Cherchez ce qui manque** : une information nécessaire absente ou introuvable.
3. **Cherchez ce qui gêne** : contenu obsolète, redondant, contradictoire ou hors sujet.
4. **Vérifiez l'ordre et la structure** : les consignes clés sont-elles claires et non noyées ?
5. **Corrigez un élément à la fois**, puis rejouez le même cas pour mesurer l'effet.

Exemple fictif : un assistant de support propose parfois une procédure périmée. L'audit révèle que deux versions du même guide sont toutes deux injectées. Le correctif n'est pas de réécrire le prompt, mais de retirer l'ancienne version de la base documentaire et d'ajouter la date de mise à jour aux extraits.

## Ce que cela change pour une équipe produit

Le contexte devient un **actif à concevoir, versionner et tester**, au même titre qu'un composant logiciel. Concrètement : documenter ce qui entre dans le contexte de chaque fonctionnalité, constituer un jeu de cas de test, et suivre l'effet d'un changement sur ces cas. On passe d'un réglage artisanal à une pratique d'ingénierie.

## À retenir

- Le contexte regroupe tout ce que le modèle voit : instructions, historique, documents, outils, exemples, mémoire.
- Plus de contexte n'est pas synonyme de meilleur résultat : visez le plus utile.
- Quatre leviers : sélectionner, structurer, compresser, persister.
- Auditez le contexte réel avant de réécrire un prompt.
- Traitez le contexte comme un actif testé et versionné.

Ces pratiques sont détaillées dans le module M5 de la formation, avec des exercices d'audit de contexte.
