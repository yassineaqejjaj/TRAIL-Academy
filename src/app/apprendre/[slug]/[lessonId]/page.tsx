import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ProgressBar } from "@/components/ui";
import { asUser } from "@/lib/db";
import { requireCourseAccess } from "@/lib/learning/access";
import { getAssignments, getCompletedLessonIds, getOutline, getQuizzes } from "@/lib/learning/queries";
import { adjacentLessons, flattenLessons } from "@/lib/learning/types";
import { presignDownload, storageConfigured } from "@/lib/storage";
import { getPlayback } from "@/lib/video";
import { LessonWorkspace } from "../../lesson-workspace";
import { Outline } from "../../outline";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leçon", robots: { index: false } };

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  if (!z.string().uuid().safeParse(lessonId).success) notFound();
  const { user, course } = await requireCourseAccess(slug);

  const data = await asUser(user.id, async (q) => ({
    outline: await getOutline(q, course.id),
    completed: await getCompletedLessonIds(q, user.id, course.id),
    quizzes: await getQuizzes(q, course.id),
    assignments: await getAssignments(q, course.id),
    progress: await q.one<{ position_seconds: number }>("select position_seconds from lesson_progress where user_id = $1 and lesson_id = $2", [user.id, lessonId]),
    notes: await q<{ id: string; body: string; position_seconds: number | null }>("select id, body, position_seconds from lesson_notes where user_id = $1 and lesson_id = $2 order by created_at desc", [user.id, lessonId]),
    bookmarks: await q<{ id: string; label: string | null; position_seconds: number }>("select id, label, position_seconds from lesson_bookmarks where user_id = $1 and lesson_id = $2 order by position_seconds", [user.id, lessonId]),
    resources: await q<{ id: string; title: string; size_bytes: number }>("select id, title, size_bytes from lesson_resources where lesson_id = $1", [lessonId]),
    overall: await q.one<{ percent: number }>("select percent from learner_progress where user_id = $1 and course_id = $2", [user.id, course.id]),
  }));
  const { outline, completed, quizzes, assignments } = data;
  const lessons = flattenLessons(outline);
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) notFound(); // RLS hides unpublished/unauthorised lessons: they simply are not in the outline
  const { prev, next } = adjacentLessons(lessons, lessonId);
  const chapter = outline.find((c) => c.id === lesson.chapter_id);

  const playback = await getPlayback(lesson);
  let tracks: { lang: string; label: string; url: string }[] = [];
  if (lesson.subtitle_tracks.length && storageConfigured()) {
    tracks = await Promise.all(lesson.subtitle_tracks.map(async (t) => ({ lang: t.lang, label: t.label, url: await presignDownload({ key: t.path, ttlSeconds: 2 * 60 * 60 }) })));
  }
  const percent = data.overall?.percent ?? 0;
  const position = lessons.findIndex((l) => l.id === lessonId) + 1;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex flex-wrap items-center gap-4"><Link href="/compte" className="py-2.5 text-[15px] font-medium text-accent hover:underline">Retour à mon espace</Link><span className="font-semibold">{course.code} · {course.title}</span></div>
          <div className="flex items-center gap-3 text-sm text-muted"><span>Progression {percent} %</span><div className="w-40"><ProgressBar value={percent} label="Progression du module" /></div></div>
        </div>
      </header>
      <div className="flex flex-wrap items-start">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-6 p-6 sm:p-8">
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{chapter?.title} · Leçon {position} sur {lessons.length}</div>
            <h1 className="mt-1 text-3xl font-bold">{lesson.title}</h1>
          </div>
          <LessonWorkspace
            key={lesson.id} lessonId={lesson.id}
            playback={playback.kind === "hls" ? { url: playback.url } : { unavailable: playback.reason }}
            tracks={tracks} chapters={lesson.video_chapters} startAt={data.progress?.position_seconds ?? 0}
            completed={completed.has(lesson.id)} transcript={lesson.transcript} bodyText={lesson.body_md}
            prevHref={prev ? `/apprendre/${slug}/${prev.id}` : null} nextHref={next ? `/apprendre/${slug}/${next.id}` : null}
            resources={data.resources} notes={data.notes} bookmarks={data.bookmarks}
          />
        </div>
        <aside aria-label="Plan et évaluations" className="min-w-0 max-w-[420px] flex-[1_1_340px] self-stretch border-l border-border bg-surface p-6">
          <Outline slug={slug} outline={outline} completed={completed} currentId={lesson.id} quizzes={quizzes} assignments={assignments} />
        </aside>
      </div>
    </div>
  );
}
