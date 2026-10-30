"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, ButtonLink, ProgressBar } from "@/components/ui";
import { questions } from "@/lib/assessment/questions";
import { levelLabel, scoreAssessment } from "@/lib/assessment/score";

export interface RoleOption { value: string; label: string; pathSlug: string; pathTitle: string }
export interface ModuleInfo { code: string; title: string; slug: string }

/** Runs entirely in the browser: answers are never sent or stored. */
export function Assessment({ roles, modules }: { roles: RoleOption[]; modules: ModuleInfo[] }) {
  const [step, setStep] = useState<"intro" | number | "result">("intro");
  const [role, setRole] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);

  const byCode = new Map(modules.map((m) => [m.code, m]));
  const q = typeof step === "number" ? questions[step] : null;

  if (step === "intro") {
    return (
      <div className="glass rounded-3xl p-8">
        <h2 ref={heading} tabIndex={-1} className="text-2xl font-bold outline-none">Évaluez votre niveau en 5 minutes</h2>
        <p className="mt-3 text-muted">15 questions courtes sur cinq compétences : comprendre l'IA, l'utiliser, vérifier ses résultats, maîtriser les risques, construire avec. Vous obtenez un niveau estimé, vos points forts, vos points à travailler et un parcours recommandé. Vos réponses ne sont ni envoyées ni enregistrées.</p>
        <label htmlFor="role" className="mt-6 block text-sm font-semibold">Votre fonction (facultatif, pour recommander le bon parcours)</label>
        <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="mt-2 min-h-12 w-full max-w-md rounded-lg border border-border bg-bg px-3">
          <option value="">Je préfère ne pas préciser</option>
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <div className="mt-6"><Button onClick={() => setStep(0)}>Commencer</Button></div>
      </div>
    );
  }

  if (q && typeof step === "number") {
    const chosen = answers[q.id];
    const last = step === questions.length - 1;
    return (
      <div className="glass rounded-3xl p-8">
        <p className="text-sm text-muted" aria-live="polite">Question {step + 1} sur {questions.length}</p>
        <div className="mt-2"><ProgressBar value={Math.round((step / questions.length) * 100)} label="Avancement de l'évaluation" /></div>
        <fieldset className="mt-6">
          <legend><h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">{q.prompt}</h2></legend>
          <div className="mt-4 flex flex-col gap-3">
            {q.options.map((o, i) => {
              const state = revealed ? (i === q.answer ? "border-accent bg-accent-soft" : chosen === i ? "border-warn bg-warn-soft" : "border-border") : chosen === i ? "border-accent" : "border-border";
              return (
                <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${state}`}>
                  <input type="radio" name={q.id} className="mt-1 h-5 w-5" checked={chosen === i} disabled={revealed} onChange={() => setAnswers({ ...answers, [q.id]: i })} />
                  <span>{o}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {revealed && <p role="status" className="mt-4 rounded-lg bg-surface-2 p-4 text-[15px]"><strong>{chosen === q.answer ? "Bonne réponse. " : "Pas tout à fait. "}</strong>{q.explanation}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {!revealed
            ? <Button onClick={() => setRevealed(true)} disabled={chosen === undefined}>Valider</Button>
            : <Button onClick={() => { setRevealed(false); setStep(last ? "result" : step + 1); }}>{last ? "Voir mon résultat" : "Question suivante"}</Button>}
        </div>
      </div>
    );
  }

  const r = scoreAssessment(answers);
  const picked = roles.find((x) => x.value === role);
  const recommended = Array.from(new Set(r.weakest.flatMap((d) => d.modules))).slice(0, 4).map((c) => byCode.get(c)).filter(Boolean) as ModuleInfo[];
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border-2 border-accent bg-surface p-8" role="region" aria-label="Résultat">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">Votre niveau estimé</p>
        <h2 ref={heading} tabIndex={-1} className="mt-1 text-4xl font-bold outline-none">{levelLabel[r.level]} · {r.correct}/{r.total}</h2>
        <p className="mt-2 text-muted">{r.level === "advanced" ? "Vous maîtrisez les bases et une bonne partie des sujets avancés." : r.level === "intermediate" ? "Vous avez de bonnes bases : quelques sujets précis vous feront gagner en fiabilité." : "Vous débutez : une montée en compétence progressive, en commençant par les fondations, est la plus efficace."} Cette estimation est indicative : ce n'est pas une certification.</p>
      </div>

      <div className="glass rounded-3xl p-8">
        <h3 className="text-xl font-semibold">Vos résultats par compétence</h3>
        <ul className="mt-4 flex flex-col gap-4">{r.dimensions.map((d) => (
          <li key={d.id}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{d.label}</span><span className="text-muted">{d.correct}/{d.total}</span></div><ProgressBar value={d.percent} label={d.label} /></li>
        ))}</ul>
        {r.strongest.length > 0 && <p className="mt-4 text-sm"><strong>Points forts :</strong> {r.strongest.map((d) => d.label).join(", ")}.</p>}
        {r.weakest.length > 0 && <p className="mt-1 text-sm"><strong>À travailler en priorité :</strong> {r.weakest.map((d) => d.label).join(", ")}.</p>}
      </div>

      <div className="glass rounded-3xl p-8">
        <h3 className="text-xl font-semibold">Par où commencer</h3>
        {recommended.length > 0 ? <ul className="mt-3 flex flex-col gap-2">{recommended.map((m) => <li key={m.code}><Link href={`/formations/${m.slug}`} className="font-semibold text-accent hover:underline">{m.code} · {m.title}</Link></li>)}</ul> : <p className="mt-3 text-muted">Aucun point faible détecté : visez un parcours avancé.</p>}
        {picked && <p className="mt-4">Pour votre fonction : <Link href={`/parcours/${picked.pathSlug}`} className="font-semibold text-accent hover:underline">{picked.pathTitle}</Link>.</p>}
        <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href="/conseiller">Décrire mon métier au conseiller</ButtonLink><ButtonLink href="/parcours" variant="secondary">Voir les parcours</ButtonLink></div>
      </div>

      {r.wrong.length > 0 && (
        <details className="glass rounded-3xl p-6">
          <summary className="cursor-pointer font-semibold">Revoir les {r.wrong.length} questions manquées</summary>
          <ul className="mt-4 flex flex-col gap-4">{r.wrong.map((w) => <li key={w.id}><p className="font-medium">{w.prompt}</p><p className="mt-1 text-sm"><Badge tone="accent">Bonne réponse</Badge> {w.options[w.answer]}</p><p className="mt-1 text-sm text-muted">{w.explanation}</p></li>)}</ul>
        </details>
      )}
      <div><Button variant="secondary" onClick={() => { setAnswers({}); setRevealed(false); setStep("intro"); }}>Recommencer</Button></div>
    </div>
  );
}
