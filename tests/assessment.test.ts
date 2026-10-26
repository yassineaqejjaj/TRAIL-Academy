import { describe, expect, it } from "vitest";
import { staticCatalog } from "@/lib/catalog";
import { dimensions, questions } from "@/lib/assessment/questions";
import { levelOf, scoreAssessment } from "@/lib/assessment/score";

const all = (pick: (q: (typeof questions)[number]) => number) => Object.fromEntries(questions.map((q) => [q.id, pick(q)]));

describe("AI Skills Assessment", () => {
  it("has 15 well-formed questions, three per dimension, with one valid answer each", () => {
    expect(questions).toHaveLength(15);
    expect(new Set(questions.map((q) => q.id)).size).toBe(15);
    for (const d of dimensions) expect(questions.filter((q) => q.dimension === d.id)).toHaveLength(3);
    for (const q of questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.explanation.length).toBeGreaterThan(30);
    }
  });
  it("does not always put the right answer in the same position", () => {
    expect(new Set(questions.map((q) => q.answer)).size).toBeGreaterThanOrEqual(3);
  });
  it("points every dimension to modules that exist in the catalogue", () => {
    for (const d of dimensions) for (const code of d.modules) expect(staticCatalog.courses.some((c) => c.code === code), code).toBe(true);
  });
  it("scores a perfect, an empty and a mixed attempt", () => {
    const perfect = scoreAssessment(all((q) => q.answer));
    expect(perfect).toMatchObject({ correct: 15, percent: 100, level: "advanced" });
    expect(perfect.weakest).toHaveLength(0);
    const none = scoreAssessment({});
    expect(none).toMatchObject({ correct: 0, percent: 0, level: "beginner" });
    expect(none.wrong).toHaveLength(15);
    const mixed = scoreAssessment(all((q) => (q.dimension === "risks" ? (q.answer + 1) % q.options.length : q.answer)));
    expect(mixed.weakest[0].id).toBe("risks");
    expect(mixed.weakest[0].percent).toBe(0);
    expect(mixed.level).toBe("advanced"); // 12/15 = 80 %
  });
  it("uses documented level thresholds", () => {
    expect([levelOf(0), levelOf(44), levelOf(45), levelOf(74), levelOf(75), levelOf(100)]).toEqual(["beginner", "beginner", "intermediate", "intermediate", "advanced", "advanced"]);
  });
});
