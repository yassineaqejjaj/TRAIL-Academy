"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Notice } from "@/components/ui";
import { submitQuiz, type QuizState } from "./actions";

export interface QuizQuestion { id: string; kind: "single_choice" | "multiple_choice" | "free_text"; prompt: string; options: { id: string; label: string }[] }

export function QuizForm({ quizId, slug, questions, attemptsLeft }: { quizId: string; slug: string; questions: QuizQuestion[]; attemptsLeft: number | null }) {
  const [answers, setAnswers] = useState<Record<string, string[] | string>>({});
  const [state, setState] = useState<QuizState>({});
  const [pending, start] = useTransition();
  const toggle = (q: QuizQuestion, optionId: string) =>
    setAnswers((a) => {
      const cur = Array.isArray(a[q.id]) ? (a[q.id] as string[]) : [];
      if (q.kind === "single_choice") return { ...a, [q.id]: [optionId] };
      return { ...a, [q.id]: cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId] };
    });
  const r = state.result;

  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => setState(await submitQuiz(quizId, slug, answers))); }} className="grid gap-6">
      {questions.map((q, i) => {
        const res = r?.results.find((x) => x.question_id === q.id);
        return (
          <fieldset key={q.id} className="rounded-xl border border-border bg-surface p-5">
            <legend className="px-1 font-medium">{i + 1}. {q.prompt}</legend>
            {q.kind === "free_text" ? (
              <textarea aria-label={`Réponse à la question ${i + 1}`} rows={4} maxLength={5000} className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
            ) : (
              <div className="mt-2 grid gap-2">
                {q.kind === "multiple_choice" && <p className="text-xs text-muted">Plusieurs réponses possibles.</p>}
                {q.options.map((o) => (
                  <label key={o.id} className="flex items-start gap-2 text-sm">
                    <input type={q.kind === "single_choice" ? "radio" : "checkbox"} name={q.id} className="mt-1" checked={Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(o.id)} onChange={() => toggle(q, o.id)} />
                    {o.label}
                  </label>
                ))}
              </div>
            )}
            {res && (
              <p role="status" className={`mt-3 text-sm ${res.correct === true ? "text-success" : res.correct === false ? "text-danger" : "text-muted"}`}>
                {res.correct === true ? "Correct." : res.correct === false ? "Incorrect." : "Réponse libre : relue par le formateur."} {res.feedback}
              </p>
            )}
          </fieldset>
        );
      })}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="accent" disabled={pending || (attemptsLeft !== null && attemptsLeft <= 0)}>{pending ? "Correction…" : "Valider mes réponses"}</Button>
        {attemptsLeft !== null && <span className="text-sm text-muted">{attemptsLeft} tentative{attemptsLeft > 1 ? "s" : ""} restante{attemptsLeft > 1 ? "s" : ""}</span>}
      </div>
      <div aria-live="polite" className="grid gap-3">
        {state.error && <Notice title="Erreur">{state.error}</Notice>}
        {r && <Notice tone="info" title={r.passed ? `Réussi — ${r.score} %` : `Score : ${r.score} % — seuil non atteint`}>
          {r.needs_review && "Les questions à réponse libre ne comptent pas dans le score automatique. "}
          {r.completion.completed && r.completion.attestation_code && <>Module terminé ! <Link className="font-semibold underline" href={`/verification/${r.completion.attestation_code}`}>Voir mon attestation</Link>.</>}
        </Notice>}
      </div>
    </form>
  );
}
