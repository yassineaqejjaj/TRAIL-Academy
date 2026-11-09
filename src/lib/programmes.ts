/**
 * Programmes en cohorte : formations packagées, à places limitées, avec une mission sur site.
 * Différents des parcours (modules en autonomie, accès 18 mois) : ici une promotion, un calendrier, des places comptées.
 * Données statiques de présentation. Prix, dates et nombre de places ne sont PAS inventés : ils restent « à confirmer »
 * tant que le formateur ne les a pas fixés (voir CONTENT_GUIDE.md : aucun contenu fictif).
 */
export interface ProgrammeWeek { week: number; title: string; focus: string; onSite: string; deliverable: string }

export interface Programme {
  slug: string;
  title: string;
  subtitle: string;
  tagline: string;
  audience: string;
  durationWeeks: number;
  /** Jours de présence chez le client par semaine de mission. */
  onSiteDays: { min: number; max: number };
  clientType: string;
  prerequisites: string[];
  outcomes: string[];
  weeks: ProgrammeWeek[];
  /** Modules du catalogue qui servent de ressources de référence. */
  referenceCourseCodes: string[];
  /** true = promotion à effectif réduit. Le nombre exact de places n'est pas publié tant qu'il n'est pas fixé. */
  limitedSeats: boolean;
  seatsNote: string;
  /** Prix en centimes d'euro. */
  priceCents: number;
  taxMode: "ht" | "ttc";
  priceNote: string;
  datesNote: string;
}

export const programmes: Programme[] = [
  {
    slug: "forward-deployed-engineer",
    title: "Forward Deployed Engineer",
    subtitle: "AI Solution Engineer",
    tagline: "Devenez l'ingénieur qui déploie l'IA au plus près du client : 5 semaines, avec une contribution réelle en PME.",
    audience: "Développeurs, data/ML engineers, consultants techniques et solution engineers qui veulent passer de la démo à la mise en production chez le client",
    durationWeeks: 5,
    onSiteDays: { min: 1, max: 2 },
    clientType: "PME",
    prerequisites: [
      "Connaissance de Python (scripts, APIs, bibliothèques courantes)",
      "Connaissance de TypeScript (Node.js, appels d'API, intégration web)",
      "Gestion des parties prenantes : savoir recueillir un besoin, aligner des interlocuteurs métier et technique, rendre compte",
    ],
    outcomes: [
      "Cadrer un cas d'usage IA avec un dirigeant ou un responsable métier de PME, et en définir le critère de réussite",
      "Prototyper puis intégrer une solution (LLM, RAG, agent) dans le système d'information existant du client",
      "Évaluer, sécuriser et superviser la solution avant sa mise en service",
      "Conduire l'adoption : former les utilisateurs, documenter, transférer la maintenance",
      "Rendre compte de la valeur créée aux parties prenantes, chiffres à l'appui",
    ],
    weeks: [
      { week: 1, title: "Immersion et cadrage", focus: "Comprendre le métier du client, cartographier les parties prenantes, choisir un cas d'usage à valeur mesurable.", onSite: "Entretiens et observation du travail réel chez la PME.", deliverable: "Note de cadrage : problème, périmètre, indicateur de succès, risques." },
      { week: 2, title: "Prototype", focus: "Construire un premier prototype avec un LLM, du contexte et, si nécessaire, de la recherche documentaire (RAG).", onSite: "Démonstration du prototype aux utilisateurs, recueil des retours.", deliverable: "Prototype fonctionnel et jeu de cas de test issus du terrain." },
      { week: 3, title: "Intégration", focus: "Brancher la solution aux outils et données du client (APIs, bases, messagerie) ; introduire des agents lorsque c'est justifié.", onSite: "Accès aux systèmes, contraintes IT, validation des flux de données.", deliverable: "Solution intégrée dans un environnement de recette." },
      { week: 4, title: "Fiabilisation et sécurité", focus: "Mesurer la qualité, traiter les risques (injection de prompt, fuites de données), mettre en place l'observabilité et le suivi des coûts.", onSite: "Recette avec les utilisateurs et revue sécurité avec le référent du client.", deliverable: "Rapport d'évaluation, plan de sécurité, tableau de suivi." },
      { week: 5, title: "Mise en service et transfert", focus: "Déployer, former les équipes, documenter et transférer ; mesurer la valeur obtenue et présenter la suite.", onSite: "Formation des utilisateurs et restitution à la direction.", deliverable: "Solution en service, documentation d'exploitation, restitution de la valeur." },
    ],
    referenceCourseCodes: ["M18", "M5", "M11", "M12", "M13", "M17", "M15", "M16"],
    limitedSeats: true,
    seatsNote: "Places limitées : la promotion est volontairement de petite taille pour que chaque participant soit accompagné.",
    priceCents: 600000,
    taxMode: "ht",
    priceNote: "6 000 € HT",
    datesNote: "Dates de la prochaine promotion à confirmer",
  },
];

export const getProgramme = (slug: string): Programme | undefined => programmes.find((p) => p.slug === slug);
