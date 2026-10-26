import { coursesOfPath, getPath, staticCatalog, totalHours, type Catalog, type Course } from "@/lib/catalog";
import { masteryRules, rules, type AdvisorInput } from "./rules";

export interface Recommendation {
  pathSlug: string;
  pathTitle: string;
  courses: Course[];
  totalHours: number;
  weeks: number;
  reasons: string[];
  skills: string[];
  alternative?: { pathSlug: string; pathTitle: string };
}

const PATHS = ["product-manager-augmente", "ai-product-manager", "marketing-communication-augmentee", "rh-augmentees", "juridique-augmente", "finance-augmentee"] as const;

export function recommend(input: AdvisorInput, catalog: Catalog = staticCatalog): Recommendation {
  const scores: Record<string, number> = Object.fromEntries(PATHS.map((s) => [s, 0]));
  const reasons: string[] = [];

  for (const rule of rules) {
    const matches = Object.entries(rule.when).every(([k, v]) => input[k as keyof AdvisorInput] === v);
    if (!matches) continue;
    for (const [slug, pts] of Object.entries(rule.score)) scores[slug] = (scores[slug] ?? 0) + pts;
    reasons.push(rule.reason);
  }

  // Deterministic tie-break: Product Manager Augmenté is the more accessible path.
  const sorted = [...PATHS].sort((a, b) => scores[b] - scores[a] || PATHS.indexOf(a) - PATHS.indexOf(b));
  const [top, second] = sorted;
  const gap = scores[top] - scores[second];

  let slug: string = top;
  if (
    (masteryRules.suggestWhenAmbivalent && gap <= masteryRules.minPathScoreGap && scores[top] > 0 && input.hoursPerWeek >= 6) ||
    (masteryRules.suggestWhenBuilderAndHighTech && input.familiarity === "builder" && input.technical === "high" && input.objective === "build")
  ) {
    slug = "ai-mastery";
    reasons.push("Vos réponses couvrent plusieurs parcours : l'accès complet AI Mastery évite de payer deux fois le contenu commun.");
  }

  const path = getPath(slug, catalog)!;
  let list = coursesOfPath(path, catalog);
  // Beginners with no prior AI familiarity start with foundations: ensure M3 comes first.
  if (input.familiarity === "none") reasons.push("Vous débutez : la séquence commence par les fondations (IA générative).");
  if (input.familiarity === "builder") {
    list = list.filter((c) => c.code !== "M3" || path.kind === "bundle");
    reasons.push("Vous avez déjà construit avec l'IA : le module d'introduction à l'IA générative est optionnel.");
  }

  const hours = totalHours(list);
  const weeks = Math.max(1, Math.ceil(hours / Math.max(1, input.hoursPerWeek)));
  const skills = Array.from(new Set(list.flatMap((c) => c.outcomes.slice(0, 1))));

  return {
    pathSlug: path.slug,
    pathTitle: path.title,
    courses: list,
    totalHours: hours,
    weeks,
    reasons,
    skills,
    alternative: slug === "ai-mastery" ? undefined : { pathSlug: second, pathTitle: getPath(second, catalog)!.title },
  };
}
