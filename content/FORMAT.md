# Format des contenus de formation

Un fichier JSON par module dans `content/modules/` (`m<N>-<slug>.json`), chargé en **brouillon** par `npm run content:load -- --module M<N>`.
Modèle de référence : `content/modules/m1-machine-learning.json`.

```json
{
  "course": "M4", "slug": "prompt-engineering", "source": "…",
  "chapters": [ { "title": "…", "lessons": [ { "title": "…", "kind": "reading|exercise|demo", "body_md": "…" } ] } ],
  "quiz": { "title": "Quiz du module", "pass_percent": 70, "max_attempts": null,
            "questions": [ { "kind": "single_choice|multiple_choice|free_text", "prompt": "…", "feedback": "…", "options": [["libellé", true]] } ] },
  "assignment": { "title": "…", "instructions_md": "…" }
}
```

## Règles

- Français, vouvoiement, ton pédagogique et concret. Public : chefs de produit et professionnels du numérique.
- Le contenu est **réécrit et complété** à partir des slides du formateur : pas de copie mot à mot, pas de logo ni de nom d'entreprise ou de collègue, aucun nom d'employeur, aucune anecdote client.
- **Exactitude d'abord** : n'affirmer que ce qui est établi ou clairement présenté comme un ordre de grandeur. Pas de chiffre, de date, de version d'outil ou d'attribution (« l'entreprise X fait Y ») que vous ne pouvez pas justifier. Dans le doute, rester général. Les outils évoluent vite : écrire « à la date de rédaction » plutôt que d'affirmer l'état courant, et ne pas inventer de fonctionnalités.
- Markdown simple : titres `##`/`###`, listes, gras, code en blocs. **Pas de tableaux**, pas de HTML (non rendus).
- Chaque leçon est un **complément texte** à la vidéo que le formateur ajoutera : objectifs, explications, exemples, points d'attention, courte mise en pratique ou question de réflexion. 800 à 2 500 caractères environ, plus pour une leçon pratique.
- Quiz : 20 à 30 questions, un mélange de `single_choice` (une seule bonne option), `multiple_choice` (au moins deux bonnes), et 1 ou 2 `free_text` (sans options). 4 options pour les choix uniques. Chaque question a un `feedback` explicatif. Pas d'« aucune des réponses ». Les mauvaises réponses doivent être plausibles.
- Un **livrable** (`assignment`) concret, avec grille d'évaluation, réalisable sans accès à des données confidentielles.
- Les modules pratiques incluent des exercices guidés ; tout code fourni doit être correct et testable.
- Les lessons `kind`: `reading` (lecture), `exercise` (pratique guidée), `demo`.

## Schémas et visualisations (Mermaid)

Chaque module contient **au moins 4 schémas** (idéalement 5 à 8), écrits en texte Mermaid dans le `body_md` des leçons, dans un bloc de code ```` ```mermaid ````. Ils sont rendus en SVG dans le navigateur (clair et sombre) et vérifiés par `tests/content.test.ts`.

Règles :
- Variété : au moins un schéma hors `flowchart` par module. Types utiles : `flowchart` (processus, architecture), `sequenceDiagram` (échanges entre acteurs), `stateDiagram-v2` (états), `quadrantChart` (matrices 2×2), `pie` (répartitions, **données illustratives signalées comme telles**), `timeline` (histoire, feuille de route), `mindmap` (cartes de notions), `journey` (parcours utilisateur), `gantt` (planification). Éviter les types bêta.
- Première ligne après le type : `accTitle: …` puis `accDescr: …` (courte description pour lecteurs d'écran), obligatoires.
- Libellés en français, courts ; mettre entre guillemets tout libellé contenant `( ) : , / # ;` ou des accents problématiques : `A["Libellé (précis)"]`. Pas de HTML. 25 nœuds maximum, 40 lignes maximum.
- **Légende obligatoire** sur la ligne qui suit immédiatement la clôture du bloc (sans ligne vide) : `*Figure N : légende.*` (numérotation par leçon).
- Un schéma doit **expliquer** (relations, flux, comparaison), pas décorer. Les chiffres sont fictifs et le disent.
- Les schémas s'insèrent dans les leçons existantes, à l'endroit où ils éclairent le texte ; ne changer ni les titres de leçons, ni le reste du texte.
