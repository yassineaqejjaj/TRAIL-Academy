/**
 * Programmes en cohorte : formations packagées, à places limitées, avec une mission sur site.
 * Différents des parcours (modules en autonomie, accès 18 mois) : ici une promotion, un calendrier, des places comptées.
 * Données statiques de présentation. Prix, dates et nombre de places ne sont PAS inventés : ils restent « à confirmer »
 * tant que le formateur ne les a pas fixés (voir CONTENT_GUIDE.md : aucun contenu fictif).
 */
export interface ProgrammeStep {
  phase: "formation" | "mission" | "projet";
  /** Première et dernière semaine de l'étape (incluses). */
  from: number; to: number;
  title: string; focus: string; onSite?: string; deliverable: string;
}

export interface Programme {
  slug: string;
  title: string;
  subtitle: string;
  tagline: string;
  audience: string;
  durationWeeks: number;
  /** Semaines de formation (cours, ateliers), puis semaines de mission en entreprise. */
  trainingWeeks: number;
  missionWeeks: number;
  /** « mission » : placement chez un client (FDE). « projets » : projets livrés relus par le formateur, sans placement. */
  format: "mission" | "projets";
  /** Jours de présence chez le client par semaine de mission (format « mission » uniquement). */
  onSiteDays?: { min: number; max: number };
  clientType?: string;
  prerequisites: string[];
  outcomes: string[];
  steps: ProgrammeStep[];
  /** Modules du catalogue qui servent de ressources de référence. */
  referenceCourseCodes: string[];
  /** true = promotion à effectif réduit. Le nombre exact de places n'est pas publié tant qu'il n'est pas fixé. */
  limitedSeats: boolean;
  seatsNote: string;
  /** Prix en centimes d'euro. Absent tant que le formateur ne l'a pas fixé (aucune offre n'est alors publiée dans les données structurées). */
  priceCents?: number;
  taxMode?: "ht" | "ttc";
  priceNote: string;
  datesNote: string;
}

