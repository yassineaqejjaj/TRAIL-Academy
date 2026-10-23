import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, EmptyState } from "@/components/ui";
import { requireCourseAccess } from "@/lib/learning/access";
import { getCompletedLessonIds, getOutline } from "@/lib/learning/queries";
import { asUser } from "@/lib/db";
import { flattenLessons, pickResumeLesson } from "@/lib/learning/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cours", robots: { index: false } };

export default async function CourseHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, course } = await requireCourseAccess(slug);
  const target = await asUser(user.id, async (q) => {
    const lessons = flattenLessons(await getOutline(q, course.id));
    const enr = await q.one<{ last_lesson_id: string | null }>("select last_lesson_id from enrollments where user_id = $1 and course_id = $2", [user.id, course.id]);
    return pickResumeLesson(lessons, await getCompletedLessonIds(q, user.id, course.id), enr?.last_lesson_id ?? null);
  });
  if (target) redirect(`/apprendre/${slug}/${target}`);
  return <Container className="py-12"><h1 className="text-3xl font-semibold">{course.title}</h1><div className="mt-6"><EmptyState title="Contenu en préparation">Les leçons de ce module seront publiées prochainement.</EmptyState></div></Container>;
}
