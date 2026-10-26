import { describe, expect, it } from "vitest";
import { courses, filterCourses, getPath, coursesOfPath, isPurchasable, learningPaths, offers, phases, staticCatalog } from "@/lib/catalog";

describe("catalog integrity", () => {
  it("has 30 unique modules in 5 phases (18 core + 12 profession modules)", () => {
    expect(courses).toHaveLength(30);
    expect(new Set(courses.map((c) => c.code)).size).toBe(30);
    expect(new Set(courses.map((c) => c.slug)).size).toBe(30);
    expect(phases).toHaveLength(5);
    expect(courses.filter((c) => c.phaseId === 5)).toHaveLength(12);
    for (const c of courses) expect(phases.some((p) => p.id === c.phaseId)).toBe(true);
  });
  it("has unique, contiguous recommended order", () => {
    expect(courses.map((c) => c.order).sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });
  it("keeps prerequisites valid and before the course in order", () => {
    for (const c of courses)
      for (const code of c.prerequisites) {
        const pre = courses.find((x) => x.code === code);
        expect(pre, `${c.code} -> ${code}`).toBeDefined();
        expect(pre!.order).toBeLessThan(c.order);
      }
  });
  it("defines paths per specification", () => {
    expect(getPath("product-manager-augmente")!.courseCodes).toEqual(["M3", "M4", "M5", "M6", "M7", "M9", "M14", "M16", "M18"]);
    expect(getPath("ai-product-manager")!.courseCodes).toHaveLength(13);
    expect(coursesOfPath(getPath("ai-mastery")!)).toHaveLength(30);
    for (const slug of ["marketing-communication-augmentee", "rh-augmentees", "juridique-augmente", "finance-augmentee"]) {
      const codes = getPath(slug)!.courseCodes;
      expect(codes).toHaveLength(8);
      expect(codes.filter((c) => courses.find((x) => x.code === c)!.phaseId === 5)).toHaveLength(3); // three profession modules each
    }
    for (const p of learningPaths) for (const code of p.courseCodes) expect(courses.some((c) => c.code === code)).toBe(true);
  });
  it("offers three kinds of public prices: module, parcours, AI Mastery", () => {
    const price = (slug: string) => offers.find((o) => o.slug === slug)!.amountCents;
    expect(price("module")).toBe(19900);
    expect(price("product-manager-augmente")).toBe(99000);
    expect(price("ai-product-manager")).toBe(99000);
    for (const slug of ["marketing-communication-augmentee", "rh-augmentees", "juridique-augmente", "finance-augmentee"]) expect(price(slug)).toBe(99000);
    expect(price("ai-mastery")).toBe(199000);
    expect(offers.every((o) => o.taxMode === "ttc")).toBe(true);
    expect(offers.map((o) => o.kind).sort()).toEqual(["bundle", "course", "path", "path", "path", "path", "path", "path"]);
  });
  it("prices every module at the same 199 € rate", () => {
    expect(Object.values(staticCatalog.coursePrices)).toHaveLength(30);
    expect(new Set(Object.values(staticCatalog.coursePrices))).toEqual(new Set([19900]));
  });
  it("does not allow purchase of unpublished courses", () => {
    expect(courses.filter((c) => isPurchasable(c))).toHaveLength(0);
    expect(courses.filter((c) => c.mvpSlot).map((c) => c.code).sort()).toEqual(["M4", "M5", "M6"]);
  });
  it("filters", () => {
    expect(filterCourses({ q: "rag" }).map((c) => c.code)).toContain("M11");
    expect(filterCourses({ path: "product-manager-augmente" })).toHaveLength(9);
    expect(filterCourses({ difficulty: "beginner" }).every((c) => c.difficulty === "beginner")).toBe(true);
    expect(filterCourses({ path: "unknown" })).toHaveLength(0);
  });
});
