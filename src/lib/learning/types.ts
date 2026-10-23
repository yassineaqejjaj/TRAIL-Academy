export interface LessonRow {
  id: string; chapter_id: string; course_id: string; title: string; kind: string; position: number;
  is_free_preview: boolean; required: boolean; video_provider: string | null; video_asset_id: string | null;
  duration_seconds: number | null; transcript: string | null; body_md: string | null;
  subtitle_tracks: { lang: string; label: string; path: string }[];
  video_chapters: { title: string; start_seconds: number }[];
}
export interface ChapterRow { id: string; course_id: string; title: string; position: number }
export interface OutlineChapter extends ChapterRow { lessons: LessonRow[] }
export interface CourseRow { id: string; code: string; slug: string; title: string; summary: string }
export interface QuizRow { id: string; title: string; pass_percent: number; max_attempts: number | null }
export interface AssignmentRow { id: string; title: string; instructions_md: string; required: boolean }

export interface CourseSummary {
  course: CourseRow;
  expiresAt: string;
  expired: boolean;
  percent: number;
  completedAt: string | null;
  resumeLessonId: string | null;
  attestationCode: string | null;
}

/** Linear lesson order across chapters. */
export function flattenLessons(outline: OutlineChapter[]): LessonRow[] {
  return [...outline].sort((a, b) => a.position - b.position).flatMap((c) => [...c.lessons].sort((a, b) => a.position - b.position));
}

/** Where to send the learner: last visited lesson if still available, else first incomplete, else first. */
export function pickResumeLesson(lessons: LessonRow[], completed: Set<string>, lastLessonId: string | null): string | null {
  if (lessons.length === 0) return null;
  if (lastLessonId && lessons.some((l) => l.id === lastLessonId) && !completed.has(lastLessonId)) return lastLessonId;
  const firstIncomplete = lessons.find((l) => !completed.has(l.id));
  if (firstIncomplete) return firstIncomplete.id;
  return lastLessonId && lessons.some((l) => l.id === lastLessonId) ? lastLessonId : lessons[0].id;
}

export function adjacentLessons(lessons: LessonRow[], currentId: string): { prev: LessonRow | null; next: LessonRow | null } {
  const i = lessons.findIndex((l) => l.id === currentId);
  return { prev: i > 0 ? lessons[i - 1] : null, next: i >= 0 && i < lessons.length - 1 ? lessons[i + 1] : null };
}