export const programmes: Programme[] = [
  {
    slug: "forward-deployed-engineer",
    title: "Forward Deployed Engineer",
    subtitle: "AI Solution Engineer",
    tagline: "Devenez l'ingénieur qui déploie l'IA au plus près du client : 2 semaines de formation, puis 8 semaines de mission au sein d'une PME ou d'une ETI.",
    audience: "Développeurs, data/ML engineers, consultants techniques et solution engineers qui veulent passer de la démo à la mise en production chez le client",
    durationWeeks: 10,
    trainingWeeks: 2,
    missionWeeks: 8,
    format: "mission",
    onSiteDays: { min: 1, max: 2 },
    clientType: "PME ou ETI",
    prerequisites: [
      "Connaissance de Python (scripts, APIs, bibliothèques courantes)",
      "Connaissance de TypeScript (Node.js, appels d'API, intégration web)",
      "Gestion des parties prenantes : savoir recueillir un besoin, aligner des interlocuteurs métier et technique, rendre compte",
    ],
    outcomes: [
      "Cadrer un cas d'usage IA avec un dirigeant ou un responsable métier de PME ou d'ETI, et en définir le critère de réussite",
      "Prototyper puis intégrer une solution (LLM, RAG, agent) dans le système d'information existant du client",
      "Évaluer, sécuriser et superviser la solution avant sa mise en service",
      "Conduire l'adoption : former les utilisateurs, documenter, transférer la maintenance",
      "Rendre compte de la valeur créée aux parties prenantes, chiffres à l'appui",
    ],
    steps: [
      { phase: "formation", from: 1, to: 1, title: "Fondations du déploiement", focus: "Cadrer un besoin et gérer les parties prenantes ; construire avec un LLM, le contexte et la recherche documentaire (RAG).", deliverable: "Prototype d'atelier et grille de cadrage." },
      { phase: "formation", from: 2, to: 2, title: "Agents, fiabilité et préparation de mission", focus: "Agents, sécurité (injection de prompt, fuites de données), évaluation et observabilité ; préparer sa mission chez le client.", deliverable: "Plan de mission validé par le formateur." },
      { phase: "mission", from: 3, to: 4, title: "Immersion et cadrage", focus: "Comprendre le métier du client, cartographier les parties prenantes, choisir un cas d'usage à valeur mesurable.", onSite: "Entretiens et observation du travail réel dans l'entreprise.", deliverable: "Note de cadrage : problème, périmètre, indicateur de succès, risques." },
      { phase: "mission", from: 5, to: 6, title: "Prototype", focus: "Construire un premier prototype avec un LLM, du contexte et, si nécessaire, de la recherche documentaire (RAG).", onSite: "Démonstration du prototype aux utilisateurs, recueil des retours.", deliverable: "Prototype fonctionnel et jeu de cas de test issus du terrain." },
      { phase: "mission", from: 7, to: 8, title: "Intégration", focus: "Brancher la solution aux outils et données du client (APIs, bases, messagerie) ; introduire des agents lorsque c'est justifié.", onSite: "Accès aux systèmes, contraintes IT, validation des flux de données.", deliverable: "Solution intégrée dans un environnement de recette." },
      { phase: "mission", from: 9, to: 9, title: "Fiabilisation et sécurité", focus: "Mesurer la qualité, traiter les risques, mettre en place l'observabilité et le suivi des coûts.", onSite: "Recette avec les utilisateurs et revue sécurité avec le référent du client.", deliverable: "Rapport d'évaluation, plan de sécurité, tableau de suivi." },
      { phase: "mission", from: 10, to: 10, title: "Mise en service et transfert", focus: "Déployer, former les équipes, documenter et transférer ; mesurer la valeur obtenue et présenter la suite.", onSite: "Formation des utilisateurs et restitution à la direction.", deliverable: "Solution en service, documentation d'exploitation, restitution de la valeur." },
    ],
    referenceCourseCodes: ["M18", "M5", "M11", "M12", "M13", "M17", "M15", "M16"],
    limitedSeats: true,
    seatsNote: "Places limitées : la promotion est volontairement de petite taille pour que chaque participant soit accompagné.",
    priceCents: 600000,
    taxMode: "ht",
    priceNote: "6 000 € HT",
    datesNote: "À partir du 19 novembre 2026",
  },
  {
    slug: "product-engineer",
    title: "Product Engineer",
    subtitle: "AI Product Engineer",
    tagline: "Devenez l'ingénieur qui livre des fonctionnalités IA de bout en bout : 2 semaines de formation, puis 6 semaines de projets livrés, relus par le formateur.",
    audience: "Développeurs front, back ou full-stack, product engineers et makers techniques qui veulent concevoir, construire et mettre en production des fonctionnalités IA",
    durationWeeks: 8,
    trainingWeeks: 2,
    missionWeeks: 6,
    format: "projets",
    prerequisites: [
      "Connaissance de TypeScript et d'un framework web (React ou équivalent) : composants, appels d'API, état de l'interface",
      "Bases de Python ou d'un langage serveur, et pratique de Git",
      "Sens du produit : savoir écouter des utilisateurs, hiérarchiser un besoin et arbitrer ce qu'on construit en premier",
    ],
    outcomes: [
      "Transformer un besoin utilisateur en fonctionnalité IA précise, avec un critère de réussite mesurable",
      "Construire, avec des assistants de code et des agents, un prototype fonctionnel puis une fonctionnalité de qualité production",
      "Concevoir l'expérience humain-IA : interface, retours utilisateur, gestion des erreurs et des réponses incertaines",
      "Évaluer, sécuriser et superviser la fonctionnalité (tests de non-régression, observabilité, coût par usage)",
      "Livrer en production, mesurer l'usage et la valeur, puis itérer",
    ],
    steps: [
      { phase: "formation", from: 1, to: 1, title: "Construire vite avec l'IA", focus: "Cadrer une fonctionnalité IA ; construire avec un LLM, le contexte, la recherche documentaire (RAG) et des assistants de code (vibe coding, BMAD).", deliverable: "Prototype d'atelier et spécification de la fonctionnalité." },
      { phase: "formation", from: 2, to: 2, title: "Fiabilité, expérience et choix du projet", focus: "Agents, sécurité, évaluation et observabilité ; expérience humain-IA ; choisir et cadrer son projet.", deliverable: "Fiche de projet validée par le formateur." },
      { phase: "projet", from: 3, to: 4, title: "Cadrage et prototype utilisable", focus: "Définir le problème utilisateur, le périmètre et l'indicateur de succès ; construire un premier prototype avec un LLM, du contexte et, si nécessaire, du RAG.", deliverable: "Note de cadrage et prototype fonctionnel avec jeu de cas de test." },
      { phase: "projet", from: 5, to: 6, title: "Intégration en production", focus: "Intégrer la fonctionnalité à une architecture réelle (APIs, données, authentification), passer en revue de code, introduire des agents lorsque c'est justifié.", deliverable: "Fonctionnalité intégrée, testée et déployée en recette." },
      { phase: "projet", from: 7, to: 7, title: "Fiabilisation et sécurité", focus: "Mesurer la qualité, ajouter des tests de non-régression, traiter les risques, mettre en place l'observabilité et le suivi des coûts.", deliverable: "Suite d'évaluation, plan de sécurité, tableau de suivi." },
      { phase: "projet", from: 8, to: 8, title: "Mise en production et mesure", focus: "Déployer, activer progressivement, mesurer l'usage et la valeur, documenter et présenter le projet.", deliverable: "Fonctionnalité en production, documentation et restitution de la valeur." },
    ],
    referenceCourseCodes: ["M6", "M7", "M5", "M11", "M12", "M14", "M13", "M17", "M9", "M15"],
    limitedSeats: true,
    seatsNote: "Places limitées : la promotion est volontairement de petite taille pour que chaque participant soit accompagné.",
    priceCents: 350000,
    taxMode: "ht",
    priceNote: "3 500 € HT",
    datesNote: "Dates à confirmer",
  },
  {
    slug: "product-builder",
    title: "Product Builder",
    subtitle: "AI Product Builder",
    tagline: "Devenez le profil produit qui construit lui-même : 2 semaines de formation, puis 6 semaines de projets livrés, du besoin utilisateur au produit en ligne.",
    audience: "Product managers, product owners, designers produit, fondateurs et responsables métier qui veulent prototyper et livrer des produits IA sans attendre une équipe de développement",
    durationWeeks: 8,
    trainingWeeks: 2,
    missionWeeks: 6,
    format: "projets",
    prerequisites: [
      "Expérience produit : recueil de besoins, priorisation, échanges avec des utilisateurs et des équipes techniques",
      "Aisance avec les outils numériques ; aucune expérience de programmation n'est exigée",
      "Un cas d'usage produit en tête, ou la volonté d'en choisir un avec le formateur",
    ],
    outcomes: [
      "Cadrer un produit ou une fonctionnalité IA avec une hypothèse de valeur et un critère de réussite",
      "Construire avec des assistants de code (vibe coding) un prototype fonctionnel, testable par de vrais utilisateurs",
      "Spécifier clairement le contexte, les cas limites et les règles de qualité pour un assistant ou une équipe de développement",
      "Évaluer la fiabilité, les risques et le coût du produit avant de le mettre en ligne",
      "Lancer, mesurer l'adoption et décider de la suite, ou transmettre le produit à une équipe technique",
    ],
    steps: [
      { phase: "formation", from: 1, to: 1, title: "Découvrir et construire", focus: "Découverte produit assistée par l'IA ; construire avec un LLM, le contexte et des assistants de code (vibe coding, BMAD) ; premiers prototypes.", deliverable: "Prototype d'atelier et hypothèse de valeur." },
      { phase: "formation", from: 2, to: 2, title: "Qualité, expérience et choix du projet", focus: "Expérience humain-IA, IA responsable, évaluation ; choisir et cadrer son projet.", deliverable: "Fiche de projet validée par le formateur." },
      { phase: "projet", from: 3, to: 4, title: "Découverte et prototype", focus: "Tester le besoin auprès d'utilisateurs, prioriser les hypothèses, construire un premier prototype fonctionnel.", deliverable: "Synthèse de découverte et prototype testé avec des utilisateurs." },
      { phase: "projet", from: 5, to: 6, title: "Version utilisable", focus: "Passer du prototype à un produit utilisable : parcours complet, données, cas limites, spécification claire pour la suite.", deliverable: "Produit utilisable en ligne et spécification de contexte." },
      { phase: "projet", from: 7, to: 7, title: "Fiabilisation et risques", focus: "Mesurer la qualité, traiter les risques, estimer le coût d'usage et préparer l'adoption.", deliverable: "Jeu de tests, analyse de risques, modèle de coûts." },
      { phase: "projet", from: 8, to: 8, title: "Lancement et mesure", focus: "Lancer auprès de premiers utilisateurs, mesurer l'adoption et la valeur, décider de la suite ou transmettre à une équipe technique.", deliverable: "Produit lancé, mesure de la valeur et feuille de route." },
    ],
    referenceCourseCodes: ["M18", "M6", "M7", "M5", "M9", "M14", "M10", "M17", "M16"],
    limitedSeats: true,
    seatsNote: "Places limitées : la promotion est volontairement de petite taille pour que chaque participant soit accompagné.",
    priceCents: 250000,
    taxMode: "ht",
    priceNote: "2 500 € HT",
    datesNote: "Dates à confirmer",
  },
];

export const getProgramme = (slug: string): Programme | undefined => programmes.find((p) => p.slug === slug);
