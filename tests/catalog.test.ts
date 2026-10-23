import { describe, expect, it } from "vitest";
import { courses, filterCourses, getPath, coursesOfPath, isPurchasable, learningPaths, offers, phases, staticCatalog } from "@/lib/catalog";

describe("catalog integrity", () => {
  it("has 18 unique modules in 4 phases", () => {
    expect(courses).toHaveLength(18);
    expect(new Set(courses.map((c) => c.code)).size).toBe(18);
    expect(new Set(courses.map((c) => c.slug)).size).toBe(18);
    expect(phases).toHaveLength(4);
    for (const c of courses) expect(phases.some((p) => p.id === c.phaseId)).toBe(true);
  });
  it("has unique, contiguous recommended order", () => {
    expect(courses.map((c) => c.order).sort((a, b) => a - b)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
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
    expect(coursesOfPath(getPath("ai-mastery")!)).toHaveLength(18);
    for (const p of learningPaths) for (const code of p.courseCodes) expect(courses.some((c) => c.code === code)).toBe(true);
  });
  it("lists prices per the TRAIL price grid", () => {
    const price = (slug: string) => offers.find((o) => o.slug === slug)!.amountCents;
    expect(price("module-standard")).toBe(19900);
    expect(price("module-avance")).toBe(29900);
    expect(price("product-manager-augmente")).toBe(99000);
    expect(price("ai-product-manager")).toBe(149000);
    expect(price("ai-mastery")).toBe(199000);
    expect(price("ai-mastery-mentored")).toBe(299000);
    expect(price("team-5")).toBe(750000);
    expect(price("team-20")).toBe(2400000);
    expect(price("private-workshop")).toBe(250000);
    expect(price("enterprise-custom")).toBeNull();
  });
  it("prices only Vibe Coding, RAG, Agentic AI and AI Evaluation at the Avancé rate", () => {
    const advanced = Object.entries(staticCatalog.coursePrices).filter(([, cents]) => cents === 29900).map(([slug]) => courses.find((c) => c.slug === slug)!.code).sort();
    expect(advanced).toEqual(["M11", "M12", "M17", "M6"]);
    expect(Object.values(staticCatalog.coursePrices).filter((c) => c === 19900)).toHaveLength(14);
  });
  it("describes enterprise offers as specified", () => {
    const o = (slug: string) => offers.find((x) => x.slug === slug)!;
    expect(o("team-5")).toMatchObject({ taxMode: "ht", accessMonths: 12 });
    expect(o("team-20")).toMatchObject({ taxMode: "ht", accessMonths: 12 });
    expect(o("private-workshop")).toMatchObject({ priceFrom: true, taxMode: "ht" });
  });
  it("does not allow purchase of unpublished courses", () => {
    expect(courses.filter(isPurchasable)).toHaveLength(0);
    expect(courses.filter((c) => c.mvpSlot).map((c) => c.code).sort()).toEqual(["M4", "M5", "M6"]);
  });
  it("filters", () => {
    expect(filterCourses({ q: "rag" }).map((c) => c.code)).toContain("M11");
    expect(filterCourses({ path: "product-manager-augmente" })).toHaveLength(9);
    expect(filterCourses({ difficulty: "beginner" }).every((c) => c.difficulty === "beginner")).toBe(true);
    expect(filterCourses({ path: "unknown" })).toHaveLength(0);
  });
});
