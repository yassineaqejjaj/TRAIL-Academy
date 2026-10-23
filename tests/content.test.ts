import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Question { kind: string; prompt: string; feedback?: string; options: [string, boolean][] }
interface Module { course: string; slug: string; chapters: { title: string; lessons: { title: string; kind: string; body_md: string }[] }[]; quiz: { title: string; pass_percent: number; questions: Question[] }; assignment: { title: string; instructions_md: string } }

const files = readdirSync("content/modules").filter((f) => f.endsWith(".json")).sort();
const existsBlog = () => { try { return readdirSync("content/blog").some((f) => f.endsWith(".md")); } catch { return false; } };
const FORBIDDEN = /creative\s*tech|soci[ée]t[ée] g[ée]n[ée]rale|ilyasse|devoteam|bpce|lead pm|olmix/i;

describe.each(files)("content/modules/%s", (file) => {
  const m = JSON.parse(readFileSync(`content/modules/${file}`, "utf8")) as Module;
  const lessons = m.chapters.flatMap((c) => c.lessons);
  it("has a coherent structure", () => {
    expect(m.course).toMatch(/^M\d+$/);
    expect(file.startsWith(`m${m.course.slice(1)}-`)).toBe(true);
    expect(m.chapters.length).toBeGreaterThanOrEqual(3);
    expect(lessons.length).toBeGreaterThanOrEqual(10);
    expect(lessons.every((l) => ["reading", "exercise", "demo"].includes(l.kind))).toBe(true);
    expect(lessons.every((l) => l.body_md.trim().length >= 600)).toBe(true);
    expect(new Set(lessons.map((l) => l.title)).size).toBe(lessons.length);
  });
  it("has a valid quiz", () => {
    const qs = m.quiz.questions;
    expect(qs.length).toBeGreaterThanOrEqual(20);
    expect(qs.length).toBeLessThanOrEqual(35);
    for (const q of qs) {
      const good = q.options.filter(([, ok]) => ok).length;
      if (q.kind === "single_choice") { expect(q.options.length, q.prompt).toBeGreaterThanOrEqual(3); expect(good, q.prompt).toBe(1); }
      else if (q.kind === "multiple_choice") { expect(q.options.length, q.prompt).toBeGreaterThanOrEqual(4); expect(good, q.prompt).toBeGreaterThanOrEqual(2); expect(good, q.prompt).toBeLessThan(q.options.length); }
      else { expect(q.kind).toBe("free_text"); expect(q.options).toEqual([]); }
      if (q.kind !== "free_text") expect(new Set(q.options.map(([l]) => l)).size, q.prompt).toBe(q.options.length);
      expect((q.feedback ?? "").length, q.prompt).toBeGreaterThan(15);
    }
    expect(qs.filter((q) => q.kind === "free_text").length).toBeGreaterThanOrEqual(1);
  });
  it("has an assignment with an evaluation grid", () => {
    expect(m.assignment.instructions_md.length).toBeGreaterThan(500);
    expect(m.assignment.instructions_md).toMatch(/évaluation|grille/i);
  });
  it("contains no employer, client or colleague references and no unsupported markup", () => {
    const text = JSON.stringify(m);
    expect(text).not.toMatch(FORBIDDEN);
    for (const l of lessons) { expect(l.body_md, l.title).not.toMatch(/<\/?(table|div|span|script|iframe)/i); expect(l.body_md, l.title).not.toMatch(/^\|.*\|\s*$/m); }
  });
});

describe("blog articles", () => {
  if (!existsBlog()) { it.skip("no blog articles yet", () => undefined); return; }
  const dir = "content/blog";
  let posts: string[] = [];
  try { posts = readdirSync(dir).filter((f) => f.endsWith(".md")).sort(); } catch { /* none yet */ }
  it.each(posts)("%s has front matter, a body and no forbidden references", (f) => {
    const t = readFileSync(`${dir}/${f}`, "utf8");
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(t);
    expect(m, "front matter").not.toBeNull();
    expect(m![1]).toMatch(/^slug: [a-z0-9-]+$/m);
    expect(m![1]).toMatch(/^title: .+/m);
    expect(m![1]).toMatch(/^excerpt: .{40,}/m);
    expect(m![2].length).toBeGreaterThan(2500);
    expect(t).not.toMatch(FORBIDDEN);
  });
});
