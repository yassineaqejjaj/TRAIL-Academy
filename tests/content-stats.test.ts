import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contentStats } from "@/lib/content-stats";

describe("content figures shown on the home page", () => {
  it("match the written modules", () => {
    let lessons = 0, quiz = 0, diagrams = 0;
    for (const f of readdirSync("content/modules").filter((x) => x.endsWith(".json"))) {
      const m = JSON.parse(readFileSync(`content/modules/${f}`, "utf8")) as { chapters: { lessons: { body_md: string }[] }[]; quiz: { questions: unknown[] } };
      lessons += m.chapters.reduce((s, c) => s + c.lessons.length, 0);
      quiz += m.quiz.questions.length;
      diagrams += m.chapters.flatMap((c) => c.lessons).reduce((s, l) => s + (l.body_md.match(/```mermaid/g)?.length ?? 0), 0);
    }
    expect(contentStats.lessons).toBe(lessons);
    expect(contentStats.quizQuestions).toBe(quiz);
    expect(diagrams).toBeGreaterThanOrEqual(contentStats.diagrams); // shown as "220+"
  });
});
