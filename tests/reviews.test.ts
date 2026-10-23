import { describe, expect, it } from "vitest";
import { MIN_PUBLISHED_REVIEWS, reviewSchema } from "@/lib/reviews";

const ok = { name: "Camille Test", role: "Product Owner", linkedin: "https://www.linkedin.com/in/camille-test/", quote: "Un retour détaillé et honnête sur le module, avec ce qui a servi et ce qui manque.", consent: "on" };

describe("review form validation", () => {
  it("accepts a complete, consented review", () => { expect(reviewSchema.safeParse(ok).success).toBe(true); });
  it("requires explicit consent and a real text", () => {
    expect(reviewSchema.safeParse({ ...ok, consent: undefined }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...ok, quote: "super" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...ok, quote: "x".repeat(1201) }).success).toBe(false);
  });
  it("only accepts LinkedIn profile links", () => {
    expect(reviewSchema.safeParse({ ...ok, linkedin: "https://evil.example/in/x" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...ok, linkedin: "javascript:alert(1)" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...ok, linkedin: "" }).success).toBe(true);
  });
  it("keeps the public section hidden below the threshold", () => { expect(MIN_PUBLISHED_REVIEWS).toBeGreaterThanOrEqual(3); });
});
