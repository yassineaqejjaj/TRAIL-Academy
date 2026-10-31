# Conseiller et tuteur IA : investigation (octobre 2026)

**Statut : étude, rien n'est construit.** Objectif demandé : un assistant qui s'appuie sur le contenu des formations par une recherche documentaire avec **citations** (RAG), qui aide à **comprendre plus simplement** et à **reformuler**, et qui **assiste sur les exercices** quand c'est utile.

## 1. Ce que la maquette dit, et ce qu'elle ne dit pas

La maquette (canevas « Trail Academy — Refonte ») ne contient **aucun écran de tuteur** dans le lecteur de cours. Elle montre deux choses proches :

1. **Le conseiller de parcours** (écran « Conseiller de parcours ») : un questionnaire pas à pas avec, à droite, un profil qui se dessine en direct (chips Rôle, Objectif, Expérience…) et un « parcours pressenti ». Calculé dans le navigateur.
2. **Un exemple de conversation** sur l'accueil : la personne écrit avec ses mots, le conseiller répond en **citant ses mots** (« Vous parlez de *reporting mensuel*… ») et recommande un parcours et un premier module.

Le lecteur de la maquette a un plan du cours, une barre audio et un schéma, mais pas d'assistant. Il faut donc **concevoir** le tuteur en reprenant le langage visuel existant (bulles de conversation, citations en turquoise, panneau en verre), pas en l'implémentant d'après un écran.

## 2. Ce qui existe déjà dans le code

- Conseiller de parcours en texte libre, calculé dans le navigateur (similarité de texte, règles), avec une **synthèse optionnelle par un modèle de langage** (`ADVISOR_LLM_URL`, `ADVISOR_LLM_MODEL`, compatible OpenAI, désactivée par défaut, **jamais testée avec un vrai modèle**). Le modèle ne choisit pas les modules, sa sortie est assainie et rejetée s'il cite un module inconnu.
- Contenu : 631 leçons (~234 000 mots), environ 3 800 sections de niveau 2, en Markdown dans `lessons.body_md`. C'est petit : une recherche plein texte suffit pour démarrer.
- Droits d'accès **dans la base** : `can_view_lesson()` ne donne une leçon qu'à son propriétaire, à un administrateur, ou si elle est en aperçu gratuit. Les bonnes réponses des quiz ne sont lisibles que par l'administration.
- Limiteur de débit partagé en base, journal d'audit, consentements.

## 3. Deux surfaces, un seul moteur

| | Conseiller de parcours (public) | Tuteur dans le lecteur (connecté) |
|---|---|---|
| Qui | visiteur, sans compte | apprenant avec accès |
| Sources | catalogue public : résumés, objectifs, livrables, programmes, aperçus gratuits | leçons auxquelles la personne a droit, ressources de la leçon |
| Réponse | recommande un parcours et un premier module, **avec citations** vers les fiches | explique, reformule, donne un exemple, **avec citations** vers les sections |
| Écran | écran « Conseiller » de la maquette + bulles de l'accueil | panneau en verre dans le lecteur (nouveau) |

Moteur commun : recherche → sélection d'extraits → génération contrainte → vérification des citations.

## 4. Architecture proposée

