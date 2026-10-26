import { coursesOfPath, getPath, type Catalog, type Course } from "@/lib/catalog";
import { recommend, type Recommendation } from "./engine";
import type { AdvisorInput, Experience, Familiarity, Objective, Role, Technical } from "./rules";

/**
 * "Describe your job and your goal" advisor. It reads the learner's free text and works out, with transparent rules and
 * text similarity against the catalogue (no generative model, no data leaving the browser):
 *   1. the profile signals (role, objective, familiarity, technical ease, time per week), each with the words that triggered it;
 *   2. which modules are closest to what was written (TF-IDF cosine similarity plus a small synonym table);
 *   3. a path, through the same engine as the questionnaire, then personalised with a "start here" module and extras.
 * Everything is explainable: every claim in the output points to words the person wrote or to the catalogue.
 */

const STOP = new Set("le la les un une des de du d l et ou a au aux en dans sur pour par avec sans que qui quoi je j me mon ma mes moi nous notre nos vous votre est suis sont etre ai avoir fait faire ce cet cette ces il elle on ne pas plus tres tout tous aussi comme mais donc car si se sa son ses y afin souhaite veux voudrais aimerais besoin cherche travaille actuellement depuis ans an chez".split(" "));

export const normalize = (s: string): string => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ").replace(/[^a-z0-9+#]+/g, " ").trim();

/** Light stemming: 5-character prefix for long words ("evaluation", "evaluer" → "evalu"). */
const stem = (w: string): string => (w.length > 6 ? w.slice(0, 5) : w.length === 6 ? w.slice(0, 5) : w);
const tokens = (s: string): string[] => normalize(s).split(" ").filter((w) => w.length > 1 && !STOP.has(w));

interface Signal<T extends string> { value: T; evidence: string[] }

function pick<T extends string>(text: string, table: Record<T, RegExp>): Signal<T> | null {
  let best: Signal<T> | null = null;
  for (const [value, re] of Object.entries(table) as [T, RegExp][]) {
    const hits = [...text.matchAll(new RegExp(re.source, "g"))].map((m) => m[0].trim());
    if (hits.length && (!best || hits.length > best.evidence.length)) best = { value, evidence: [...new Set(hits)] };
  }
  return best;
}

const ROLE_ORDER: [Role, RegExp][] = [
  ["ai-product", /\b(ai product|pm ia|product manager ia|product owner ia|chef de produit ia)\b/],
  ["legal", /\b(juriste\w*|juridique|avocat\w*|dpo|compliance|legal ops?|legal|conformite)\b/],
  ["hr", /\b(rh|ressources humaines|drh|recruteu\w*|recrutement|talent acquisition|hrbp|responsable formation|paie)\b/],
  ["finance", /\b(finance\w*|daf|controleu\w* de gestion|controle de gestion|comptab\w*|tresori\w*|auditeu\w*|audit|fp ?a|analyste financier)\b/],
  ["marketing", /\b(marketing|communication|community manager|content manager|seo|brand|responsable com\w*|chargee? de com\w*|social media|relations presse)\b/],
  ["engineering", /\b(developpeu\w*|dev|full ?stack|ingenieu\w*|data scientist|data engineer|devops|machine learning engineer|ml engineer|software engineer|architecte|tech lead|cto)\b/],
  ["analyst", /\b(business analyst|analyste (metier|fonctionnel)?|\bba\b|consultant fonctionnel)\b/],
  ["project", /\b(chef de projet|project manager|pmo|scrum master|delivery manager|responsable de projet)\b/],
  ["transformation", /\b(transformation|digitalisation|innovation|chief digital|cdo)\b/],
  ["consulting", /\b(consultant\w*|conseil|freelance|independant)\b/],
  ["product", /\b(product owner|product manager|chef de produit|\bpo\b|\bpm\b|product|produit|ux|ui|designer|design|ergonome)\b/],
  ["management", /\b(manager|directeur\w*|responsable|head of|team lead|dirigeant|ceo|dg)\b/],
];

