# Design de TRAIL Academy (refonte d'octobre 2026, thèmes clair et sombre)

Le design vient de la maquette « Trail Academy — Refonte » (canevas Claude). Il est appliqué à tout le site à partir de **jetons** : changer une valeur dans `src/app/globals.css` change tout le site, dans les deux thèmes.

> **Règle pour tout nouveau composant** : tout nouveau composant TRAIL Academy doit fonctionner en thème clair et sombre sans modification supplémentaire de son code métier. Il n'utilise que des jetons (classes Tailwind `bg-surface`, `text-fg`, `border-border`, etc.), jamais une couleur écrite en dur ni une condition sur le thème.

## Principes

- **Deux thèmes, un seul jeu de jetons.** Le thème **sombre** (par défaut) est en « verre » : fond bleu nuit, surfaces translucides avec flou, deux halos lumineux qui dérivent. Le thème **clair** est sobre et lisible : fond crème, cartes blanches à bordure discrète et ombre douce, turquoise plus profond pour le texte et les actions.
- **Le clair n'a pas de verre** : ni translucidité ni flou sur les surfaces de lecture, halos de fond supprimés, halos décoratifs de cartes très réduits. Les menus et en-têtes flottants restent opaques à 92 %.
- **Titres en deux graisses** : Sora légère, idée forte en gras (`.display-light` puis `<b>`). Corps en Inter.
- **Boutons en pilule** ; action principale en turquoise (texte foncé en sombre, blanc en clair).
- **Mouvement discret** : le changement de thème dure 150 à 250 ms (classe temporaire `.theme-switching`) et tout s'arrête avec `prefers-reduced-motion`.
- **Lecteur de cours** : colonne de 72 caractères, corps 17 px, interligne 1,7, code et tableaux sur fond en retrait, citations sur fond d'accent, pas de halo derrière le texte. Le lecteur vidéo reste sombre dans les deux thèmes.

## Palette

| Jeton | Sombre | Clair | Usage |
|---|---|---|---|
| `--bg` | `#050d1c` | `#faf8f4` | fond de page |
| `--surface` | blanc 5 % | `#ffffff` | cartes |
| `--surface-2` | blanc 9 % | `#f2f5f5` | survols, zones secondaires |
| `--fg` | `#eef2f7` | `#0b1f3a` | texte |
| `--fg-muted` | `#b5c3d6` | `#526174` | texte secondaire |
| `--border` | blanc 14 % | `#e2e7ea` | filets |
| `--primary` / `--accent` | `#3ccfc0` | `#0b7a83` | action principale, accents |
| `--primary-fg` / `--on-accent` | `#04131f` | `#ffffff` | texte sur action |
| `--accent-soft` / `--accent-ink` | `#0f3a40` / `#3ccfc0` | `#e7f4f1` / `#075f67` | badges, fonds d'accent |
| `--blue` / `--kicker` | `#4f8dff` / `#8fb4ff` | `#2563eb` / `#1d4ed8` | accent secondaire, petits labels |
| `--success` / `--warn` / `--danger` | `#5fd49a` / `#f5c26b` / `#ff8a80` | `#067647` / `#7a4e00` / `#b42318` | états |
| `--warn-soft` | `#3a2d10` | `#fff1d6` | fond d'avertissement |
| `--ring` | `#3ccfc0` | `#0b7a83` | focus visible |
| `--tint`, `--tint-weak` | blanc 10 % / 5 % | marine 6 % / 3 % | pastilles, survols |
| `--inset` | noir 28 % | `#f2f5f5` | zones en retrait (code, onglets, transcription) |
| `--hairline` | blanc 12 % | `#e2e7ea` | séparateurs dans les cartes |
| `--selected`, `--disabled` | turquoise 16 % / blanc 40 % | `#e7f4f1` / gris | sélection, désactivé |
| `--field-border` | blanc 40 % | `#7b8aa0` | bord des champs (≥ 3:1) |
| `--band*` | `#0a1a33` | `#0b1f3a` | bandeaux sombres (restent sombres) |

