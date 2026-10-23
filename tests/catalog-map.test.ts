import { describe, expect, it } from "vitest";
import { filterCourses, isPathPurchasable, isPurchasable, staticCatalog } from "@/lib/catalog";
import { mapCatalog, type CatalogRows } from "@/lib/catalog/map";

const rows: CatalogRows = {
  phases: [{ id: 2, slug: "b", title: "B", summary: "" }, { id: 1, slug: "a", title: "A", summary: "" }],
  courses: [
    { id: "c2", code: "M2", slug: "deux", title: "Deux", summary: "s", phase_id: 1, position: 2, status: "published", difficulty: "advanced", duration_hours: "6.5", topics: ["t"], tools: [], outcomes: ["o"], deliverable: null, is_mvp_slot: false },
    { id: "c1", code: "M1", slug: "un", title: "Un", summary: "s", phase_id: 1, position: 1, status: "published", difficulty: "beginner", duration_hours: 6, topics: [], tools: [], outcomes: [], deliverable: "D", is_mvp_slot: true },
    { id: "c3", code: "M3", slug: "trois", title: "Trois", summary: "s", phase_id: 2, position: 3, status: "coming_soon", difficulty: "beginner", duration_hours: 5, topics: [], tools: [], outcomes: [], deliverable: "D", is_mvp_slot: false },
  ],
  prerequisites: [{ course_id: "c2", prerequisite_id: "c1" }],
  paths: [{ id: "p1", slug: "parcours", title: "P", tagline: null, audience: null, is_bundle: false, access_months: 18 }, { id: "p2", slug: "tout", title: "T", tagline: "x", audience: "y", is_bundle: true, access_months: 18 }],
  pathCourses: [{ path_id: "p1", course_id: "c2", position: 2 }, { path_id: "p1", course_id: "c1", position: 1 }, { path_id: "p2", course_id: "c3", position: 1 }],
  products: [
    { slug: "module-un", kind: "course", title: "M1", active: true, access_months: 12, seats: null, course_id: "c1", prices: [{ amount_cents: 9900, tax_inclusive: true, active: false }, { amount_cents: 12900, tax_inclusive: true, active: true }] },
    { slug: "module-deux", kind: "course", title: "M2", active: true, access_months: 12, seats: null, course_id: "c2", prices: [{ amount_cents: 15900, tax_inclusive: true, active: true }] },
    { slug: "parcours", kind: "path", title: "P", active: true, access_months: 18, seats: null, course_id: null, prices: [{ amount_cents: 30000, tax_inclusive: true, active: true }] },
    { slug: "team-5", kind: "enterprise_pack", title: "Team 5", active: false, access_months: 12, seats: 5, course_id: null, prices: [{ amount_cents: 349000, tax_inclusive: false, active: true }] },
    { slug: "sur-mesure", kind: "enterprise_pack", title: "Sur mesure", active: false, access_months: null, seats: null, course_id: null, prices: [{ amount_cents: null, tax_inclusive: false, active: true }] },
  ],
};

describe("mapCatalog", () => {
  const c = mapCatalog(rows);
  it("orders phases and courses, converts numerics, resolves prerequisite codes", () => {
    expect(c.phases.map((p) => p.id)).toEqual([1, 2]);
    expect(c.courses.map((x) => x.code)).toEqual(["M1", "M2", "M3"]);
    expect(c.courses[1]).toMatchObject({ durationHours: 6.5, prerequisites: ["M1"], deliverable: "" });
  });
  it("orders path courses by position and detects bundles", () => {
    expect(c.learningPaths[0].courseCodes).toEqual(["M1", "M2"]);
    expect(c.learningPaths[1].kind).toBe("bundle");
  });
  it("uses only the active price, and derives the module price from the cheapest course product", () => {
    expect(c.coursePrices).toEqual({ un: 12900, deux: 15900 });
    expect(c.offers.find((o) => o.slug === "module")).toMatchObject({ amountCents: 12900, priceFrom: true });
  });
  it("maps enterprise packs with HT pricing, seats and quotations", () => {
    expect(c.offers.find((o) => o.slug === "team-5")).toMatchObject({ kind: "enterprise", amountCents: 349000, taxMode: "ht", note: "5 licences" });
    expect(c.offers.find((o) => o.slug === "sur-mesure")!.amountCents).toBeNull();
    expect(c.offers.some((o) => o.slug === "module-un")).toBe(false);
  });
  it("marks a course as open only when published, its offer is active and priced", () => {
    expect(c.openCourses.sort()).toEqual(["deux", "un"]);
    const closed = mapCatalog({ ...rows, products: rows.products.map((p) => (p.slug === "module-un" ? { ...p, active: false } : p)) });
    expect(closed.openCourses).toEqual(["deux"]);
    const unpublished = mapCatalog({ ...rows, courses: rows.courses.map((x) => (x.id === "c2" ? { ...x, status: "coming_soon" as const } : x)) });
    expect(unpublished.openCourses).toEqual(["un"]);
    expect(isPathPurchasable(closed.learningPaths[0], closed)).toBe(true); // the path offer itself is active
    const pathClosed = mapCatalog({ ...rows, products: rows.products.map((p) => (p.slug === "parcours" ? { ...p, active: false } : p)) });
    expect(isPathPurchasable(pathClosed.learningPaths[0], pathClosed)).toBe(false);
  });
  it("drives purchasability and filters from the data it is given", () => {
    expect(isPathPurchasable(c.learningPaths[0], c)).toBe(true);
    expect(isPurchasable(c.courses[0], c)).toBe(true);
    expect(isPurchasable(c.courses[2], c)).toBe(false); // coming soon
    expect(isPathPurchasable(c.learningPaths[1], c)).toBe(false);
    expect(filterCourses({ status: "published" }, c).map((x) => x.code)).toEqual(["M1", "M2"]);
    expect(filterCourses({ path: "parcours" }, c)).toHaveLength(2);
  });
  it("hides archived courses from the catalog", () => {
    const archived = mapCatalog({ ...rows, courses: rows.courses.map((x) => (x.id === "c3" ? { ...x, status: "archived" as const } : x)) });
    expect(filterCourses({}, archived).map((x) => x.code)).toEqual(["M1", "M2"]);
  });
  it("static catalog behaves as before", () => {
    expect(isPathPurchasable(staticCatalog.learningPaths[0])).toBe(false);
  });
});
