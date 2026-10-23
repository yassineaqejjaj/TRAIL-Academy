import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseBySlug } from "./queries";

/** Resolves the course and confirms an active entitlement; otherwise sends the user to the course page. */
export async function requireCourseAccess(slug: string) {
  const user = await requireUser();
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("entitlements").select("expires_at, status").eq("user_id", user.id).eq("course_id", course.id).maybeSingle();
  const active = data && data.status === "active" && new Date(data.expires_at) > new Date();
  if (!active) redirect(`/formations/${slug}`);
  return { user, course, expiresAt: data!.expires_at as string };
}
