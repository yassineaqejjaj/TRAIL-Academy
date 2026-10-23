import Link from "next/link";
import { ClipboardList, FileText } from "lucide-react";
import type { AssignmentRow, OutlineChapter, QuizRow } from "@/lib/learning/types";

export function Outline({ slug, outline, completed, currentId, quizzes, assignments }: { slug: string; outline: OutlineChapter[]; completed: Set<string>; currentId?: string; quizzes: QuizRow[]; assignments: AssignmentRow[] }) {
  const row = "flex min-h-14 items-center gap-3 border-t border-border py-2 text-[15px]";
  return (
    <nav aria-label="Plan du cours">
      <p className="mb-4 font-display text-lg font-bold">Plan du cours</p>
      {outline.map((c) => (
        <div key={c.id} className="mb-5">
          <p className="mb-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{c.title}</p>
          <ol>{c.lessons.map((l) => {
            const done = completed.has(l.id), cur = l.id === currentId;
            return (
              <li key={l.id}><Link href={`/apprendre/${slug}/${l.id}`} aria-current={cur ? "page" : undefined} className={`${row} ${cur ? "font-semibold text-fg" : "font-medium text-muted hover:text-fg"}`}>
                <span className={`min-w-[88px] text-[13px] font-semibold ${done ? "text-accent" : "text-muted"}`}>{done ? "Terminée" : cur ? "En cours" : "À faire"}</span>
                <span>{l.title}</span></Link></li>);
          })}</ol>
        </div>
      ))}
      {(quizzes.length > 0 || assignments.length > 0) && (
        <div>
          <p className="mb-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Évaluations</p>
          <ul>{quizzes.map((q) => <li key={q.id}><Link href={`/apprendre/${slug}/quiz/${q.id}`} className={`${row} font-medium text-muted hover:text-fg`}><ClipboardList size={16} aria-hidden />{q.title}</Link></li>)}
            {assignments.map((a) => <li key={a.id}><Link href={`/apprendre/${slug}/devoir/${a.id}`} className={`${row} font-medium text-muted hover:text-fg`}><FileText size={16} aria-hidden />{a.title}</Link></li>)}
            <li className="border-t border-border" aria-hidden /></ul>
        </div>
      )}
    </nav>
  );
}
