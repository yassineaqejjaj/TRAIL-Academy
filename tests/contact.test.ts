import { describe, expect, it } from "vitest";
import { contactSchema } from "@/lib/contact";

const valid = { name: "Jean Dupont", email: "j@acme.fr", company: "Acme", seats: "10", message: "Besoin de former 10 personnes" };

describe("contact schema", () => {
  it("accepts a valid lead and coerces seats", () => {
    const r = contactSchema.safeParse(valid);
    expect(r.success && r.data.seats).toBe(10);
  });
  it("treats empty seats as absent", () => {
    const r = contactSchema.safeParse({ ...valid, seats: "" });
    expect(r.success && r.data.seats).toBeUndefined();
  });
  it("rejects bad email, short message and missing fields", () => {
    expect(contactSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, message: "court" }).success).toBe(false);
    expect(contactSchema.safeParse({}).success).toBe(false);
  });
  it("keeps the honeypot value so the route can drop bots", () => {
    const r = contactSchema.safeParse({ ...valid, website: "spam" });
    expect(r.success && r.data.website).toBe("spam");
  });
});

import { interestSchema } from "@/lib/interest";
describe("interestSchema", () => {
  const ok = { email: "  Jean@Exemple.FR ", kind: "course_launch", courseSlug: "prompt-engineering", consent: true };
  it("normalises e-mail and requires explicit consent", () => {
    expect(interestSchema.parse(ok).email).toBe("jean@exemple.fr");
    expect(interestSchema.safeParse({ ...ok, consent: false }).success).toBe(false);
    expect(interestSchema.safeParse({ ...ok, consent: undefined }).success).toBe(false);
  });
  it("requires a module for launch notifications, not for the newsletter", () => {
    expect(interestSchema.safeParse({ ...ok, courseSlug: undefined }).success).toBe(false);
    expect(interestSchema.safeParse({ email: "a@b.fr", kind: "newsletter", consent: true }).success).toBe(true);
  });
  it("rejects bad addresses and slugs", () => {
    expect(interestSchema.safeParse({ ...ok, email: "nope" }).success).toBe(false);
    expect(interestSchema.safeParse({ ...ok, courseSlug: "../x" }).success).toBe(false);
  });
});
