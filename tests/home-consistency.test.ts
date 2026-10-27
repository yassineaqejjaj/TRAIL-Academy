import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { availability, staticCatalog } from "@/lib/catalog";
import { availabilitySummary, waitlistOptions } from "@/lib/waitlist";

describe("consistency of catalogue figures", () => {
  it("no page hard-codes a module, phase or path count that can drift", () => {
    for (const f of ["src/app/page.tsx", "src/app/formations/page.tsx", "src/app/parcours/page.tsx", "src/app/tarifs/page.tsx", "src/components/offers.tsx"]) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/\b(18|30) modules\b(?!.*\$\{)/);
      expect(text, f).not.toMatch(/Quatre phases|Deux parcours|deux parcours|4 phases/);
    }
  });
  it("counts quoted in static copy match the catalogue", () => {
    const modules = staticCatalog.courses.length, paths = staticCatalog.learningPaths.filter((x) => x.kind === "path").length;
    const faq = readFileSync("src/lib/faq-data.ts", "utf8") + readFileSync("src/lib/seo.ts", "utf8");
    for (const m of faq.matchAll(/(\d+) modules/g)) expect(Number(m[1]), m[0]).toBe(modules);
    for (const m of faq.matchAll(/(\d+) parcours/g)) expect(Number(m[1]), m[0]).toBe(paths);
  });
  it("the availability summary adds up and never calls an unopened module buyable", () => {
    const s = availabilitySummary(staticCatalog);
    expect(s.buyable + s.preview + s.preparing).toBe(s.total);
    expect(s.buyable).toBe(0);
    for (const c of staticCatalog.courses) expect(availability(c, staticCatalog).state).not.toBe("buy");
  });
  it("the waiting list offers every path and module, with slugs the API accepts", () => {
    const o = waitlistOptions(staticCatalog);
    expect(o).toHaveLength(staticCatalog.courses.length + staticCatalog.learningPaths.length);
    for (const x of o) expect(x.slug).toMatch(/^[a-z0-9-]{1,80}$/);
  });
});
