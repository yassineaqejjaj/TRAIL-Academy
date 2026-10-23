import { courses, learningPaths, offers, phases } from "./data";
import type { Catalog, Course, Difficulty, LearningPath } from "./types";

export * from "./types";
export { courses, learningPaths, offers, phases };

/** Seed data: used when no database is configured, and as a fallback if it cannot be read. */
export const staticCatalog: Catalog = {
  phases,
  courses,
  learningPaths,
  offers,
  openCourses: [],
  coursePrices: Object.fromEntries(courses.map((c) => [c.slug, offers.find((o) => o.slug === "module")!.amountCents!])),
};

export const getCourse = (slug: string, c: Catalog = staticCatalog): Course | undefined => c.courses.find((x) => x.slug === slug);
export const getCourseByCode = (code: string, c: Catalog = staticCatalog): Course | undefined => c.courses.find((x) => x.code === code);
export const getPath = (slug: string, c: Catalog = staticCatalog): LearningPath | undefined => c.learningPaths.find((p) => p.slug === slug);

export const coursesOfPath = (path: LearningPath, c: Catalog = staticCatalog): Course[] =>
  path.courseCodes.map((code) => getCourseByCode(code, c)).filter((x): x is Course => Boolean(x)).sort((a, b) => a.order - b.order);

export const pathsOfCourse = (course: Course, c: Catalog = staticCatalog): LearningPath[] =>
  c.learningPaths.filter((p) => p.courseCodes.includes(course.code));

/** A module is on sale only when its content is published AND its offer was explicitly opened (the database enforces both). */
export const isPurchasable = (course: Course, c: Catalog = staticCatalog): boolean => course.status === "published" && c.openCourses.includes(course.slug);

export const isPathPurchasable = (path: LearningPath, c: Catalog = staticCatalog): boolean => {
  const list = coursesOfPath(path, c);
  return list.length > 0 && list.every((x) => x.status === "published") && c.offers.find((o) => o.slug === path.slug)?.active === true;
};

export const totalHours = (list: Course[]): number => list.reduce((sum, x) => sum + x.durationHours, 0);

export const formatEuro = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);

export const difficultyLabel: Record<Difficulty, string> = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };
export const statusLabel: Record<Course["status"], string> = { draft: "Brouillon", coming_soon: "Bientôt disponible", published: "Disponible", archived: "Archivé" };

export interface CatalogFilters {
  q?: string;
  difficulty?: Difficulty;
  phase?: number;
  path?: string;
  status?: Course["status"];
  maxHours?: number;
}

export function filterCourses(filters: CatalogFilters, c: Catalog = staticCatalog): Course[] {
  const q = filters.q?.trim().toLowerCase();
  const path = filters.path ? getPath(filters.path, c) : undefined;
  return c.courses
    .filter((x) => x.status !== "archived")
    .filter((x) => !q || [x.title, x.summary, x.code, ...x.topics].some((t) => t.toLowerCase().includes(q)))
    .filter((x) => !filters.difficulty || x.difficulty === filters.difficulty)
    .filter((x) => !filters.phase || x.phaseId === filters.phase)
    .filter((x) => !filters.path || (path ? path.courseCodes.includes(x.code) : false))
    .filter((x) => !filters.status || x.status === filters.status)
    .filter((x) => !filters.maxHours || x.durationHours <= filters.maxHours)
    .sort((a, b) => a.order - b.order);
}
