import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, EmptyState } from "@/components/ui";
import { requireCourseAccess } from "@/lib/learning/access";
import { getCompletedLessonIds, getOutline } from "@/lib/learning/queries";
import { createClient } from "@/lib/supabase/server";
import { flattenLessons, pickResumeLesson } from "@/lib/learning/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cours", robots: { index: false } };

export default async function CourseHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, course } = await requireCourseAccess(slug);
  const outline = await getOutline(course.id);
  const lessons = flattenLessons(outline);
  const supabase = await createClient();
  const { data: enr } = await supabase.from("enrollments").select("last_lesson_id").eq("user_id", user.id).eq("course_id", course.id).maybeSingle();
  const target = pickResumeLesson(lessons, await getCompletedLessonIds(user.id, course.id), enr?.last_lesson_id ?? null);
  if (target) redirect(`/apprendre/${slug}/${target}`);
  return <Container className="py-12"><h1 className="text-3xl font-semibold">{course.title}</h1><div className="mt-6"><EmptyState title="Contenu en préparation">Les leçons de ce module seront publiées prochainement.</EmptyState></div></Container>;
}
