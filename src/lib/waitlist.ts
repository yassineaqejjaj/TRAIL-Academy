import type { Catalog } from "@/lib/catalog";

/** What a visitor can ask to be told about. Built from the catalogue so it never drifts from it. */
export function waitlistOptions(catalog: Catalog): { slug: string; label: string; group: string }[] {
  return [
    ...catalog.learningPaths.map((p) => ({ slug: p.slug, label: p.title, group: p.kind === "bundle" ? "Accès complet" : "Parcours" })),
    ...catalog.courses.map((c) => ({ slug: c.slug, label: `${c.code} · ${c.title}`, group: "Modules" })),
  ];
}

/** Honest availability summary for banners and the home page. */
export function availabilitySummary(catalog: Catalog) {
  const total = catalog.courses.length;
  const buyable = catalog.openCourses.length;
  const preview = catalog.courses.filter((c) => c.status === "published").length - buyable;
  const preparing = total - buyable - preview;
  return { total, buyable, preview, preparing };
}
