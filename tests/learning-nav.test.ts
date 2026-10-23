import { describe, expect, it } from "vitest";
import { adjacentLessons, flattenLessons, pickResumeLesson, type LessonRow, type OutlineChapter } from "@/lib/learning/types";

const lesson = (id: string, chapter: string, position: number) => ({ id, chapter_id: chapter, position }) as LessonRow;
const outline: OutlineChapter[] = [
  { id: "c2", course_id: "x", title: "B", position: 2, lessons: [lesson("l3", "c2", 1)] },
  { id: "c1", course_id: "x", title: "A", position: 1, lessons: [lesson("l2", "c1", 2), lesson("l1", "c1", 1)] },
];

describe("lesson navigation", () => {
  const flat = flattenLessons(outline);
  it("orders lessons by chapter then position", () => expect(flat.map((l) => l.id)).toEqual(["l1", "l2", "l3"]));
  it("resumes at the last visited lesson when unfinished", () => expect(pickResumeLesson(flat, new Set(["l1"]), "l3")).toBe("l3"));
  it("falls back to the first incomplete lesson", () => expect(pickResumeLesson(flat, new Set(["l1"]), null)).toBe("l2"));
  it("returns the last visited lesson when everything is done", () => expect(pickResumeLesson(flat, new Set(["l1", "l2", "l3"]), "l2")).toBe("l2"));
  it("handles empty outlines and unknown last lesson", () => {
    expect(pickResumeLesson([], new Set(), null)).toBeNull();
    expect(pickResumeLesson(flat, new Set(["l1", "l2", "l3"]), "gone")).toBe("l1");
  });
  it("finds neighbours", () => {
    expect(adjacentLessons(flat, "l2")).toMatchObject({ prev: { id: "l1" }, next: { id: "l3" } });
    expect(adjacentLessons(flat, "l1").prev).toBeNull();
    expect(adjacentLessons(flat, "l3").next).toBeNull();
  });
});