Classes utilitaires : `.glass`, `.glass-strong`, `.glass-blur`, `.elevated`, `.lift`, `.cta-glow`, `.ambient`, `.display-light`, `.pulse-dot`, `.marquee`, `.trail-line`. Chacune a sa variante claire dans `globals.css`.

## ThemeToggle et préférence

- **Composant** : `src/components/layout/theme-toggle.tsx`. Bouton soleil/lune de 44 px, `aria-label` « Activer le thème clair » ou « Activer le thème sombre » selon l'état. Présent dans l'en-tête public (et son menu mobile), l'espace apprenant, le lecteur, l'administration et le compte.
- **Mécanisme unique** : l'attribut `data-theme` sur `<html>`. Le rendu serveur écrit `dark` ; un petit script en `<head>` (`layout.tsx`) lit `localStorage.theme` **avant le premier rendu** et pose `light` ou `dark`, d'où l'absence de flash. `<html>` porte `suppressHydrationWarning`.
- **Préférence** : clé `theme` dans `localStorage`. Toute valeur absente, illisible ou inconnue donne le sombre. Aucun cookie, aucune donnée serveur ; si le stockage est bloqué, le choix vaut pour la page en cours.
- **`color-scheme`** suit le thème (barres de défilement, champs natifs).
- **Logos** : `Logo` affiche les deux fichiers (`logo-dark.png`, `logo-light.png`) ; le CSS n'en montre qu'un.
- Le thème système (`prefers-color-scheme`) n'est volontairement **pas** suivi : le sombre est le défaut pour les nouveaux visiteurs, comme demandé.

## Accessibilité

Cible WCAG 2.2 AA dans les deux thèmes. `tests/theme-contrast.test.ts` calcule les rapports de contraste à partir des jetons (texte ≥ 4,5:1, éléments d'interface ≥ 3:1, jetons translucides composés sur le fond). Les tests axe de bout en bout (`e2e/quality.spec.ts`, `e2e/theme.spec.ts`) parcourent les pages publiques, l'espace apprenant, le lecteur avec le tuteur ouvert et l'administration dans les deux thèmes. Pas d'audit manuel.

## Règles pour un nouveau composant

1. Couleurs uniquement par jetons ; si un besoin n'a pas de jeton, **ajouter le jeton dans les deux thèmes** de `globals.css` (et dans `@theme inline` si une classe Tailwind est utile), puis ajouter sa paire au test de contraste.
2. Pas de `dark:` / `light:` ni de lecture du thème en JavaScript dans un composant métier.
3. Pas de filtre global sur les images ; une image qui doit changer selon le thème a deux fichiers et deux classes (voir `Logo`).
4. Bords de champs : `--field-border`. Fonds en retrait : `--inset`. Séparateurs : `--hairline`.
5. Cibles tactiles ≥ 44 px, focus visible (`--ring`), mouvements coupés avec `prefers-reduced-motion`.
6. Vérifier la page dans les deux thèmes (capture ou axe) avant livraison.

## Où c'est appliqué

- **Primitives** (`src/components/ui`) : boutons, `Card`, FAQ, barre de progression.
- **Mise en page** : en-tête flottant, bandeau « inscriptions bientôt ouvertes », pied de page, halos de fond (sombre seulement).
- **Accueil, catalogue, parcours, tarifs, conseiller, formateur, sessions, entreprises** ; **espace apprenant**, **lecteur**, **tuteur IA**, **compte**, **administration**.

## Logos et icônes

`public/brand/` : `logo-dark.png` (thème sombre), `logo-light.png` (thème clair et documents), `mark.png` (symbole). `src/app/favicon.ico`, `icon.png` et `apple-icon.png` viennent du symbole.

## Éléments de la maquette volontairement différents

- Les exemples fictifs de la maquette (conversation du conseiller, « Mon équipe », code d'attestation) sont signalés comme fictifs sur la page d'accueil.
- Le « rythme de la semaine » n'est pas repris : aucun suivi du temps passé n'existe dans la plateforme.
- Le thème clair n'existe pas dans la maquette ; sa palette vient de la demande du propriétaire.
- Limites : captures de `docs/screenshots` en thème sombre ; pas d'audit manuel d'accessibilité ; diagrammes Mermaid et leçons à contenu réel non revus visuellement en thème clair.