const OBJECTIVES: Record<Objective, RegExp> = {
  use: /\b(au quotidien|productivite|gagner du temps|assistant\w*|chatgpt|copilot|claude|gemini|mistral|utiliser|prompt\w*|automatiser mes taches)\b/,
  product: /\b(mon produit|nos produits|fonctionnalite\w*|integrer|roadmap|discovery|backlog|mes utilisateurs|features?)\b/,
  build: /\b(construire|developper|creer|deployer|industrialiser|prototyp\w*|agents?|rag|chatbot|systeme\w*|application\w*|mettre en production|automatisation avancee)\b/,
  lead: /\b(equipes?|adoption|organisation|strategie|accompagner|gouvernance|former|culture|conduite du changement|direction|comite)\b/,
};

const FAMILIARITY: Record<Familiarity, RegExp> = {
  none: /\b(debut\w*|jamais|decouvr\w*|novice|aucune connaissance|zero|premiers pas|pas du tout)\b/,
  user: /\b(j utilise|utilise deja|chatgpt|copilot|claude|gemini|mistral|assistants?)\b/,
  builder: /\b(deja construit|j ai (construit|developpe|deploye|cree)|en production|mon propre (agent|chatbot|rag)|j ai mis en place)\b/,
};

const TECHNICAL: Record<Technical, RegExp> = {
  low: /\b(pas technique|non technique|peu a l aise|pas developpeur|no ?code|sans coder|pas de code)\b/,
  high: /\b(python|api|code|coder|developpeu\w*|ingenieu\w*|devops|data scientist|sql|typescript|javascript|full ?stack|architecture)\b/,
  medium: /\b(a l aise|notions techniques)\b/,
};

/** Topics people name in their own words, mapped to the modules that cover them (boost on top of the text similarity). */
const SYNONYMS: [RegExp, string[], number][] = [
  [/\b(rag|base de connaissances?|documents? internes?|recherche semantique|embeddings?|vectoriel\w*)\b/, ["M11"], 0.5],
  [/\b(agents?|agentique|multi ?agents?|orchestrat\w+|workflows?)\b/, ["M12"], 0.5],
  [/\b(securite|securiser|injection|fuite de donnees|owasp|attaques?)\b/, ["M13"], 0.5],
  [/\b(prompts?|prompting|consignes?)\b/, ["M4"], 0.45],
  [/\b(contexte|context engineering|memoire|fenetre de contexte)\b/, ["M5"], 0.4],
  [/\b(no ?code|low ?code|vibe|prototyp\w+|maquette|mvp)\b/, ["M6"], 0.45],
  [/\b(bmad|methode agile ia|agile ia)\b/, ["M7"], 0.5],
  [/\b(strategie|roadmap|business model|positionnement|avantage concurrentiel)\b/, ["M8"], 0.4],
  [/\b(delivery|mise en production|livrer|releases?|deploiement|cycle de vie)\b/, ["M9"], 0.4],
  [/\b(ethique|responsable|biais|rgpd|ai act|conformite|reglementation|gouvernance|transparence)\b/, ["M10"], 0.5],
  [/\b(cout|couts|budget|finops|rentabilite|roi|tokens?|facture)\b/, ["M15"], 0.5],
  [/\b(adoption|conduite du changement|resistance|formation des equipes|acculturation)\b/, ["M16"], 0.5],
  [/\b(evaluation|evaluer|qualite|monitoring|observabilite|metriques?|tests? de prompts?)\b/, ["M17"], 0.5],
  [/\b(ux|experience utilisateur|interface|design|ergonomie|interaction)\b/, ["M14"], 0.5],
  [/\b(contenus?|editorial|redaction|brand voice|ton de marque|reseaux sociaux|newsletter)\b/, ["M19"], 0.5],
  [/\b(seo|geo|referencement|acquisition|campagnes?|a b test|ab test|personnalisation)\b/, ["M20"], 0.5],
  [/\b(reputation|veille|crise|communication de crise|deepfakes?|e reputation)\b/, ["M21"], 0.5],
  [/\b(recrutement|sourcing|candidats?|offres? d emploi|marque employeur|presselection)\b/, ["M22"], 0.5],
  [/\b(competences|onboarding|integration|plan de formation|parcours de formation|developpement des talents)\b/, ["M23"], 0.5],
  [/\b(people analytics|dialogue social|cse|donnees rh|assistant rh|paie|conges)\b/, ["M24"], 0.5],
  [/\b(recherche juridique|jurisprudence|veille reglementaire|notes? juridiques?|doctrine)\b/, ["M25"], 0.5],
  [/\b(contrats?|clauses?|due diligence|playbook|revue de contrats?|legal ops?)\b/, ["M26"], 0.5],
  [/\b(ai act|droit de l ia|propriete intellectuelle|droit d auteur|responsabilite)\b/, ["M27"], 0.45],
  [/\b(reporting|controle de gestion|fp ?a|budget|ecarts?|previsions?|scenarios?|tableaux? de bord)\b/, ["M28"], 0.5],
  [/\b(comptabilite|tresorerie|factures?|rapprochements?|audit|anomalies)\b/, ["M29"], 0.5],
  [/\b(risque de modele|fraude|lcb|explicabilite|scoring|gouvernance financiere)\b/, ["M30"], 0.5],
  [/\b(discovery|entretiens utilisateurs|besoins utilisateurs|recherche utilisateur)\b/, ["M18"], 0.5],
  [/\b(machine learning|ml|modele predictif|donnees|data science|classification)\b/, ["M1"], 0.35],
  [/\b(deep learning|reseaux? de neurones|vision|images?|nlp)\b/, ["M2"], 0.4],
  [/\b(llm|ia generative|genai|modeles? de langage|chatgpt|gpt|choisir un modele)\b/, ["M3"], 0.4],
];

