---
slug: injection-de-prompt-comprendre-et-reduire-le-risque
title: Injection de prompt : comprendre le risque pour mieux le réduire
excerpt: Un texte reçu par votre assistant peut-il lui donner des ordres ? L'injection de prompt est un risque structurel des applications d'IA. Voici comment le comprendre et le limiter.
category: Sécurité
courses: M13
---
Vous déployez un assistant qui résume les courriels entrants et prépare des brouillons de réponse. Un jour, un message contient, en plus de son contenu apparent, une phrase destinée non pas à vous mais au modèle. Si l'assistant la traite comme une consigne légitime, il peut dévier de sa mission. C'est le principe de l'**injection de prompt**, et c'est l'un des risques les plus importants à considérer quand on connecte un modèle à des contenus et à des outils.

Cet article reste volontairement du côté défensif : comprendre le mécanisme pour concevoir des applications plus sûres.

## Pourquoi ce risque existe

Dans une application classique, le code et les données sont séparés. Pour un modèle de langage, tout arrive sous forme de texte : les instructions du développeur, la demande de l'utilisateur et les contenus externes (pages web, documents, messages). Le modèle n'a pas de frontière infaillible entre « ce que je dois faire » et « ce que je dois seulement lire ». Un texte formulé comme une consigne peut donc influencer son comportement.

On distingue généralement deux situations :

- l'**injection directe** : l'utilisateur lui-même tente d'écarter l'assistant de ses consignes ;
- l'**injection indirecte** : l'instruction se trouve dans un contenu que l'assistant traite (document, page, courriel, résultat d'outil), sans que l'utilisateur légitime en ait conscience.

La seconde est la plus délicate, car elle ne suppose aucune faute de l'utilisateur.

## Ce qui détermine la gravité

Le même défaut produit des conséquences très différentes selon l'application. Trois facteurs se combinent :

- **l'accès à des données sensibles** (documents internes, informations personnelles) ;
- **l'exposition à du contenu non maîtrisé** (courriels, pages web, fichiers déposés) ;
- **la capacité d'agir ou de communiquer vers l'extérieur** (envoyer un message, modifier une donnée, appeler une interface).

Lorsqu'une application réunit ces trois éléments, le risque devient élevé. Un assistant qui ne fait que résumer un texte, sans données privées ni action, expose bien moins.

## Un principe central : on ne peut pas tout filtrer

Aucune technique connue ne garantit aujourd'hui qu'un modèle ignorera toujours une instruction malveillante. Les filtres, les consignes de prudence et les modèles de détection **réduisent** le risque sans l'annuler. La stratégie réaliste est donc la **défense en profondeur** : limiter ce qu'une défaillance peut causer, plutôt que compter sur une prévention parfaite.

## Mesures défensives concrètes

### Limiter les privilèges

Donnez à l'assistant uniquement les droits dont il a besoin : lecture seule quand c'est possible, périmètre de données réduit, outils limités. Ce qu'il ne peut pas faire ne peut pas être détourné.

### Séparer les rôles

Évitez qu'un même composant lise du contenu non fiable, accède à des données sensibles et envoie des messages vers l'extérieur. Scinder ces fonctions entre plusieurs composants aux droits distincts réduit l'impact d'un détournement.

### Marquer les contenus externes

Délimitez clairement les contenus tiers et indiquez au modèle qu'ils sont des **données à analyser**, non des consignes. Ce n'est pas infaillible, mais cela réduit les erreurs courantes.

### Valider les actions sensibles

Demandez une confirmation humaine pour les opérations à effet important : envoi externe, suppression, paiement, modification de droits. La confirmation doit montrer ce qui va réellement être fait.

### Contrôler les sorties

Vérifiez ce que l'assistant produit avant de l'exécuter ou de l'afficher : format attendu, destinations autorisées, absence de données qui ne devraient pas sortir.

### Journaliser et surveiller

Conservez les entrées, les appels d'outils et les décisions pour détecter des comportements anormaux et enquêter après coup.

### Tester régulièrement

Constituez avec votre équipe de sécurité un jeu de scénarios défensifs, rejoué à chaque évolution du système, et revoyez les protections quand les capacités de l'assistant changent.

## Une grille d'analyse de risque en quatre questions

Pour chaque fonctionnalité qui utilise un modèle :

1. **Quels contenus non fiables entrent dans le contexte ?**
2. **À quelles données sensibles l'assistant a-t-il accès ?**
3. **Quelles actions ou sorties peut-il déclencher ?**
4. **Qu'arrive-t-il au pire si le modèle suit une instruction indésirable ?**

Si la réponse à la dernière question est inacceptable, réduisez les droits, ajoutez une validation humaine ou revoyez la conception.

## À retenir

- L'injection de prompt exploite l'absence de frontière stricte entre instructions et données pour un modèle.
- Le risque dépend de l'accès aux données, de l'exposition à du contenu non maîtrisé et de la capacité d'agir.
- Aucune parade n'est absolue : privilégiez la défense en profondeur et la limitation de l'impact.
- Moindres privilèges, séparation des rôles, validation humaine, contrôle des sorties et journalisation sont vos leviers principaux.

Le module M13 de la formation aborde la sécurité des applications d'IA dans cette perspective défensive, avec des exercices d'analyse de risque.
