---
slug: ecrire-un-bon-prompt-methode-cinq-elements
title: Écrire un bon prompt : une méthode en cinq éléments
excerpt: Des réponses vagues viennent presque toujours de consignes vagues. Une structure en cinq éléments (rôle, contexte, tâche, format, critères) rend vos prompts fiables et réutilisables.
category: Prompting
courses: M4
---
Vous demandez à un assistant : « Rédige un plan de lancement pour notre nouvelle fonctionnalité. » Vous obtenez un texte générique, correct sur la forme, inutilisable sur le fond. L'outil n'est pas en cause : vous lui avez demandé de deviner le public, l'objectif, le niveau de détail et le format attendus. Il a comblé les trous avec du plausible.

Un bon prompt n'a rien de magique. C'est une consigne complète, comme celle que vous donneriez à un nouveau collègue compétent qui ne connaît pas votre contexte. Voici une structure en cinq éléments pour y arriver.

## Les cinq éléments

### 1. Le rôle

Indiquez le point de vue ou l'expertise à adopter : « Tu es un chef de produit senior qui prépare un lancement pour un public non technique. » Le rôle oriente le vocabulaire, le niveau de détail et les priorités. Il ne rend pas le modèle plus savant ; il cadre la perspective.

### 2. Le contexte

C'est l'élément le plus souvent oublié, et le plus rentable. Donnez les informations dont le modèle ne dispose pas : qui est le public, quel est l'objectif, quelles contraintes s'appliquent, ce qui a déjà été décidé. Fournissez aussi la matière de travail : le texte à reformuler, les notes à synthétiser.

Pensez à délimiter clairement les blocs de contenu, par exemple avec des balises, pour séparer vos consignes des documents fournis :

```
<contexte>
Fonctionnalité : export des rapports au format tableur.
Public : administrateurs d'équipe.
</contexte>
```

### 3. La tâche

Une action claire, formulée avec un verbe précis : « propose », « classe », « compare », « réécris », « liste les risques ». Évitez de mélanger plusieurs tâches dans une phrase. Si le travail est complexe, découpez-le en étapes successives plutôt que de tout demander d'un bloc.

### 4. Le format de sortie

Dites à quoi doit ressembler la réponse : liste à puces, texte de 150 mots, tableau en colonnes, JSON avec des champs précis, ton formel ou familier. Un format explicite rend aussi la réponse plus facile à relire, à comparer et à réutiliser dans un outil.

### 5. Les critères de qualité et les contraintes

Précisez ce qu'est une bonne réponse et ce qu'il faut éviter : ne pas inventer de chiffres, signaler ce qui est incertain, citer la partie du document qui appuie chaque affirmation, rester sous une longueur donnée. Vous pouvez aussi donner un ou deux **exemples** du résultat attendu : c'est souvent plus efficace qu'une longue description.

## Avant et après

Prompt initial :

```
Rédige un plan de lancement pour notre nouvelle fonctionnalité.
```

Version structurée :

```
Rôle : tu es chef de produit et tu prépares un plan de lancement interne.

Contexte : nous lançons un export de rapports au format tableur pour
les administrateurs d'équipe. La fonctionnalité est stable, la
documentation n'est pas écrite, le support n'a pas été formé.

Tâche : propose un plan de lancement en trois phases.

Format : pour chaque phase, un objectif, trois actions, un responsable
à désigner (par fonction) et un indicateur de réussite.

Critères : reste concret, signale les hypothèses que tu fais et
n'invente aucune donnée chiffrée.
```

La seconde version prend deux minutes de plus à écrire et épargne plusieurs allers-retours.

## Itérer plutôt que viser la perfection

Un prompt s'améliore par cycles. Lisez la réponse, identifiez ce qui manque, puis corrigez **le prompt** (et pas seulement la réponse) : ajoutez le contexte omis, durcissez une contrainte, précisez le format. Conservez les versions qui marchent dans une bibliothèque de prompts partagée par l'équipe.

Quelques réflexes complémentaires :

- Demandez au modèle de poser ses questions de clarification avant de répondre si la consigne est ambiguë.
- Pour un raisonnement délicat, demandez de procéder par étapes et de justifier ses choix.
- **Relisez toujours** : un prompt soigné réduit les erreurs, il ne les supprime pas.
- N'insérez pas de données confidentielles ou personnelles dans un outil qui n'est pas validé pour cet usage.

## Un test rapide pour juger votre prompt

Relisez-le en vous mettant à la place d'un collègue extérieur au projet. Saurait-il, sans poser de question : pour qui on écrit, dans quel but, avec quelles contraintes, sous quelle forme ? Si la réponse est non, c'est le modèle qui devra deviner.

## À retenir

- Un prompt est une consigne complète : rôle, contexte, tâche, format, critères.
- Le contexte est l'élément qui améliore le plus la pertinence.
- Un format de sortie explicite facilite la relecture et la réutilisation.
- Itérez sur le prompt, gardez ce qui marche, et relisez toujours le résultat.

Le module M4 de la formation approfondit cette méthode avec des exercices de réécriture de prompts.
