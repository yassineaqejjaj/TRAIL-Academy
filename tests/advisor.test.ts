import { describe, expect, it } from "vitest";
import { recommend } from "@/lib/advisor/engine";
import type { AdvisorInput } from "@/lib/advisor/rules";

const base: AdvisorInput = { role: "product", experience: "mid", familiarity: "user", objective: "use", technical: "medium", hoursPerWeek: 3 };

describe("advisor", () => {
  it("is deterministic", () => {
    expect(recommend(base)).toEqual(recommend(base));
  });
  it("recommends Product Manager Augmenté for product roles", () => {
    const r = recommend(base);
    expect(r.pathSlug).toBe("product-manager-augmente");
    expect(r.courses).toHaveLength(9);
    expect(r.reasons.length).toBeGreaterThan(0);
  });
  it("recommends AI Product Manager for engineers building systems", () => {
    const r = recommend({ ...base, role: "engineering", objective: "build", technical: "high", familiarity: "user" });
    expect(r.pathSlug).toBe("ai-product-manager");
  });
  it("computes duration from weekly time", () => {
    const r = recommend(base);
    expect(r.weeks).toBe(Math.ceil(r.totalHours / 3));
  });
  it("suggests AI Mastery for experienced builders", () => {
    expect(recommend({ ...base, role: "engineering", objective: "build", technical: "high", familiarity: "builder" }).pathSlug).toBe("ai-mastery");
  });
});
