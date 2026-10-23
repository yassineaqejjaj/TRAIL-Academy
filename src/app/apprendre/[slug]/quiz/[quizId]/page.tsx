import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Badge, Container } from "@/components/ui";
import { requireCourseAccess } from "@/lib/learning/access";
import { createClient } from "@/lib/supabase/server";
import { QuizForm, type QuizQuestion } from "../../../quiz-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Quiz", robots: { index: false } };

export default async function QuizPage({ params }: { params: Promise<{ slug: string; quizId: string }> }) {
  const { slug, quizId } = await params;
  if (!z.string().uuid().safeParse(quizId).success) notFound();
  const { user, course } = await requireCourseAccess(slug);
  const supabase = await createClient();
  const { data: quiz } = await supabase.from("quizzes").select("id, title, pass_percent, max_attempts, course_id").eq("id", quizId).eq("course_id", course.id).maybeSingle();
  if (!quiz) notFound();

  const [{ data: qs }, { data: opts }, { data: attempts }] = await Promise.all([
    supabase.from("quiz_questions").select("id, kind, prompt, position").eq("quiz_id", quizId).order("position"),
    supabase.rpc("get_quiz_options", { p_quiz: quizId }), // never includes is_correct
    supabase.from("quiz_attempts").select("id, score_percent, passed, submitted_at").eq("quiz_id", quizId).eq("user_id", user.id).order("submitted_at", { ascending: false }),
  ]);
  const options = (opts ?? []) as { question_id: string; option_id: string; label: string }[];
  const questions: QuizQuestion[] = (qs ?? []).map((q: { id: string; kind: QuizQuestion["kind"]; prompt: string }) => ({ id: q.id, kind: q.kind, prompt: q.prompt, options: options.filter((o) => o.question_id === q.id).map((o) => ({ id: o.option_id, label: o.label })) }));
  const attemptsLeft = quiz.max_attempts == null ? null : Math.max(0, quiz.max_attempts - (attempts?.length ?? 0));

  return (
    <Container className="max-w-3xl py-10">
      <p className="text-sm text-muted"><Link href={`/apprendre/${slug}`} className="hover:text-fg">{course.title}</Link> / Quiz</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{quiz.title}</h1>
      <p className="mt-2 text-muted">Seuil de réussite : {quiz.pass_percent} %. Les questions à réponse libre sont relues par le formateur et ne comptent pas dans le score automatique.</p>
      <div className="mt-8"><QuizForm quizId={quizId} slug={slug} questions={questions} attemptsLeft={attemptsLeft} /></div>
      {(attempts ?? []).length > 0 && (
        <section className="mt-10"><h2 className="text-xl font-semibold">Historique des tentatives</h2>
          <ul className="mt-3 space-y-2 text-sm">{(attempts ?? []).map((a) => <li key={a.id} className="flex items-center gap-3"><Badge tone={a.passed ? "accent" : "warn"}>{a.passed ? "Réussi" : "Non réussi"}</Badge>{Number(a.score_percent)} % <span className="text-muted">{new Date(a.submitted_at).toLocaleString("fr-FR")}</span></li>)}</ul></section>
      )}
    </Container>
  );
}