1. **Découpage (chunking)** : à la publication d'une leçon, découpage par `##` en extraits (~100 à 300 mots) avec `lesson_id`, titre, ancre, ordre. Table `content_chunks` (colonnes de recherche plein texte `french` + `unaccent`). Réindexation automatique au `content:load --sync` et à l'édition.
2. **Recherche** : `ts_rank` plein texte + similarité `pg_trgm` pour les fautes de frappe. Pas de base vectorielle au départ : l'image Postgres de Railway (`postgres-ssl`) n'inclut pas `pgvector` à ma connaissance (non vérifié). Les embeddings sont une amélioration possible (changer d'image ou utiliser un service), à décider après mesure.
3. **Lecture comme l'utilisateur** : la recherche s'exécute avec `asUser(user.id, …)`. La sécurité par ligne garantit qu'**aucun extrait payant ne sort pour quelqu'un qui n'y a pas droit**, même si le code se trompe. Visiteur : uniquement aperçus gratuits et catalogue.
4. **Génération** : modèle compatible OpenAI (réutilise la configuration existante, avec une variable dédiée pour ne pas mélanger les budgets). Consigne : répondre **uniquement** à partir des extraits numérotés fournis, citer `[1]`, `[2]`, dire « je ne trouve pas dans le cours » sinon.
5. **Vérification après coup** : la réponse est rejetée ou nettoyée si elle cite un numéro absent, contient un lien, du HTML ou un identifiant de module hors liste. Chaque citation devient un lien vers `/apprendre/<module>/<leçon>#ancre` (ou la fiche publique pour le conseiller).
6. **Mémoire courte** : les 4 derniers échanges de la conversation, côté serveur uniquement le temps de la requête ; **rien n'est conservé** sans décision explicite (voir §7).

## 5. Les trois aides demandées

- **Comprendre plus simplement** : boutons « Explique plus simplement », « Donne un exemple », « Résume en 3 points » sur la leçon ou sur un passage sélectionné ; le modèle reçoit le passage et son contexte, pas tout le module.
- **Reformuler** : « Reformule avec mes mots » (la personne colle sa phrase, le tuteur la compare aux extraits et signale les écarts avec citation).
- **Assister sur les exercices** : mode **indices progressifs**. Niveau 1 : relire la consigne et le critère de réussite. Niveau 2 : pointer l'extrait du cours utile. Niveau 3 : poser une question qui guide. **Jamais la solution complète d'un livrable** : le livrable est relu par le formateur et l'attestation en dépend. Le tuteur ne reçoit **jamais** les bonnes réponses des quiz et refuse de les deviner à la place de la personne.

## 6. Interface (dans le langage de la maquette)

- Bouton « Poser une question » dans le lecteur, panneau en verre (`glass-strong`) à droite ou en tiroir sur mobile.
- Bulles : personne à droite (fond gris translucide), tuteur à gauche (fond turquoise léger), mots cités en turquoise gras ; citations en puces cliquables « [1] M4 · Les frameworks › CARE ».
- Mention permanente « Réponse générée par une IA, à vérifier dans la leçon ».
- États : chargement discret, erreur claire, limite atteinte (« vous avez posé N questions aujourd'hui »), hors périmètre (« je ne trouve pas dans ce cours »).
- Accessibilité : zone de résultats annoncée (`aria-live`), focus géré, tout au clavier, respect de `prefers-reduced-motion`.

## 7. Risques et garde-fous

| Risque | Parade |
|---|---|
| Fuite de contenu payant | recherche en tant qu'utilisateur (RLS), test automatique « un non-inscrit ne reçoit aucun extrait payant » |
| Réponse inventée | génération limitée aux extraits, citations vérifiées, réponse « je ne trouve pas » sinon, jeu d'évaluation (voir §8) |
| Triche sur les exercices | indices progressifs, pas de solution de livrable, pas d'accès aux réponses de quiz |
| Injection de prompt par l'apprenant | texte de la personne traité comme donnée, aucun outil ni action, sortie assainie, longueur limitée |
| Coût qui dérape | quota par personne et par jour dans le limiteur existant, plafond global mensuel, max de jetons par réponse |
| Données personnelles | la question est envoyée au fournisseur du modèle : à écrire dans la politique de confidentialité (fournisseur, données, base légale, durée), **à faire valider par un juriste** ; consigne affichée de ne pas saisir de données personnelles ni confidentielles |
| Transparence | mention « généré par une IA » à chaque réponse (obligation de transparence des chatbots en termes généraux : à faire confirmer) |
| Conservation | par défaut aucune conversation conservée ; si vous voulez un historique (utile pour s'améliorer), consentement explicite et suppression avec le compte |

## 8. Comment on saura que ça marche

- **Tests sans réseau** (faux modèle, comme pour le conseiller) : découpage, droits d'accès, vérification des citations, indices progressifs, refus des solutions.
- **Jeu d'évaluation de la recherche** : requêtes tirées des titres de sections et des 856 questions de quiz (sans leurs réponses) ; mesure : l'extrait attendu est-il dans les 3 premiers ?
- **Essai avec un vrai modèle** sur 30 questions par module et relecture humaine : je ne peux pas affirmer la qualité sans cet essai.

## 9. Étapes proposées

1. Migration : table `content_chunks`, index plein texte, fonction de réindexation ; tests des droits.
2. Moteur : recherche, assemblage des extraits, prompt, vérification des citations, quotas ; tests avec faux modèle.
3. Conseiller de parcours public avec citations (catalogue et aperçus).
4. Tuteur dans le lecteur : panneau, boutons « simplifier / exemple / reformuler », mode exercices.
5. Textes légaux (confidentialité, mention IA), documentation, évaluation avec un vrai modèle, réglage des quotas.

## 10. Décisions à prendre

1. **Fournisseur du modèle** et budget mensuel (le coût dépend du modèle ; je ne l'ai pas estimé).
2. **Périmètre de départ** : conseiller public d'abord, tuteur d'abord, ou les deux.
3. **Historique des conversations** : aucun (recommandé au départ) ou conservé avec consentement.
4. **Accès** : tuteur réservé aux apprenants payants (recommandé) ou aussi dans les aperçus gratuits.
5. **Exercices** : confirmer la règle « indices, jamais de solution de livrable » et le nombre de questions par jour.
