import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { ActionButton, Check, Field, Flash, Input, Panel, Select, Textarea } from "../../../ui";
import { addOption, addQuestion, createAssignment, createQuiz, deleteAssignment, deleteOption, deleteQuestion, deleteQuiz, updateQuiz } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Évaluations — administration", robots: { index: false } };

const kindLabel = { single_choice: "Choix unique", multiple_choice: "Choix multiples", free_text: "Réponse libre (relue par le formateur)" } as const;

export default async function AdminEvaluations({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { db } = await adminDb();
  const { data: course } = await db.from("courses").select("id, title").eq("id", id).maybeSingle();
  if (!course) notFound();
  const { data: quizzes } = await db.from("quizzes").select("id, title, pass_percent, max_attempts").eq("course_id", id).order("title");
  const quizIds = (quizzes ?? []).map((q) => q.id);
  const { data: questions } = quizIds.length ? await db.from("quiz_questions").select("id, quiz_id, kind, prompt, points, position").in("quiz_id", quizIds).order("position") : { data: [] };
  const qIds = (questions ?? []).map((q) => q.id);
  const { data: options } = qIds.length ? await db.from("quiz_options").select("id, question_id, label, is_correct, position").in("question_id", qIds).order("position") : { data: [] };
  const { data: assignments } = await db.from("assignments").select("id, title, instructions_md, required").eq("course_id", id);

  return (
    <>
      <p className="text-sm text-muted"><Link href={`/admin/cours/${id}`} className="hover:text-fg">{course.title}</Link> / Quiz et devoirs</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Quiz et devoirs</h1>
      <p className="mt-2 text-sm text-muted">La correction automatique ne concerne que les questions objectives. Les réponses libres et les livrables sont relus par le formateur : aucune IA ne décide de l'attestation.</p>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      {(quizzes ?? []).map((q) => (
        <Panel key={q.id} title={q.title} actions={<ActionButton action={deleteQuiz.bind(null, id, q.id)} label="Supprimer le quiz" variant="ghost" />}>
          <form action={updateQuiz.bind(null, id, q.id)} className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2"><Field label="Titre"><Input name="title" defaultValue={q.title} required /></Field></div>
            <Field label="Seuil de réussite (%)"><Input name="passPercent" type="number" min={1} max={100} defaultValue={q.pass_percent} required /></Field>
            <Field label="Tentatives max. (vide = illimité)"><Input name="maxAttempts" type="number" min={1} defaultValue={q.max_attempts ?? ""} /></Field>
            <div className="sm:col-span-4"><Button type="submit" variant="secondary">Enregistrer</Button></div>
          </form>
          <ol className="mt-6 space-y-4">
            {(questions ?? []).filter((x) => x.quiz_id === q.id).map((qq) => (
              <li key={qq.id} className="rounded-lg border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{qq.prompt}</span><Badge>{kindLabel[qq.kind as keyof typeof kindLabel]}</Badge><Badge>{qq.points} pt</Badge>
                  <span className="ml-auto"><ActionButton action={deleteQuestion.bind(null, id, qq.id)} label="Supprimer" variant="ghost" /></span></div>
                {qq.kind !== "free_text" && (
                  <>
                    <ul className="mt-2 space-y-1">{(options ?? []).filter((o) => o.question_id === qq.id).map((o) => (
                      <li key={o.id} className="flex items-center gap-2"><span aria-hidden>{o.is_correct ? "✓" : "○"}</span><span className={o.is_correct ? "font-medium" : ""}>{o.label}</span>{o.is_correct && <span className="sr-only">(bonne réponse)</span>}
                        <ActionButton action={deleteOption.bind(null, id, o.id)} label="Retirer" variant="ghost" /></li>))}</ul>
                    <form action={addOption.bind(null, id, qq.id)} className="mt-2 flex flex-wrap items-center gap-2"><Input name="label" required aria-label="Texte de l'option" placeholder="Nouvelle option" className="max-w-sm" /><Check name="isCorrect" label="Bonne réponse" /><Button type="submit" variant="secondary" className="px-3 py-1.5">Ajouter</Button></form>
                  </>)}
              </li>))}
          </ol>
          <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-accent">Ajouter une question</summary>
            <form action={addQuestion.bind(null, id, q.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Énoncé"><Textarea name="prompt" required rows={2} /></Field></div>
              <Field label="Type"><Select name="kind"><option value="single_choice">Choix unique</option><option value="multiple_choice">Choix multiples</option><option value="free_text">Réponse libre</option></Select></Field>
              <Field label="Points"><Input name="points" type="number" min={1} max={20} defaultValue={1} /></Field>
              <div className="sm:col-span-2"><Field label="Retour affiché après correction"><Input name="feedback" /></Field></div>
              <div className="sm:col-span-2"><Button type="submit" variant="secondary">Ajouter</Button></div>
            </form></details>
        </Panel>))}

      <Panel title="Nouveau quiz">
        <form action={createQuiz.bind(null, id)} className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><Field label="Titre"><Input name="title" required /></Field></div>
          <Field label="Seuil de réussite (%)"><Input name="passPercent" type="number" min={1} max={100} defaultValue={70} required /></Field>
          <Field label="Tentatives max."><Input name="maxAttempts" type="number" min={1} /></Field>
          <div className="sm:col-span-4"><Button type="submit" variant="accent">Créer le quiz</Button></div>
        </form>
      </Panel>

      <Panel title="Devoirs (livrables)">
        <ul className="space-y-3 text-sm">{(assignments ?? []).map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"><span className="font-medium">{a.title}</span>{a.required ? <Badge tone="accent">Obligatoire</Badge> : <Badge>Facultatif</Badge>}
            <span className="ml-auto"><ActionButton action={deleteAssignment.bind(null, id, a.id)} label="Supprimer" variant="ghost" /></span></li>))}
          {!assignments?.length && <li className="text-muted">Aucun devoir.</li>}</ul>
        <form action={createAssignment.bind(null, id)} className="mt-4 grid gap-3">
          <Field label="Titre"><Input name="title" required /></Field>
          <Field label="Consignes (Markdown)"><Textarea name="instructionsMd" required rows={5} /></Field>
          <Check name="required" label="Obligatoire pour la complétion" defaultChecked />
          <div><Button type="submit" variant="secondary">Créer le devoir</Button></div>
        </form>
      </Panel>
    </>
  );
}
