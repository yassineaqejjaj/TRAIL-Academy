import "server-only";
import { asUser, type Q } from "@/lib/db";
import { flattenLessons, pickResumeLesson, type AssignmentRow, type ChapterRow, type CourseRow, type CourseSummary, type LessonRow, type OutlineChapter, type QuizRow } from "./types";

/** All reads run as the signed-in user: RLS decides what is visible. */
export const getCourseBySlug = (userId: string, slug: string) =>
  asUser(userId, (q) => q.one<CourseRow>("select id, code, slug, title, summary from courses where slug = $1", [slug]));

export async function getOutline(q: Q, courseId: string): Promise<OutlineChapter[]> {
  const chapters = await q<ChapterRow>("select id, course_id, title, position from chapters where course_id = $1 order by position", [courseId]);
  const lessons = await q<LessonRow>("select * from lessons where course_id = $1 order by position", [courseId]);
  const byChapter = new Map<string, LessonRow[]>();
  for (const l of lessons) byChapter.set(l.chapter_id, [...(byChapter.get(l.chapter_id) ?? []), l]);
  return chapters.map((c) => ({ ...c, lessons: byChapter.get(c.id) ?? [] })).filter((c) => c.lessons.length > 0);
}

export async function getCompletedLessonIds(q: Q, userId: string, courseId: string): Promise<Set<string>> {
  const rows = await q<{ lesson_id: string }>(
    "select lp.lesson_id from lesson_progress lp join lessons l on l.id = lp.lesson_id where lp.user_id = $1 and l.course_id = $2 and lp.completed_at is not null", [userId, courseId]);
  return new Set(rows.map((r) => r.lesson_id));
}

export const getQuizzes = (q: Q, courseId: string) => q<QuizRow>("select id, title, pass_percent, max_attempts from quizzes where course_id = $1 order by title", [courseId]);
export const getAssignments = (q: Q, courseId: string) => q<AssignmentRow>("select id, title, instructions_md, required from assignments where course_id = $1", [courseId]);

export async function getDashboard(userId: string) {
  return asUser(userId, async (q) => {
    const ents = await q<{ expires_at: string; status: string } & CourseRow>(
      `select e.expires_at, e.status, c.id, c.code, c.slug, c.title, c.summary
       from entitlements e join courses c on c.id = e.course_id where e.user_id = $1 order by e.expires_at`, [userId]);
    const progress = await q<{ course_id: string; percent: number }>("select course_id, percent from learner_progress where user_id = $1", [userId]);
    const enrollments = await q<{ course_id: string; completed_at: string | null; last_lesson_id: string | null }>("select course_id, completed_at, last_lesson_id from enrollments where user_id = $1", [userId]);
    const attestations = await q<{ course_id: string; verification_code: string }>("select course_id, verification_code from attestations where user_id = $1", [userId]);

    const summaries: CourseSummary[] = [];
    for (const e of ents) {
      const course: CourseRow = { id: e.id, code: e.code, slug: e.slug, title: e.title, summary: e.summary };
      const enr = enrollments.find((x) => x.course_id === course.id);
      const expired = e.status !== "active" || new Date(e.expires_at) <= new Date();
      let resume: string | null = null;
      if (!expired) {
        const outline = await getOutline(q, course.id);
        resume = pickResumeLesson(flattenLessons(outline), await getCompletedLessonIds(q, userId, course.id), enr?.last_lesson_id ?? null);
      }
      summaries.push({
        course, expiresAt: e.expires_at, expired,
        percent: progress.find((p) => p.course_id === course.id)?.percent ?? 0,
        completedAt: enr?.completed_at ?? null, resumeLessonId: resume,
        attestationCode: attestations.find((a) => a.course_id === course.id)?.verification_code ?? null,
      });
    }

    // Assignments awaiting the learner or the instructor, for active courses only.
    const activeIds = summaries.filter((s) => !s.expired).map((s) => s.course.id);
    const pending: { assignment: AssignmentRow & { course_id: string }; state: "to_submit" | "in_review" | "revision_requested" }[] = [];
    if (activeIds.length) {
      const assignments = await q<AssignmentRow & { course_id: string }>("select id, course_id, title, instructions_md, required from assignments where course_id = any($1::uuid[]) and required", [activeIds]);
      const subs = await q<{ assignment_id: string; status: string }>("select assignment_id, status from assignment_submissions where user_id = $1 order by submitted_at desc", [userId]);
      for (const a of assignments) {
        const mine = subs.filter((s) => s.assignment_id === a.id);
        if (mine.some((s) => s.status === "accepted")) continue;
        const latest = mine[0]?.status;
        pending.push({ assignment: a, state: !latest ? "to_submit" : latest === "revision_requested" ? "revision_requested" : "in_review" });
      }
    }
    return { summaries, pending };
  });
}
