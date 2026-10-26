import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { legalPages } from "@/lib/site";

describe("legal drafts", () => {
  for (const { slug } of legalPages) {
    it(`${slug} keeps its lawyer-validation banner and open placeholders`, () => {
      const text = readFileSync(`docs/legal/${slug}.md`, "utf8");
      expect(text).toContain("BROUILLON — À COMPLÉTER ET À FAIRE VALIDER PAR UN JURISTE");
      expect(text).toMatch(/\[À (COMPLÉTER|VALIDER)/);
      expect(text.length).toBeGreaterThan(1500);
    });
  }
  it("do not name an employer or client", () => {
    for (const { slug } of legalPages) expect(readFileSync(`docs/legal/${slug}.md`, "utf8")).not.toMatch(/devoteam|société générale|bpce|creative tech/i);
  });
});
