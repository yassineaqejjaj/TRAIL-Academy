import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Badge, Container } from "@/components/ui";
import { requireCourseAccess } from "@/lib/learning/access";
import { asUser } from "@/lib/db";
import { QuizForm, type QuizQuestion } from "../../../quiz-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Quiz", robots: { index: false } };

export default async function QuizPage({ params }: { params: Promise<{ slug: string; quizId: string }> }) {
  const { slug, quizId } = await params;
  if (!z.string().uuid().safeParse(quizId).success) notFound();
  const { user, course } = await requireCourseAccess(slug);
  const data = await asUser(user.id, async (q) => {
    const quiz = await q.one<{ id: string; title: string; pass_percent: number; max_attempts: number | null }>("select id, title, pass_percent, max_attempts from quizzes where id = $1 and course_id = $2", [quizId, course.id]);
    if (!quiz) return null;
    return {
      quiz,
      qs: await q<{ id: string; kind: QuizQuestion["kind"]; prompt: string }>("select id, kind, prompt from quiz_questions where quiz_id = $1 order by position", [quizId]),
      options: await q<{ question_id: string; option_id: string; label: string }>("select question_id, option_id, label from get_quiz_options($1)", [quizId]), // never includes is_correct
      attempts: await q<{ id: string; score_percent: string; passed: boolean; submitted_at: string }>("select id, score_percent, passed, submitted_at from quiz_attempts where quiz_id = $1 and user_id = $2 order by submitted_at desc", [quizId, user.id]),
    };
  });
  if (!data) notFound();
  const { quiz, qs, options, attempts } = data;
  const questions: QuizQuestion[] = qs.map((q) => ({ id: q.id, kind: q.kind, prompt: q.prompt, options: options.filter((o) => o.question_id === q.id).map((o) => ({ id: o.option_id, label: o.label })) }));
  const attemptsLeft = quiz.max_attempts == null ? null : Math.max(0, quiz.max_attempts - attempts.length);

  return (
    <Container className="max-w-3xl py-10">
      <p className="text-sm text-muted"><Link href={`/apprendre/${slug}`} className="hover:text-fg">{course.title}</Link> / Quiz</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{quiz.title}</h1>
      <p className="mt-2 text-muted">Seuil de réussite : {quiz.pass_percent} %. Les questions à réponse libre sont relues par le formateur et ne comptent pas dans le score automatique.</p>
      <div className="mt-8"><QuizForm quizId={quizId} slug={slug} questions={questions} attemptsLeft={attemptsLeft} /></div>
      {attempts.length > 0 && (
        <section className="mt-10"><h2 className="text-xl font-semibold">Historique des tentatives</h2>
          <ul className="mt-3 space-y-2 text-sm">{attempts.map((a) => <li key={a.id} className="flex items-center gap-3"><Badge tone={a.passed ? "accent" : "warn"}>{a.passed ? "Réussi" : "Non réussi"}</Badge>{Number(a.score_percent)} % <span className="text-muted">{new Date(a.submitted_at).toLocaleString("fr-FR")}</span></li>)}</ul></section>
      )}
    </Container>
  );
}
