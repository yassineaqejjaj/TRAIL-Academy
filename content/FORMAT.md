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
