---
slug: accuracy-precision-rappel-f1
title: Pourquoi l'accuracy ne suffit pas : précision, rappel, F1
excerpt: Un modèle « précis à 99 % » peut être inutile. Comprenez l'accuracy, la précision, le rappel et le F1, et choisissez la métrique qui correspond au coût réel des erreurs.
category: Fondamentaux
courses: M1
---
Une équipe présente fièrement son modèle de détection de fraude : « 99 % d'accuracy ». Le comité applaudit. Pourtant, si la fraude ne concerne que 1 transaction sur 100, un modèle qui répond systématiquement « pas de fraude » obtient lui aussi 99 %… et ne détecte rien. Ce chiffre flatteur masque l'essentiel.

Choisir la bonne métrique est une décision produit, pas seulement technique : elle traduit ce qui coûte le plus cher à votre utilisateur et à votre organisation.

## L'accuracy et son piège

L'**accuracy** (exactitude) est la proportion de prédictions correctes sur l'ensemble des cas :

```
accuracy = prédictions correctes / total des prédictions
```

Elle est intuitive, mais trompeuse quand les classes sont **déséquilibrées** : fraude rare, maladie rare, panne rare. Dans ces situations, prédire toujours la classe majoritaire donne un score élevé sans aucune valeur.

## La matrice de confusion : le point de départ

```mermaid
quadrantChart
  accTitle: Les quatre cas d'une matrice de confusion
  accDescr: Selon que le cas est réellement positif ou négatif et que le modèle l'a détecté ou non, on obtient vrai positif, faux négatif, faux positif ou vrai négatif.
  title Prédiction du modèle contre réalité
  x-axis Cas réellement négatif --> Cas réellement positif
  y-axis Modèle dit négatif --> Modèle dit positif
  quadrant-1 Vrais positifs
  quadrant-2 Faux positifs
  quadrant-3 Vrais négatifs
  quadrant-4 Faux négatifs
  Alerte justifiée: [0.8, 0.8]
  Fausse alerte: [0.2, 0.8]
  Cas manqué: [0.8, 0.2]
  Écarté à raison: [0.2, 0.2]
```
*Figure 1 : les quatre cas de la matrice de confusion (positions purement illustratives).*


Pour une décision à deux issues (positif/négatif), quatre cas existent :

- **Vrai positif (VP)** : le modèle annonce « fraude », c'est bien une fraude.
- **Faux positif (FP)** : le modèle annonce « fraude », mais la transaction est légitime (fausse alerte).
- **Faux négatif (FN)** : le modèle annonce « légitime », mais c'était une fraude (cas manqué).
- **Vrai négatif (VN)** : le modèle annonce « légitime », et c'est vrai.

Toutes les métriques suivantes se calculent à partir de ces quatre nombres.

## Précision et rappel

La **précision** répond à la question : *quand le modèle déclenche une alerte, a-t-il raison ?*

```
précision = VP / (VP + FP)
```

Le **rappel** (ou sensibilité) répond à : *parmi tous les vrais cas, combien le modèle en attrape-t-il ?*

```
rappel = VP / (VP + FN)
```

Les deux sont en tension. Si vous abaissez le seuil de déclenchement, le modèle détecte davantage de cas (le rappel monte) mais génère plus de fausses alertes (la précision baisse). Inversement, un seuil strict donne peu d'alertes, plus fiables, mais laisse passer des cas.

## Le F1 : un compromis en un seul nombre

Le **F1** est la moyenne harmonique de la précision et du rappel :

```
F1 = 2 × (précision × rappel) / (précision + rappel)
```

La moyenne harmonique pénalise les déséquilibres : un modèle avec une excellente précision mais un rappel très faible obtient un mauvais F1. C'est utile pour comparer des modèles quand vous n'avez pas encore tranché sur l'arbitrage. Mais ce n'est pas une baguette magique : il donne le même poids aux deux dimensions, ce qui n'est presque jamais le cas dans la réalité.

## Un exemple chiffré avec des données fictives

Imaginons 1 000 transactions, dont 10 frauduleuses. Un modèle en détecte 6, mais déclenche aussi 4 fausses alertes.

- VP = 6, FN = 4, FP = 4, VN = 986
- accuracy = (6 + 986) / 1 000 = 99,2 %
- précision = 6 / (6 + 4) = 60 %
- rappel = 6 / (6 + 4) = 60 %

L'accuracy est excellente, alors que 4 fraudes sur 10 passent inaperçues. C'est le rappel qui raconte l'histoire.

## Quelle métrique privilégier ? Une mini-méthode

Posez-vous une question simple : **quelle erreur est la plus coûteuse ?**

1. **Listez les deux types d'erreurs** et décrivez leur conséquence concrète (perte financière, risque de sécurité, irritation de l'utilisateur, charge de revue humaine).
2. **Si le faux négatif est le pire**, privilégiez le **rappel** : dépistage médical, détection de contenu dangereux, alerte de sécurité.
3. **Si le faux positif est le pire**, privilégiez la **précision** : blocage automatique d'un compte, suppression d'un message légitime, recommandation intrusive.
4. **Si les deux comptent**, suivez le F1, ou mieux, fixez des seuils minimums sur chacune des deux métriques.
5. **Définissez le seuil de décision** en conséquence, et vérifiez-le sur des données qui ressemblent à la production.

## Les erreurs de lecture fréquentes

- Évaluer sur les données qui ont servi à l'entraînement : le score est alors optimiste.
- Comparer des modèles sur des jeux de test différents.
- Oublier que la proportion de cas positifs en production peut différer de celle de vos données de test.
- Rapporter une seule métrique sans la matrice de confusion qui la sous-tend.

## À retenir

- L'accuracy est trompeuse quand les classes sont déséquilibrées.
- La précision mesure la fiabilité des alertes, le rappel mesure la couverture des vrais cas.
- Le F1 résume les deux, mais ne remplace pas la réflexion sur le coût des erreurs.
- La bonne métrique découle de l'impact métier, pas de l'habitude.

Ces notions sont travaillées avec des exercices de calcul dans le module M1 de la formation.
