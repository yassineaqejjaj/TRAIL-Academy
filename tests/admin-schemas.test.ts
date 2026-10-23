import { describe, expect, it } from "vitest";
import { assignmentSchema, couponSchema, courseDetailsSchema, courseSchema, eurosToCents, grantSchema, lessonSchema, lines, parseChapterLines, postSchema, quizSchema, testimonialSchema } from "@/lib/admin/schemas";

const fd = (o: Record<string, string>) => o;

describe("eurosToCents", () => {
  it("parses common French and English inputs", () => {
    expect(eurosToCents("149")).toBe(14900);
    expect(eurosToCents("149,50")).toBe(14950);
    expect(eurosToCents("1 490.00 €")).toBe(149000);
    expect(eurosToCents("0.1")).toBe(10);
  });
  it("rejects invalid values", () => {
    for (const v of ["", "-5", "abc", "1.234", "1,2,3", "12e3"]) expect(eurosToCents(v)).toBeNull();
  });
});

describe("course schemas", () => {
  const base = { code: "M19", slug: "nouveau-module", title: "Nouveau", summary: "Un résumé suffisamment long.", phaseId: "2", position: "19", difficulty: "beginner", durationHours: "6,5" };
  it("accepts a valid course and coerces numbers", () => {
    expect(courseSchema.parse(base)).toMatchObject({ phaseId: 2, position: 19, durationHours: 6.5 });
  });
  it("rejects bad codes, slugs and durations", () => {
    expect(courseSchema.safeParse({ ...base, code: "X1" }).success).toBe(false);
    expect(courseSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
    expect(courseSchema.safeParse({ ...base, durationHours: "0" }).success).toBe(false);
  });
  it("splits textareas into lists and reads checkboxes", () => {
    const r = courseDetailsSchema.parse({ ...base, topics: "A\n\n B \r\nC", tools: "", outcomes: "x", requireAllLessons: "on" });
    expect(r.topics).toEqual(["A", "B", "C"]);
    expect(r.tools).toEqual([]);
    expect(r).toMatchObject({ requireAllLessons: true, requireQuizzes: false, requireAssignments: false });
  });
  it("lines helper ignores non-strings", () => expect(lines(null)).toEqual([]));
});

describe("lessonSchema", () => {
  const base = fd({ title: "Intro", kind: "video", contentStatus: "draft", chapters: "" });
  it("requires provider and asset id together", () => {
    expect(lessonSchema.safeParse({ ...base, videoProvider: "mux" }).success).toBe(false);
    expect(lessonSchema.safeParse({ ...base, videoAssetId: "abcd1234" }).success).toBe(false);
    expect(lessonSchema.safeParse({ ...base, videoProvider: "mux", videoAssetId: "abcd1234" }).success).toBe(true);
    expect(lessonSchema.safeParse(base).success).toBe(true);
  });
  it("rejects suspicious asset ids", () => {
    expect(lessonSchema.safeParse({ ...base, videoProvider: "mux", videoAssetId: "x/../y" }).success).toBe(false);
  });
});

describe("parseChapterLines", () => {
  it("parses and sorts", () => expect(parseChapterLines(["2:30 Suite", "0:00 Intro"])).toEqual([{ start_seconds: 0, title: "Intro" }, { start_seconds: 150, title: "Suite" }]));
  it("rejects malformed lines", () => { expect(parseChapterLines(["Intro"])).toBeNull(); expect(parseChapterLines(["1:75 X"])).toBeNull(); });
});

describe("commerce and content schemas", () => {
  it("coupon: percent bounds, amount to cents, code normalisation", () => {
    expect(couponSchema.parse({ code: "spring10", kind: "percent", value: "10" })).toMatchObject({ code: "SPRING10", percentOff: 10, amountOffCents: null });
    expect(couponSchema.parse({ code: "AIDE-30", kind: "amount", value: "30,50" })).toMatchObject({ amountOffCents: 3050, percentOff: null });
    expect(couponSchema.safeParse({ code: "X", kind: "percent", value: "10" }).success).toBe(false);
    expect(couponSchema.safeParse({ code: "BAD1", kind: "percent", value: "101" }).success).toBe(false);
    expect(couponSchema.safeParse({ code: "BAD2", kind: "percent", value: "0" }).success).toBe(false);
    expect(couponSchema.safeParse({ code: "BAD3", kind: "amount", value: "abc" }).success).toBe(false);
  });
  it("quiz and assignment bounds", () => {
    expect(quizSchema.parse({ title: "Quiz", passPercent: "70", maxAttempts: "" }).maxAttempts).toBeUndefined();
    expect(quizSchema.safeParse({ title: "Quiz", passPercent: "0" }).success).toBe(false);
    expect(assignmentSchema.safeParse({ title: "L", instructionsMd: "court" }).success).toBe(false);
  });
  it("access grants need a reason and a sane duration", () => {
    expect(grantSchema.safeParse({ months: "3", reason: "" }).success).toBe(false);
    expect(grantSchema.safeParse({ months: "99", reason: "geste" }).success).toBe(false);
    expect(grantSchema.safeParse({ months: "3", reason: "geste commercial" }).success).toBe(true);
  });
  it("testimonials cannot be published without a consent reference", () => {
    const t = { authorName: "A. Martin", quote: "Une citation suffisamment longue." };
    expect(testimonialSchema.safeParse({ ...t, publish: "on" }).success).toBe(false);
    expect(testimonialSchema.safeParse({ ...t, publish: "on", consentReference: "Email du 12/10" }).success).toBe(true);
    expect(testimonialSchema.safeParse(t).success).toBe(true); // draft is fine
  });
  it("posts need a valid slug", () => {
    expect(postSchema.safeParse({ slug: "mon-article", title: "Titre", bodyMd: "x" }).success).toBe(true);
    expect(postSchema.safeParse({ slug: "Mon Article", title: "Titre", bodyMd: "x" }).success).toBe(false);
  });
});
