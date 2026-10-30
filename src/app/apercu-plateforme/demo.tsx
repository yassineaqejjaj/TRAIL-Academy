"use client";
import { useState } from "react";
import { Badge, Button, ProgressBar } from "@/components/ui";

/** A self-contained walkthrough of the learner experience with fictional content. Nothing is sent or stored. */
const steps = ["Lire", "Quiz", "Exercice", "Livrable"] as const;
const quiz = [
  { q: "Pourquoi fournir le texte source à l'assistant plutôt que de lui demander de « se souvenir » ?", options: ["Il retient tout ce qu'on lui a dit dans les conversations précédentes.", "Ce qu'il voit dans le contexte est ce sur quoi il peut s'appuyer ; le reste est deviné.", "Ça n'a aucun effet sur la qualité."], answer: 1, why: "Le modèle s'appuie sur ce qui est dans sa fenêtre de contexte. Fournir la source réduit les inventions." },
  { q: "Quel critère de réussite est vérifiable ?", options: ["« Le résumé est bien. »", "« Chaque affirmation du résumé renvoie à un passage du texte source. »", "« Le résumé plaît à tout le monde. »"], answer: 1, why: "Un critère vérifiable se contrôle sans interprétation : on peut le cocher ou non." },
] as const;
const checklist = ["Le prompt précise le public et le format.", "Le texte source est fourni dans la demande.", "Les affirmations sont vérifiées une à une.", "Une personne relit avant diffusion."];

export function Demo() {
  const [tab, setTab] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState<boolean[]>(checklist.map(() => false));
  const [text, setText] = useState("");
  const [done, setDone] = useState<boolean[]>([false, false, false, false]);
  const mark = (i: number) => setDone((d) => d.map((v, k) => (k === i ? true : v)));
  const percent = Math.round((done.filter(Boolean).length / steps.length) * 100);

  return (
    <div className="glass rounded-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div><Badge tone="warn">Démonstration</Badge> <span className="ml-2 text-sm text-muted">Module fictif « Résumer sans inventer »</span></div>
        <div className="w-48"><ProgressBar value={percent} label="Progression dans la démonstration" /><span className="text-xs text-muted">{percent} % terminé</span></div>
      </div>
      <div role="tablist" aria-label="Étapes de la démonstration" className="flex flex-wrap gap-1 border-b border-border px-4 pt-3">
        {steps.map((s, i) => (
          <button key={s} role="tab" id={`tab-${i}`} aria-selected={tab === i} aria-controls={`panel-${i}`} onClick={() => setTab(i)}
            className={`min-h-11 rounded-t-lg px-4 text-[15px] font-medium ${tab === i ? "bg-bg font-semibold text-accent" : "text-muted hover:text-fg"}`}>{done[i] ? "✓ " : ""}{s}</button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="p-6">
        {tab === 0 && (
          <div>
            <h2 className="text-xl font-semibold">Leçon 2 · Donner la source au modèle</h2>
            <p className="mt-3 text-muted">Un assistant IA ne « sait » pas ce que contient votre document : il n'en voit que ce que vous lui fournissez dans la conversation. Quand la source est dans le contexte, il peut la reformuler et la citer. Quand elle n'y est pas, il complète avec ce qui est plausible, c'est-à-dire parfois faux.</p>
            <p className="mt-3 text-muted">En pratique : collez le texte (ou l'extrait), demandez un résumé en précisant le public, le format et l'obligation de renvoyer chaque affirmation à un passage.</p>
            <div className="mt-4"><Button onClick={() => { mark(0); setTab(1); }}>Leçon terminée, passer au quiz</Button></div>
          </div>
        )}
        {tab === 1 && (
          <div>
            <h2 className="text-xl font-semibold">Quiz corrigé automatiquement</h2>
            <ol className="mt-4 flex flex-col gap-6">{quiz.map((item, qi) => (
              <li key={qi}>
                <p className="font-medium">{qi + 1}. {item.q}</p>
                <div className="mt-2 flex flex-col gap-2">{item.options.map((o, oi) => {
                  const picked = answers[qi] === oi; const shown = answers[qi] !== undefined;
                  const style = shown ? (oi === item.answer ? "border-accent bg-accent-soft" : picked ? "border-warn bg-warn-soft" : "border-border") : "border-border hover:border-accent";
                  return <button key={oi} onClick={() => setAnswers({ ...answers, [qi]: oi })} disabled={shown} className={`min-h-11 rounded-xl border-2 p-3 text-left ${style}`}>{o}</button>;
                })}</div>
                {answers[qi] !== undefined && <p role="status" className="mt-2 text-sm text-muted"><strong>{answers[qi] === item.answer ? "Correct. " : "À revoir. "}</strong>{item.why}</p>}
              </li>
            ))}</ol>
            <div className="mt-4"><Button disabled={Object.keys(answers).length < quiz.length} onClick={() => { mark(1); setTab(2); }}>Terminer le quiz</Button></div>
          </div>
        )}
        {tab === 2 && (
          <div>
            <h2 className="text-xl font-semibold">Atelier no-code : écrire votre prompt</h2>
            <p className="mt-2 text-muted">Écrivez le prompt que vous donneriez à un assistant pour résumer un compte rendu de réunion. Puis cochez ce que votre prompt contient.</p>
            <label htmlFor="demo-prompt" className="mt-4 block text-sm font-semibold">Votre prompt</label>
            <textarea id="demo-prompt" value={text} onChange={(e) => setText(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-border bg-bg p-3" placeholder="Tu es… Voici le compte rendu… Résume-le pour…" />
            <fieldset className="mt-4"><legend className="text-sm font-semibold">Auto-évaluation</legend>
              {checklist.map((c, i) => <label key={c} className="mt-2 flex items-start gap-2 text-[15px]"><input type="checkbox" className="mt-1 h-5 w-5" checked={checked[i]} onChange={() => setChecked(checked.map((v, k) => (k === i ? !v : v)))} />{c}</label>)}
            </fieldset>
            <div className="mt-4"><Button disabled={text.trim().length < 15 || !checked.every(Boolean)} onClick={() => { mark(2); setTab(3); }}>Valider l'atelier</Button></div>
          </div>
        )}
        {tab === 3 && (
          <div>
            <h2 className="text-xl font-semibold">Livrable relu par le formateur</h2>
            <p className="mt-2 text-muted">À la fin de chaque module, vous déposez un livrable : un document, un tableur, un prototype. Le formateur le relit avec une grille de critères et vous répond, avec des corrections si besoin. Dans cette démonstration, rien n'est envoyé.</p>
            <ul className="mt-4 list-disc pl-6 text-[15px] text-muted"><li>Statut visible : envoyé, en relecture, accepté ou à reprendre.</li><li>Retour écrit du formateur sur chaque critère.</li><li>Attestation de réussite privée et vérifiable quand quiz et livrable sont validés.</li></ul>
            <div className="mt-4"><Button onClick={() => mark(3)} disabled={done[3]}>{done[3] ? "Démonstration terminée" : "Simuler le dépôt du livrable"}</Button></div>
            {percent === 100 && <p role="status" className="mt-4 rounded-lg bg-accent-soft p-4 font-medium">Parcours de démonstration terminé : c'est le déroulé de chaque module.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
