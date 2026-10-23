import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";

/** Resolves the course and confirms an active entitlement; otherwise sends the user to the course page. */
export async function requireCourseAccess(slug: string) {
  const user = await requireUser();
  const { course, ent } = await asUser(user.id, async (q) => {
    const course = await q.one<{ id: string; code: string; slug: string; title: string; summary: string }>("select id, code, slug, title, summary from courses where slug = $1", [slug]);
    const ent = course ? await q.one<{ expires_at: string; status: string }>("select expires_at, status from entitlements where user_id = $1 and course_id = $2", [user.id, course.id]) : null;
    return { course, ent };
  });
  if (!course) notFound();
  if (!ent || ent.status !== "active" || new Date(ent.expires_at) <= new Date()) redirect(`/formations/${slug}`);
  return { user, course, expiresAt: ent.expires_at };
}
