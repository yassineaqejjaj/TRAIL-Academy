import { describe, expect, it } from "vitest";
import { staticCatalog } from "@/lib/catalog";
import { nextModules } from "@/lib/catalog/next-steps";

describe("nextModules", () => {
  it("follows the order of the learner's path and skips what they hold", () => {
    const path = staticCatalog.learningPaths.find((p) => p.slug === "product-manager-augmente")!;
    const next = nextModules([path.courseCodes[0]], staticCatalog, 3).map((c) => c.code);
    expect(next).toHaveLength(3);
    expect(next).not.toContain(path.courseCodes[0]);
    expect(path.courseCodes.slice(1)).toEqual(expect.arrayContaining(next.filter((c) => path.courseCodes.includes(c))));
  });
  it("falls back to the earliest modules for a learner with no path context", () => {
    expect(nextModules([], staticCatalog, 2).map((c) => c.code)).toEqual(staticCatalog.courses.slice(0, 2).map((c) => c.code));
  });
  it("never suggests a module the learner already has", () => {
    const all = staticCatalog.courses.map((c) => c.code);
    expect(nextModules(all.slice(0, -1), staticCatalog, 5).map((c) => c.code)).toEqual(all.slice(-1));
    expect(nextModules(all, staticCatalog, 5)).toEqual([]);
  });
});
