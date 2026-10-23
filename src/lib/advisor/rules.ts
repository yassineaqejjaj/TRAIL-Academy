/**
 * Deterministic advisor rules. Stored as plain configuration so they can later be
 * moved to the database (system_settings) and edited from the admin interface.
 */
export const roles = [
  { value: "product", label: "Product Manager / Product Owner" },
  { value: "ai-product", label: "AI Product Manager" },
  { value: "consulting", label: "Consultant" },
  { value: "project", label: "Chef de projet" },
  { value: "analyst", label: "Business Analyst" },
  { value: "transformation", label: "Transformation digitale" },
  { value: "engineering", label: "Ingénierie / Data" },
  { value: "management", label: "Manager / Team leader" },
  { value: "other", label: "Autre" },
] as const;

export const objectives = [
  { value: "use", label: "Utiliser l'IA au quotidien" },
  { value: "product", label: "Intégrer l'IA dans mes produits" },
  { value: "build", label: "Construire des systèmes IA" },
  { value: "lead", label: "Conduire l'adoption de l'IA dans mon organisation" },
] as const;

export const experienceLevels = [
  { value: "junior", label: "Moins de 3 ans" },
  { value: "mid", label: "3 à 8 ans" },
  { value: "senior", label: "Plus de 8 ans" },
] as const;

export const familiarityLevels = [
  { value: "none", label: "Je débute" },
  { value: "user", label: "J'utilise des assistants IA" },
  { value: "builder", label: "J'ai déjà construit avec l'IA" },
] as const;

export const technicalLevels = [
  { value: "low", label: "Peu à l'aise" },
  { value: "medium", label: "À l'aise" },
  { value: "high", label: "Très à l'aise" },
] as const;

export type Role = (typeof roles)[number]["value"];
export type Objective = (typeof objectives)[number]["value"];
export type Experience = (typeof experienceLevels)[number]["value"];
export type Familiarity = (typeof familiarityLevels)[number]["value"];
export type Technical = (typeof technicalLevels)[number]["value"];

export interface AdvisorInput {
  role: Role;
  experience: Experience;
  familiarity: Familiarity;
  objective: Objective;
  technical: Technical;
  hoursPerWeek: number;
}

export interface Rule {
  id: string;
  when: Partial<Pick<AdvisorInput, "role" | "experience" | "familiarity" | "objective" | "technical">>;
  /** Score added per path slug. */
  score: Record<string, number>;
  reason: string;
}

export const rules: Rule[] = [
  { id: "role-product", when: { role: "product" }, score: { "product-manager-augmente": 3 }, reason: "Votre rôle de Product Manager / Product Owner correspond au parcours Product Manager Augmenté." },
  { id: "role-ai-product", when: { role: "ai-product" }, score: { "ai-product-manager": 4 }, reason: "Votre rôle d'AI Product Manager correspond au parcours AI Product Manager." },
  { id: "role-consulting", when: { role: "consulting" }, score: { "product-manager-augmente": 2, "ai-product-manager": 1 }, reason: "Les consultants tirent profit d'une vision produit et d'une pratique outillée." },
  { id: "role-project", when: { role: "project" }, score: { "product-manager-augmente": 2 }, reason: "Les chefs de projet bénéficient des modules de delivery et d'adoption." },
  { id: "role-analyst", when: { role: "analyst" }, score: { "product-manager-augmente": 2 }, reason: "Les business analysts bénéficient des modules de découverte et de prompting." },
  { id: "role-transformation", when: { role: "transformation" }, score: { "ai-product-manager": 2, "product-manager-augmente": 1 }, reason: "La transformation digitale demande stratégie, gouvernance et adoption." },
  { id: "role-engineering", when: { role: "engineering" }, score: { "ai-product-manager": 3 }, reason: "Le parcours AI Product Manager couvre RAG, agents, sécurité et évaluation." },
  { id: "role-management", when: { role: "management" }, score: { "product-manager-augmente": 1, "ai-product-manager": 1 }, reason: "Les managers combinent usage de l'IA et conduite du changement." },
  { id: "obj-use", when: { objective: "use" }, score: { "product-manager-augmente": 3 }, reason: "Votre objectif d'usage quotidien privilégie prompts, contexte et outils de productivité." },
  { id: "obj-product", when: { objective: "product" }, score: { "ai-product-manager": 2, "product-manager-augmente": 1 }, reason: "Intégrer l'IA dans des produits demande stratégie, delivery et évaluation." },
  { id: "obj-build", when: { objective: "build" }, score: { "ai-product-manager": 3 }, reason: "Construire des systèmes IA passe par RAG, agents, sécurité et évaluation." },
  { id: "obj-lead", when: { objective: "lead" }, score: { "ai-product-manager": 2, "product-manager-augmente": 1 }, reason: "Conduire l'adoption demande gouvernance, économie et change management." },
  { id: "tech-high", when: { technical: "high" }, score: { "ai-product-manager": 1 }, reason: "Votre aisance technique permet d'aborder les modules d'ingénierie." },
  { id: "tech-low", when: { technical: "low" }, score: { "product-manager-augmente": 1 }, reason: "Le parcours Product Manager Augmenté limite les prérequis techniques." },
];

/** Thresholds for suggesting the complete bundle. */
export const masteryRules = {
  minPathScoreGap: 1, // paths scoring within this gap are considered ambivalent
  suggestWhenAmbivalent: true,
  suggestWhenBuilderAndHighTech: true,
};
