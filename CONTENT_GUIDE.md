# Guide du contenu

Principe : **aucun contenu fictif**. Un module n'est publié que lorsque le formateur a fourni et validé du contenu authentique.

## Fiche d'un module (Administration → Cours)

Titre, résumé, phase, niveau, durée **estimée** (à confirmer), thèmes, outils, **objectifs mesurables**, livrable pratique, prérequis, SEO, règles de complétion (leçons, quiz, devoirs). Un module sans objectif ou sans leçon publiée ne peut pas être publié.

## Leçons

- **Texte** : Markdown (titres, listes, liens, code). Le HTML brut n'est jamais rendu.
- **Vidéo** : dans la leçon, panneau **Vidéo → Envoyer la vidéo** (mp4, mov, m4v, webm ou mkv, 4 Go max.). Le fichier part directement dans le bucket privé ; le service `video-worker` l'encode en HLS adaptatif (360/720/1080 p selon la source, segments de 6 s) puis rattache la vidéo à la leçon. Le statut s'affiche dans le panneau (en attente → encodage → prête, ou échec avec bouton *Relancer*). Ensuite : ajouter chapitres (`2:30 Titre`, un par ligne) et transcription.
  La lecture passe par la passerelle de streaming avec un jeton de 2 h ; il n'existe aucun lien permanent. Un nouvel envoi remplace la vidéo une fois son encodage terminé.
  Repli manuel : `scripts/encode-hls.sh lecon.mp4 m4-intro-01` puis coller l'identifiant dans les champs avancés de la leçon (source « HLS auto-hébergé »).
- **Sous-titres** : fichier WebVTT (`.vtt`, 1 Mo max), envoyé directement au bucket.
- **Ressources** : PDF, Office, CSV, JSON, images, archives (50 Mo max, types contrôlés). Les apprenants reçoivent un lien de 60 s après vérification de leur accès.
- Une leçon en **brouillon** est invisible des apprenants et ne compte pas dans la progression. Si des apprenants ont déjà progressé, la supprimer est refusé : repasser en brouillon.

## Évaluations

- **Quiz** : choix unique, choix multiples (correct seulement si l'ensemble exact est choisi), réponse libre (relue par le formateur, exclue du score automatique). Seuil de réussite et nombre de tentatives par quiz. Chaque question à choix doit avoir une bonne réponse.
- **Devoirs** : consignes en Markdown ; l'apprenant répond par texte et/ou fichier ; **le formateur décide** (accepter, demander une révision avec commentaire). Accepter peut déclencher la complétion et l'attestation.

## Publication et vente

1. Contrôle de complétude (Fiche du module → Publication).
2. Publier le module.
3. **Produits et prix** : définir le prix, puis **ouvrir l'offre** (refusé si un module de l'offre n'est pas publié). Dépublier un module ferme toutes les offres qui le contiennent ; les apprenants existants gardent leur accès.

## Contenu éditorial (Administration → Contenu du site)

Bandeau d'accueil, profil du formateur, FAQ, **témoignages** (publication seulement avec une référence de consentement vérifiable ; aucun logo ni contenu d'un ancien employeur sans autorisation explicite), articles (SEO, formations liées), pages légales (modèles à faire valider).

## Contenu de démonstration

`db/dev-fixture.sql` crée des leçons, un quiz et un devoir **factices** pour le module M4 : textes marqués `[CONTENU DE TEST]`, aucune vidéo. À n'utiliser qu'en développement.

## Contenu rédigé fourni avec le dépôt (brouillons)

`content/modules/*.json` contient, pour 15 modules, des leçons-textes, un quiz (20 à 30 questions), un livrable avec grille ; `content/blog/*.md` contient 12 articles. Le format est décrit dans `content/FORMAT.md` et vérifié par `tests/content.test.ts` (structure, quiz cohérents, aucune mention d'employeur ou de collègue).

Chargement **en brouillon** (rien n'est visible tant que vous ne publiez pas) :

```bash
DATABASE_URL=… DATABASE_SSL=require npm run content:load -- --all --blog
```

Un module qui a déjà des chapitres est ignoré (`--replace` le recrée, sauf si des apprenants ont de l'activité). Chaque texte est un **complément** à vos vidéos, réécrit à partir de vos slides : relisez-le, ajoutez vos vidéos, puis publiez leçon par leçon (Administration → Cours) et les articles (Contenu du site). Le module M18 (AI-Powered Discovery) n'a pas encore de contenu : les slides sont attendus. M3 et M9 ont été conçus à partir du programme du catalogue, sans slides : relisez-les avec une attention particulière.

## Schémas, lecture audio, aperçu gratuit

- **Schémas** : 114 schémas Mermaid sont intégrés aux leçons (et 3 aux articles) : écrits en texte dans un bloc ```` ```mermaid ````, rendus en SVG (clair/sombre), décrits pour les lecteurs d'écran (`accTitle`, `accDescr`) et légendés. Règles dans `content/FORMAT.md`, vérifiées par les tests.
- **Lecture audio** : un bouton « Écouter » lit les leçons texte et les articles avec la synthèse vocale du navigateur (gratuite, sans compte). Le code est ignoré, les schémas sont annoncés par leur titre, le bloc lu est surligné. Selon le navigateur, la voix peut être traitée par le fournisseur du navigateur.
- **Aperçu gratuit** : la première leçon de chaque module est lisible sans compte sur `/formations/<module>/apercu`. Pour changer de leçon d'aperçu : case « Aperçu gratuit » dans la leçon (Administration → Cours).
- **Programme public** : la page d'un module liste ses chapitres et leçons (titres uniquement, jamais le texte).
- **Avec vos vidéos** : quand une leçon a une vidéo, son texte reste disponible dans l'onglet « Texte » sous le lecteur.
- Mise à jour des textes en ligne sans toucher aux ids, statuts ni progressions : `npm run content:load -- --all --blog --sync`.
