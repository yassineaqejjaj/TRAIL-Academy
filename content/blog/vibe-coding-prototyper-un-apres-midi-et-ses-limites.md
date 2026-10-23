---
slug: vibe-coding-prototyper-un-apres-midi-et-ses-limites
title: Vibe coding : prototyper une idée en un après-midi, et ses limites
excerpt: Décrire une application en langage naturel et la voir apparaître : le vibe coding accélère le prototypage. Voici comment l'utiliser utilement, et où s'arrête sa fiabilité.
category: Produit
courses: M6
---
Vous avez une idée de petit outil : un simulateur, un formulaire de qualification, un tableau de bord interne. Auparavant, il fallait une demande à l'équipe technique, un cadrage, une file d'attente. Aujourd'hui, un assistant capable de générer du code permet d'obtenir un premier écran fonctionnel en quelques échanges. C'est ce que l'on appelle, familièrement, le **vibe coding** : construire un logiciel en décrivant l'intention en langage naturel, en laissant l'IA écrire l'essentiel du code, et en guidant par essais successifs.

Utile pour apprendre vite, la pratique a aussi des limites nettes. Les connaître évite de confondre une maquette convaincante avec un produit.

## Ce que le vibe coding fait très bien

- **Rendre une idée tangible.** Un prototype cliquable déclenche des retours bien plus riches qu'un document. Les parties prenantes réagissent à ce qu'elles voient.
- **Explorer plusieurs pistes.** Quand produire une variante coûte quelques minutes, on peut comparer trois parcours au lieu d'en défendre un seul.
- **Réduire la dépendance.** Un chef de produit peut tester une hypothèse d'interface sans mobiliser une équipe.
- **Apprendre.** Lire le code généré et poser des questions à l'assistant est un moyen d'acquérir des bases techniques.

## Une méthode pour un après-midi

### 1. Écrivez le besoin avant de coder (20 minutes)

Rédigez un court cahier des charges : l'utilisateur, le problème, les trois actions essentielles, ce que le prototype ne fera **pas**. Ce texte devient la première consigne et le garde-fou contre la dérive.

### 2. Démarrez par le plus petit parcours (40 minutes)

Demandez d'abord un seul écran qui réalise le parcours principal, avec des données fictives. Résistez à l'envie d'ajouter des fonctions : un petit périmètre se corrige facilement.

### 3. Itérez par petites demandes (1 heure 30)

Une modification à la fois, testée immédiatement. Quand quelque chose casse, décrivez le symptôme précisément (ce que vous avez fait, ce que vous attendiez, ce qui s'est produit) plutôt que de demander « répare ».

### 4. Conservez des points de reprise

Utilisez un outil de gestion de versions ou, à défaut, enregistrez régulièrement l'état qui fonctionne. Les modifications générées peuvent régresser ailleurs.

### 5. Testez avec de vraies personnes (30 minutes)

Faites essayer le prototype à deux ou trois utilisateurs. Notez ce qu'ils comprennent, où ils hésitent, ce qu'ils ne trouvent pas. C'est le vrai résultat de l'après-midi.

## Les limites à garder en tête

### La fiabilité

Le code généré peut sembler fonctionner tout en contenant des erreurs : cas limites oubliés, calculs approximatifs, comportements différents d'une exécution à l'autre. Sans relecture ni tests, on ignore ce qu'on ne sait pas.

### La sécurité et la confidentialité

Un prototype peut exposer des clés d'accès, mal gérer l'authentification ou envoyer des données à des services tiers sans que vous le remarquiez. **N'utilisez jamais de données réelles, personnelles ou confidentielles** dans un prototype non validé, et ne placez pas de secrets dans le code ou dans vos échanges avec l'assistant.

### La maintenabilité

Un code produit sans architecture explicite devient vite difficile à faire évoluer : duplications, dépendances inutiles, absence de tests. Ce qui était rapide à créer devient lent à modifier.

### La propriété et la conformité

Vérifiez les conditions d'usage de l'outil, les licences des composants utilisés et les règles internes de votre organisation avant d'aller plus loin.

## Prototype ou produit : où placer la frontière ?

Un prototype sert à **apprendre**. Un produit doit être fiable, sécurisé, observable et maintenu. Le passage de l'un à l'autre n'est pas une simple « finition » : c'est un autre chantier, généralement porté par une équipe d'ingénierie, qui peut reprendre vos apprentissages, vos maquettes et vos scénarios de test, et le plus souvent réécrire le code.

Une règle pratique : plus l'outil touche des utilisateurs réels, des données sensibles ou des décisions importantes, plus l'exigence de revue et de tests doit être élevée, quelle que soit la rapidité de départ.

## À retenir

- Le vibe coding excelle pour rendre une idée tangible et explorer des variantes.
- Cadrez par écrit, démarrez petit, itérez par petites demandes, gardez des points de reprise.
- Le code généré n'est pas fiable par défaut : relisez, testez, ne mettez pas de données sensibles.
- Un prototype sert à apprendre ; le transformer en produit demande un travail d'ingénierie distinct.

Le module M6 de la formation propose un parcours guidé pour prototyper une idée de bout en bout, et pour en reconnaître les limites.
