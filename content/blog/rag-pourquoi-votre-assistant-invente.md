---
slug: rag-pourquoi-votre-assistant-invente
title: RAG : pourquoi votre assistant « invente » et comment y remédier
excerpt: Un assistant sans accès à vos documents comble les vides avec du plausible. La génération augmentée par recherche (RAG) ancre ses réponses dans vos sources, à condition d'être bien conçue.
category: Produit
courses: M11
---
Un collaborateur demande à l'assistant interne : « Combien de jours de télétravail sont autorisés par semaine ? » La réponse est claire, détaillée, rédigée avec aplomb… et ne correspond à aucune politique réelle de l'entreprise. Le modèle n'a pas menti volontairement : il n'avait pas l'information, et il a produit la réponse la plus vraisemblable.

Ce phénomène, souvent appelé **hallucination**, est inhérent au fonctionnement des modèles de langage. Une des réponses les plus courantes pour le réduire s'appelle le **RAG**.

## Pourquoi un modèle « invente »

Un modèle de langage est entraîné à produire une suite de mots plausible. Il n'interroge pas une base de faits : il a des connaissances statistiques issues de son entraînement, figées à une date, qui ne contiennent ni vos documents internes ni, souvent, les informations récentes. Quand la question dépasse ce qu'il connaît, rien ne l'empêche de produire une réponse fluide mais fausse.

Deux leviers existent : réentraîner le modèle (lourd, coûteux, peu adapté à des contenus qui changent), ou **lui fournir les bonnes informations au moment de la question**. C'est le second que propose le RAG.

## Le principe du RAG

RAG signifie *Retrieval-Augmented Generation*, soit génération augmentée par la recherche. Le schéma est le suivant :

1. **Préparer** : vos documents sont découpés en passages (*chunks*), puis chaque passage est converti en une représentation numérique (un *embedding*) qui capture son sens, et stocké dans un index.
2. **Rechercher** : à la question de l'utilisateur, on cherche les passages les plus proches sémantiquement.
3. **Générer** : on transmet au modèle la question **et** les passages retrouvés, avec la consigne de répondre à partir d'eux.
4. **Citer** : on affiche les sources utilisées, pour que l'utilisateur puisse vérifier.

Une consigne typique ressemble à ceci :

```
Réponds uniquement à partir des extraits fournis.
Si l'information n'y figure pas, réponds : « Je n'ai pas trouvé
cette information dans les documents disponibles. »
Cite le titre du document pour chaque affirmation.
```

## Ce que le RAG corrige, et ce qu'il ne corrige pas

Le RAG **réduit** les inventions, donne accès à des contenus privés ou récents sans réentraîner le modèle, et rend les réponses **vérifiables** grâce aux sources. Il ne les **élimine pas** : le modèle peut mal interpréter un extrait, mélanger deux passages, ou répondre malgré l'absence d'information pertinente. Un RAG est aussi bon que sa recherche : si le bon passage n'est pas retrouvé, la génération ne peut pas le deviner.

## Où un RAG échoue en pratique

- **Un découpage maladroit.** Un passage trop court perd son contexte ; trop long, il dilue l'information utile.
- **Des documents de mauvaise qualité.** Versions contradictoires, contenus périmés, mises en page illisibles : le système répète ce qu'on lui donne.
- **Une recherche imprécise.** Les termes métier, les acronymes ou les références exactes sont parfois mal retrouvés par une recherche purement sémantique ; on combine souvent plusieurs approches de recherche.
- **Un contexte surchargé.** Fournir dix extraits dont deux seulement servent peut brouiller la réponse.
- **Des droits d'accès ignorés.** Le système ne doit retrouver que ce que l'utilisateur est autorisé à consulter.

## Une mini-méthode pour fiabiliser un assistant documentaire

1. **Assainissez le corpus** : une source de vérité par sujet, une date, un propriétaire. Retirez ou archivez les versions obsolètes.
2. **Constituez un jeu de questions** : vingt à trente questions réelles avec la réponse attendue et le document qui la contient, dont quelques questions sans réponse dans le corpus.
3. **Mesurez séparément la recherche et la génération.** La bonne source est-elle retrouvée ? La réponse est-elle fidèle aux extraits ?
4. **Ajustez un paramètre à la fois** : taille des passages, nombre d'extraits, consigne, méthode de recherche, puis rejouez le jeu de questions.
5. **Prévoyez l'abstention** : le système doit savoir répondre « je ne sais pas » et orienter vers un interlocuteur.
6. **Collectez les retours** des utilisateurs sur les réponses insatisfaisantes pour enrichir le jeu de tests.

## Quand le RAG n'est pas la bonne réponse

Si les questions portent sur des calculs, des données structurées ou des actions à réaliser, une requête sur une base de données ou un appel d'outil est plus approprié. Si le besoin est un style ou un comportement particulier, c'est plutôt une affaire de consigne ou d'adaptation du modèle. Le RAG répond surtout au besoin de **connaissances à jour et sourcées**.

## À retenir

- Un modèle sans information produit du plausible : c'est la source des inventions.
- Le RAG fournit à chaque question les passages pertinents de vos documents et demande de s'y limiter.
- Il réduit les erreurs sans les supprimer : citez les sources et prévoyez l'abstention.
- La qualité du corpus et de la recherche pèse autant que celle du modèle.
- Évaluez la recherche et la génération séparément, sur un jeu de questions fixe.

Le module M11 de la formation détaille la construction et l'évaluation d'un système RAG, étape par étape.
