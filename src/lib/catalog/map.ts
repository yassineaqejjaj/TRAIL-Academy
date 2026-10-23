import type { Catalog, Course, LearningPath, Offer, Phase } from "./types";

export interface CatalogRows {
  phases: { id: number; slug: string; title: string; summary: string }[];
  courses: { id: string; code: string; slug: string; title: string; summary: string; phase_id: number; position: number; status: Course["status"]; difficulty: Course["difficulty"]; duration_hours: number | string; topics: string[]; tools: string[]; outcomes: string[]; deliverable: string | null; is_mvp_slot: boolean }[];
  prerequisites: { course_id: string; prerequisite_id: string }[];
  paths: { id: string; slug: string; title: string; tagline: string | null; audience: string | null; is_bundle: boolean; access_months: number }[];
  pathCourses: { path_id: string; course_id: string; position: number }[];
  products: { slug: string; kind: "course" | "path" | "bundle" | "enterprise_pack"; title: string; active: boolean; access_months: number | null; seats: number | null; course_id: string | null; prices: { amount_cents: number | null; tax_inclusive: boolean; active: boolean }[] }[];
}

const kindMap = { course: "course", path: "path", bundle: "bundle", enterprise_pack: "enterprise" } as const;

/** Pure mapping from database rows to the public catalog model (unit-tested). */
export function mapCatalog(rows: CatalogRows): Catalog {
  const codeById = new Map(rows.courses.map((c) => [c.id, c.code]));
  const slugById = new Map(rows.courses.map((c) => [c.id, c.slug]));

  const phases: Phase[] = rows.phases.map((p) => ({ id: p.id, slug: p.slug, title: p.title, summary: p.summary })).sort((a, b) => a.id - b.id);
  const courses: Course[] = rows.courses.map((c) => ({
    id: c.id, code: c.code, slug: c.slug, title: c.title, summary: c.summary, phaseId: c.phase_id, order: c.position, status: c.status,
    difficulty: c.difficulty, durationHours: Number(c.duration_hours), topics: c.topics, tools: c.tools, outcomes: c.outcomes,
    deliverable: c.deliverable ?? "", mvpSlot: c.is_mvp_slot,
    prerequisites: rows.prerequisites.filter((p) => p.course_id === c.id).map((p) => codeById.get(p.prerequisite_id)).filter((x): x is string => Boolean(x)),
  })).sort((a, b) => a.order - b.order);

  const learningPaths: LearningPath[] = rows.paths.map((p) => ({
    slug: p.slug, title: p.title, tagline: p.tagline ?? "", audience: p.audience ?? "", kind: p.is_bundle ? "bundle" : "path", accessMonths: p.access_months,
    courseCodes: rows.pathCourses.filter((pc) => pc.path_id === p.id).sort((a, b) => a.position - b.position).map((pc) => codeById.get(pc.course_id)).filter((x): x is string => Boolean(x)),
  }));

  const activePrice = (p: CatalogRows["products"][number]) => p.prices.find((x) => x.active);
  const coursePrices: Record<string, number> = {};
  for (const p of rows.products) {
    if (p.kind !== "course" || !p.course_id) continue;
    const price = activePrice(p);
    const slug = slugById.get(p.course_id);
    if (slug && price?.amount_cents != null) coursePrices[slug] = price.amount_cents;
  }

  const offers: Offer[] = [];
  const modulePrices = Object.values(coursePrices);
  if (modulePrices.length) offers.push({ slug: "module-individuel", kind: "course", title: "Module individuel", amountCents: Math.min(...modulePrices), taxMode: "ttc", accessMonths: 12 });
  for (const p of rows.products) {
    if (p.kind === "course") continue;
    const price = activePrice(p);
    offers.push({
      slug: p.slug, kind: kindMap[p.kind], title: p.title, amountCents: price?.amount_cents ?? null, taxMode: price?.tax_inclusive === false ? "ht" : "ttc",
      accessMonths: p.access_months, note: p.seats ? `${p.seats} licences` : undefined,
    });
  }
  return { phases, courses, learningPaths, offers, coursePrices };
}
