import "server-only";
import { createClient } from "@/lib/supabase/server";
import { flattenLessons, pickResumeLesson, type AssignmentRow, type ChapterRow, type CourseRow, type CourseSummary, type LessonRow, type OutlineChapter, type QuizRow } from "./types";

/** All reads use the user's own session: RLS decides what is visible. */
export async function getCourseBySlug(slug: string): Promise<CourseRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("id, code, slug, title, summary").eq("slug", slug).maybeSingle();
  return (data as CourseRow | null) ?? null;
}

export async function getOutline(courseId: string): Promise<OutlineChapter[]> {
  const supabase = await createClient();
  const [{ data: chapters }, { data: lessons }] = await Promise.all([
    supabase.from("chapters").select("id, course_id, title, position").eq("course_id", courseId).order("position"),
    supabase.from("lessons").select("*").eq("course_id", courseId).order("position"),
  ]);
  const byChapter = new Map<string, LessonRow[]>();
  for (const l of (lessons ?? []) as LessonRow[]) byChapter.set(l.chapter_id, [...(byChapter.get(l.chapter_id) ?? []), l]);
  return ((chapters ?? []) as ChapterRow[]).map((c) => ({ ...c, lessons: byChapter.get(c.id) ?? [] })).filter((c) => c.lessons.length > 0);
}

export async function getCompletedLessonIds(userId: string, courseId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("lesson_progress").select("lesson_id, completed_at, lessons!inner(course_id)").eq("user_id", userId).eq("lessons.course_id", courseId).not("completed_at", "is", null);
  return new Set((data ?? []).map((r: { lesson_id: string }) => r.lesson_id));
}

export async function getQuizzes(courseId: string): Promise<QuizRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("quizzes").select("id, title, pass_percent, max_attempts").eq("course_id", courseId);
  return (data ?? []) as QuizRow[];
}

export async function getAssignments(courseId: string): Promise<AssignmentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("assignments").select("id, title, instructions_md, required").eq("course_id", courseId);
  return (data ?? []) as AssignmentRow[];
}

export async function getDashboard(userId: string) {
  const supabase = await createClient();
  const { data: ents } = await supabase.from("entitlements").select("expires_at, status, courses(id, code, slug, title, summary)").eq("user_id", userId).order("expires_at");
  const [{ data: progress }, { data: enrollments }, { data: attestations }] = await Promise.all([
    supabase.from("learner_progress").select("course_id, percent").eq("user_id", userId),
    supabase.from("enrollments").select("course_id, completed_at, last_lesson_id").eq("user_id", userId),
    supabase.from("attestations").select("course_id, verification_code, issued_at").eq("user_id", userId),
  ]);

  const summaries: CourseSummary[] = [];
  for (const e of (ents ?? []) as unknown as { expires_at: string; status: string; courses: CourseRow }[]) {
    const course = e.courses;
    const enr = (enrollments ?? []).find((x: { course_id: string }) => x.course_id === course.id) as { completed_at: string | null; last_lesson_id: string | null } | undefined;
    const expired = e.status !== "active" || new Date(e.expires_at) <= new Date();
    let resume: string | null = null;
    if (!expired) {
      const outline = await getOutline(course.id);
      const done = await getCompletedLessonIds(userId, course.id);
      resume = pickResumeLesson(flattenLessons(outline), done, enr?.last_lesson_id ?? null);
    }
    summaries.push({
      course, expiresAt: e.expires_at, expired,
      percent: (progress ?? []).find((p: { course_id: string }) => p.course_id === course.id)?.percent ?? 0,
      completedAt: enr?.completed_at ?? null,
      resumeLessonId: resume,
      attestationCode: (attestations ?? []).find((a: { course_id: string }) => a.course_id === course.id)?.verification_code ?? null,
    });
  }

  // Assignments awaiting the learner or the instructor, for active courses only.
  const activeIds = summaries.filter((s) => !s.expired).map((s) => s.course.id);
  const pending: { assignment: AssignmentRow & { course_id: string }; state: "to_submit" | "in_review" | "revision_requested" }[] = [];
  if (activeIds.length) {
    const [{ data: asg }, { data: subs }] = await Promise.all([
      supabase.from("assignments").select("id, course_id, title, instructions_md, required").in("course_id", activeIds).eq("required", true),
      supabase.from("assignment_submissions").select("assignment_id, status, submitted_at").eq("user_id", userId).order("submitted_at", { ascending: false }),
    ]);
    for (const a of (asg ?? []) as (AssignmentRow & { course_id: string })[]) {
      const mine = (subs ?? []).filter((s: { assignment_id: string }) => s.assignment_id === a.id) as { status: string }[];
      if (mine.some((s) => s.status === "accepted")) continue;
      const latest = mine[0]?.status;
      pending.push({ assignment: a, state: !latest ? "to_submit" : latest === "revision_requested" ? "revision_requested" : "in_review" });
    }
  }
  return { summaries, pending };
}
