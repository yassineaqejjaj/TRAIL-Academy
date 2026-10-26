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

## Ateliers no-code / low-code (obligatoires)

Chaque module se termine par un dernier chapitre intitulé exactement **« Ateliers no-code et low-code »** (à ajouter **en dernière position**, après les chapitres existants), contenant **3 leçons de type `exercise`**, intitulées « Atelier 1 : … », « Atelier 2 : … », « Atelier 3 : … ». Tous les exercices de ces ateliers se font **uniquement sur des plateformes no-code ou low-code** : aucune ligne de code à écrire ni à lancer, aucun terminal, aucun IDE (ni bloc de code Python, JavaScript, SQL ou shell). Les blocs de texte à copier (prompts, modèles de tableau, JSON de configuration collé dans un champ) sont permis s'ils sont courts.

Contenu de chaque atelier (900 à 2 800 caractères, plus si besoin) :
- **Objectif** (une phrase) et **durée estimée** (30 à 90 min) ;
- **Plateforme(s)** : nom(s) + type (no-code ou low-code) + « offre gratuite ou version libre à la date de rédaction, à vérifier » ; proposer **une alternative** quand c'est possible. Privilégier les outils **libres ou gratuits** (n8n, Flowise, Langflow, Dify, Orange Data Mining, Penpot, NocoDB, Google Sheets, Airtable, Notion, Make, Zapier, Teachable Machine, NotebookLM, Figma/FigJam, Miro, Tally, Looker Studio, Lovable/Bolt/Replit pour le vibe coding…) ;
- **Étapes numérotées** : ce qu'on crée, dans quel ordre, avec les noms génériques des écrans et blocs (les interfaces changent : dire « un bloc de type… », « le menu de partage… » plutôt qu'un chemin de clics exact) ;
- **Résultat attendu** et **critères de réussite** (liste à cocher) ;
- **Pièges** fréquents, **données** : uniquement des données fictives ou publiques, jamais de données personnelles ni confidentielles de son employeur ;
- **Pour aller plus loin** (une variante).
Les ateliers s'appuient sur les notions du module et préparent le livrable. Aucun prix, aucune limite chiffrée d'offre gratuite, aucun lien d'affiliation, aucune promesse de fonctionnalité non vérifiable.

Autres adaptations du module :
- Les leçons du module qui demandent d'écrire ou d'exécuter du code (atelier Python, script…) restent mais reçoivent en **première ligne** la mention en italique : `*Exercice facultatif, destiné aux profils techniques. Les ateliers no-code et low-code du dernier chapitre suffisent pour valider le module.*`
- Le **livrable** (`assignment.instructions_md`) doit pouvoir être réalisé **entièrement** avec les ateliers no-code/low-code : si ses consignes imposent du code, réécrivez-les pour une version sans code (on peut garder une variante « profils techniques » facultative). Conservez la grille d'évaluation.
