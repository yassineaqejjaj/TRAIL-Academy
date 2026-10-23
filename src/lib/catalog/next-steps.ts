import { coursesOfPath, isPurchasable, type Catalog, type Course } from "./index";

/**
 * Honest "what next" suggestions after a purchase or a completed module: the modules that follow in the learner's
 * learning path (path order), skipping what they already hold. Nothing here is personalised by guesswork or invented
 * popularity: it follows the catalogue's own structure.
 */
export function nextModules(ownedCodes: string[], catalog: Catalog, limit = 3): Course[] {
  const owned = new Set(ownedCodes);
  const paths = catalog.learningPaths.filter((p) => p.kind === "path");
  const ranked = paths
    .map((p) => ({ p, held: p.courseCodes.filter((c) => owned.has(c)).length }))
    .filter((x) => x.held > 0)
    .sort((a, b) => b.held - a.held);
  const out: Course[] = [];
  for (const { p } of ranked) {
    for (const c of coursesOfPath(p, catalog)) if (!owned.has(c.code) && !out.some((o) => o.code === c.code)) out.push(c);
  }
  // A learner with no path context gets the earliest modules of the catalogue they do not hold yet.
  if (out.length === 0) for (const c of catalog.courses) if (!owned.has(c.code)) out.push(c);
  return out.slice(0, limit);
}

export const buyableFirst = (courses: Course[], catalog: Catalog): Course[] => [...courses].sort((a, b) => Number(isPurchasable(b, catalog)) - Number(isPurchasable(a, catalog)));