export interface DetectedProfile {
  role: Signal<Role> | null; objective: Signal<Objective> | null; familiarity: Signal<Familiarity> | null; technical: Signal<Technical> | null;
  hoursPerWeek: number | null;
}
export interface ModuleMatch { course: Course; score: number; matched: string[] }
export interface TextRecommendation {
  detected: DetectedProfile;
  input: AdvisorInput;
  base: Recommendation;
  matches: ModuleMatch[];
  startWith: Course | null;
  extras: ModuleMatch[];
  reasons: string[];
  missing: string[];
  enough: boolean;
}

/** Shows the evidence in the person's own spelling ("débute", not "debute"). */
function restore<T extends string>(signal: Signal<T> | null, raw: string): Signal<T> | null {
  if (!signal) return signal;
  const originals = new Map<string, string>();
  for (const w of raw.split(/[\s,.;:!?()«»"]+/)) { const n = normalize(w); if (n && !originals.has(n)) originals.set(n, w.replace(/^[’']+|[’']+$/g, "")); }
  return { ...signal, evidence: signal.evidence.map((e) => e.split(" ").map((w) => originals.get(w) ?? w).join(" ")) };
}

export function detectProfile(raw: string): DetectedProfile {
  const t = ` ${normalize(raw)} `;
  let role: Signal<Role> | null = null;
  for (const [value, re] of ROLE_ORDER) {
    const hits = [...t.matchAll(new RegExp(re.source, "g"))].map((m) => m[0].trim()).filter(Boolean);
    if (hits.length) { role = { value, evidence: [...new Set(hits)] }; break; }
  }
  const hours = /(\d{1,2})\s*(?:h|heures?)\s*(?:par|\/|a la|chaque)?\s*semaine/.exec(t);
  return { role: restore(role, raw), objective: restore(pick(t, OBJECTIVES), raw), familiarity: restore(pick(t, FAMILIARITY), raw), technical: restore(pick(t, TECHNICAL), raw), hoursPerWeek: hours ? Math.min(40, Math.max(1, Number(hours[1]))) : null };
}

function courseDoc(c: Course): string { return [c.title, c.title, c.summary, ...c.topics, ...c.topics, ...c.outcomes, c.deliverable, ...c.tools].join(" "); }

export function rankModules(raw: string, catalog: Catalog): ModuleMatch[] {
  const query = tokens(raw).map(stem);
  const docs = catalog.courses.map((c) => ({ c, terms: tokens(courseDoc(c)).map(stem) }));
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d.terms)) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = (t: string) => Math.log(1 + docs.length / (1 + (df.get(t) ?? 0)));
  const vec = (terms: string[]) => { const m = new Map<string, number>(); for (const t of terms) m.set(t, (m.get(t) ?? 0) + 1); for (const [t, n] of m) m.set(t, (1 + Math.log(n)) * idf(t)); return m; };
  const norm = (m: Map<string, number>) => Math.sqrt([...m.values()].reduce((s, x) => s + x * x, 0)) || 1;
  const q = vec(query), qn = norm(q);
  const originals = new Map<string, string>();
  for (const w of tokens(raw)) originals.set(stem(w), w);
  const text = ` ${normalize(raw)} `;
  return docs.map(({ c, terms }) => {
    const d = vec(terms), dn = norm(d);
    let dot = 0; const matched: string[] = [];
    for (const [t, w] of q) { const x = d.get(t); if (x) { dot += w * x; matched.push(originals.get(t) ?? t); } }
    let score = dot / (qn * dn);
    for (const [re, codes, boost] of SYNONYMS) if (codes.includes(c.code) && re.test(text)) { score += boost; const m = re.exec(text)?.[0].trim(); if (m && !matched.includes(m)) matched.push(m); }
    return { course: c, score, matched: [...new Set(matched)].slice(0, 4) };
  }).sort((a, b) => b.score - a.score || a.course.code.localeCompare(b.course.code, "en", { numeric: true }));
}

const ROLE_LABEL: Partial<Record<Role, string>> = { marketing: "marketing et communication", hr: "ressources humaines", legal: "juridique et conformité", finance: "finance et contrôle", product: "product / UX", "ai-product": "AI Product Manager", consulting: "conseil", project: "gestion de projet", analyst: "analyse métier", transformation: "transformation", engineering: "ingénierie / data", management: "management" };

/** Needs at least a few meaningful words; otherwise the caller should ask for more. */
export function recommendFromText(raw: string, catalog: Catalog): TextRecommendation {
  const detected = detectProfile(raw);
  const meaningful = tokens(raw).length;
  const input: AdvisorInput = {
    role: detected.role?.value ?? "other",
    objective: detected.objective?.value ?? "use",
    familiarity: detected.familiarity?.value ?? "user",
    technical: detected.technical?.value ?? (detected.role?.value === "engineering" ? "high" : "medium"),
    experience: "mid" as Experience,
    hoursPerWeek: detected.hoursPerWeek ?? 3,
  };
  const base = recommend(input, catalog);
  const matches = rankModules(raw, catalog);
  const path = getPath(base.pathSlug, catalog)!;
  const inPath = new Set(coursesOfPath(path, catalog).map((c) => c.code));
  const relevant = matches.filter((m) => m.score >= 0.2);
  const startMatch = relevant.find((m) => inPath.has(m.course.code));
  const startWith = input.familiarity === "none" ? (base.courses.find((c) => c.code === "M3") ?? base.courses[0] ?? null) : (startMatch?.course ?? base.courses[0] ?? null);
  const extras = relevant.filter((m) => !inPath.has(m.course.code)).slice(0, 2);

  const reasons: string[] = [];
  if (detected.role) reasons.push(`Vous évoquez « ${detected.role.evidence.slice(0, 2).join(" », « ")} » : je rapproche votre profil du domaine ${ROLE_LABEL[detected.role.value] ?? "professionnel"}.`);
  if (detected.objective) reasons.push(`Votre objectif ressemble à « ${detected.objective.evidence.slice(0, 2).join(" », « ")} ».`);
  for (const m of relevant.slice(0, 3)) reasons.push(`${m.course.code} · ${m.course.title} correspond à ce que vous décrivez${m.matched.length ? ` (« ${m.matched.slice(0, 3).join(" », « ")} »)` : ""}.`);
  reasons.push(...base.reasons.slice(0, 3));

  const missing: string[] = [];
  if (!detected.role) missing.push("votre métier (par exemple Product Owner, UX designer, développeur full stack, consultant)");
  if (!detected.objective && relevant.length === 0) missing.push("ce que vous voulez accomplir avec l'IA");
  if (detected.hoursPerWeek == null) missing.push("le temps disponible par semaine (sinon j'estime 3 h)");
  return { detected, input, base, matches, startWith, extras, reasons, missing, enough: meaningful >= 4 && (detected.role != null || relevant.length > 0) };
}
