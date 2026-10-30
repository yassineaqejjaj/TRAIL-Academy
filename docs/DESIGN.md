# Design de TRAIL Academy (refonte d'octobre 2026)

Le design vient de la maquette « Trail Academy — Refonte » (canevas Claude : accueil, conseiller de parcours, fiche module et lecteur, espace apprenant). Il est appliqué à tout le site à partir de **jetons** : changer une valeur dans `src/app/globals.css` change tout le site.

## Principes

- **Un seul thème, sombre, en « verre »** : fond bleu nuit, surfaces translucides avec flou d'arrière-plan, deux halos lumineux qui dérivent lentement derrière la page. Il n'y a **pas de thème clair** : la maquette n'en prévoit pas, et deux thèmes doubleraient les contrôles d'accessibilité.
- **Titres en deux graisses** : Sora légère, avec l'idée forte en gras (`.display-light` puis `<b>`). Corps en Inter.
- **Boutons en pilule**, action principale en turquoise avec texte foncé et halo au survol ; liens et petits labels en bleu clair.
- **Mouvement discret** : tout s'arrête avec `prefers-reduced-motion`.

## Jetons (`globals.css`)

| Jeton | Valeur | Usage |
|---|---|---|
| `--bg` | `#050d1c` | fond de page |
| `--surface` / `--surface-2` | blanc à 5 % / 9 % | cartes en verre, survols |
| `--fg` / `--fg-muted` | `#eef2f7` / `#b5c3d6` | texte, texte secondaire |
| `--border` | blanc à 14 % | filets |
| `--accent` (= `--primary`) | `#3ccfc0` | action principale, accents, progression |
| `--blue` / `--kicker` | `#4f8dff` / `#8fb4ff` | étapes validées, petits labels en capitales |
| `--warn`, `--danger`, `--success` | `#f5c26b`, `#ff8a80`, `#5fd49a` | états |
| `--accent-soft`, `--warn-soft` | `#0f3a40`, `#3a2d10` | fonds de badges, **pleins** pour que le contraste soit mesurable |
| `--glass-blur`, `--glass-edge` | flou 24 px + saturation, reflet intérieur | surfaces `.glass` et `.glass-strong` |

Classes utilitaires : `.glass`, `.glass-strong`, `.lift` (survol qui monte), `.cta-glow` (halo turquoise), `.ambient` (halos de fond), `.display-light`, `.pulse-dot`, `.marquee`, `.trail-line`.

## Où c'est appliqué

- **Primitives** (`src/components/ui`) : boutons en pilule, `Card` en verre, FAQ en accordéon de verre, barre de progression lumineuse.
- **Mise en page** : en-tête flottant en verre, bandeau « inscriptions bientôt ouvertes », pied de page avec logo, halos de fond (`.ambient` dans `layout.tsx`).
- **Accueil** : héros avec tracé lumineux et carte de parcours par métier (données du catalogue), bandeau de modules, chiffres réels, résultats, mosaïque des parcours, méthode, « avant d'acheter », formateur, entreprises, offres, FAQ, liste d'attente.
- **Espace apprenant** : barre latérale, carte « Reprendre » avec anneau de progression, carte du parcours (modules validés, en cours, à venir), livrables et attestations.
- **Fiche module, conseiller, administration, lecteur** : mêmes jetons ; les surfaces plates sont devenues des surfaces en verre.

## Logos et icônes

`public/brand/` : `logo-dark.png` (utilisé partout), `logo-light.png` (documents et métadonnées), `mark.png` (symbole seul). `src/app/favicon.ico` (16 à 64 px), `icon.png` et `apple-icon.png` sont générés à partir du symbole.

## Éléments de la maquette volontairement différents

- Les exemples fictifs de la maquette (conversation du conseiller, tableau « Mon équipe », code d'attestation) sont signalés comme fictifs sur la page d'accueil.
- Le « rythme de la semaine » de l'espace apprenant (objectif d'heures hebdomadaires) n'est **pas** repris : il n'existe pas de suivi du temps passé dans la plateforme, et la maquette le marquait « Proposition ».
- Le conseiller en questionnaire garde son déroulé actuel ; la maquette en propose une version pas à pas avec profil en direct, non reprise.
- Contrastes : les jetons sont vérifiés par le contrôle automatisé axe (WCAG 2.2 AA) sur les pages publiques. Pas d'audit manuel.
