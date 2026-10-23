import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Markdown } from "@/components/markdown";
import { Badge, Container, Notice } from "@/components/ui";
import { requireCourseAccess } from "@/lib/learning/access";
import { createClient } from "@/lib/supabase/server";
import { AssignmentForm } from "../../../assignment-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Livrable", robots: { index: false } };

const statusLabel: Record<string, string> = { submitted: "Envoyé", in_review: "En relecture", accepted: "Accepté", revision_requested: "Révision demandée" };

export default async function AssignmentPage({ params }: { params: Promise<{ slug: string; assignmentId: string }> }) {
  const { slug, assignmentId } = await params;
  if (!z.string().uuid().safeParse(assignmentId).success) notFound();
  const { user, course } = await requireCourseAccess(slug);
  const supabase = await createClient();
  const { data: assignment } = await supabase.from("assignments").select("id, title, instructions_md").eq("id", assignmentId).eq("course_id", course.id).maybeSingle();
  if (!assignment) notFound();
  const { data: subs } = await supabase.from("assignment_submissions").select("id, status, body, instructor_feedback, submitted_at").eq("assignment_id", assignmentId).eq("user_id", user.id).order("submitted_at", { ascending: false });
  const accepted = (subs ?? []).some((s) => s.status === "accepted");

  return (
    <Container className="max-w-3xl py-10">
      <p className="text-sm text-muted"><Link href={`/apprendre/${slug}`} className="hover:text-fg">{course.title}</Link> / Livrable</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{assignment.title}</h1>
      <div className="mt-4"><Markdown>{assignment.instructions_md}</Markdown></div>
      <div className="mt-8">{accepted ? <Notice tone="info" title="Livrable accepté">Votre livrable a été validé par le formateur.</Notice> : <AssignmentForm assignmentId={assignmentId} slug={slug} />}</div>
      {(subs ?? []).length > 0 && (
        <section className="mt-10"><h2 className="text-xl font-semibold">Mes envois</h2>
          <ul className="mt-3 space-y-3">{(subs ?? []).map((s) => (
            <li key={s.id} className="rounded-lg border border-border bg-surface p-4 text-sm"><div className="flex items-center gap-2"><Badge tone={s.status === "accepted" ? "accent" : "neutral"}>{statusLabel[s.status] ?? s.status}</Badge><span className="text-muted">{new Date(s.submitted_at).toLocaleString("fr-FR")}</span></div>
              {s.instructor_feedback && <p className="mt-2"><span className="font-medium">Retour du formateur :</span> {s.instructor_feedback}</p>}</li>))}</ul></section>
      )}
    </Container>
  );
}
