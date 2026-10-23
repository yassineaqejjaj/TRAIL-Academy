import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Notice } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { statusLabel } from "@/lib/catalog";
import { Check, Field, Flash, Input, Panel, Select, Textarea } from "../../ui";
import { addPrerequisite, publishCourse, removePrerequisite, unpublishCourse, updateCourse } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Module — administration", robots: { index: false } };

const label: Record<string, string> = { no_published_lessons: "Aucune leçon publiée", lesson_without_content: "Leçon publiée sans vidéo ni texte", no_outcomes: "Aucun objectif d'apprentissage", quiz_without_questions: "Quiz sans question", question_without_correct_option: "Question sans bonne réponse" };

export default async function AdminCourse({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { db } = await adminDb();
  const { data: c } = await db.from("courses").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: phases }, { data: others }, { data: prereqs }, { data: readiness }] = await Promise.all([
    db.from("learning_phases").select("id, title").order("id"),
    db.from("courses").select("id, code, title").neq("id", id).order("position"),
    db.from("course_prerequisites").select("prerequisite_id").eq("course_id", id),
    db.rpc("course_readiness", { p_course: id }),
  ]);
  const preIds = new Set((prereqs ?? []).map((p) => p.prerequisite_id));
  const issues = (readiness ?? []) as { code: string; detail?: string }[];
  const rules = (c.completion_rules ?? {}) as Record<string, boolean>;
  const published = c.status === "published";

  return (
    <>
      <p className="text-sm text-muted"><Link href="/admin/cours" className="hover:text-fg">Modules</Link> / {c.code}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-tight">{c.title}</h1><Badge tone={published ? "accent" : "warn"}>{statusLabel[c.status as keyof typeof statusLabel]}</Badge></div>
      <nav aria-label="Sections du module" className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link className="rounded-md bg-surface-2 px-3 py-1.5" href={`/admin/cours/${id}`}>Fiche</Link>
        <Link className="rounded-md px-3 py-1.5 hover:bg-surface-2" href={`/admin/cours/${id}/contenu`}>Chapitres et leçons</Link>
        <Link className="rounded-md px-3 py-1.5 hover:bg-surface-2" href={`/admin/cours/${id}/evaluations`}>Quiz et devoirs</Link>
        <Link className="rounded-md px-3 py-1.5 hover:bg-surface-2" href={`/admin/cours/${id}/apercu`}>Aperçu</Link>
        {published && <Link className="rounded-md px-3 py-1.5 hover:bg-surface-2" href={`/formations/${c.slug}`}>Page publique</Link>}
      </nav>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      <Panel title="Publication">
        {issues.length === 0 ? <p className="text-sm text-success">Prêt à être publié : toutes les vérifications passent.</p> : (
          <div><p className="text-sm font-medium">À corriger avant publication :</p><ul className="mt-2 list-disc pl-5 text-sm text-muted">{issues.map((i, k) => <li key={k}>{label[i.code] ?? i.code}{i.detail ? ` — ${i.detail}` : ""}</li>)}</ul></div>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {!published && <form action={publishCourse.bind(null, id)}><Button type="submit" variant="accent" disabled={issues.length > 0}>Publier le module</Button></form>}
          {published && <form action={unpublishCourse.bind(null, id)}><Button type="submit" variant="secondary">Dépublier (ferme les offres)</Button></form>}
        </div>
        <div className="mt-4"><Notice tone="info" title="Achat">Publier un module n'ouvre pas la vente : activez l'offre dans « Produits et prix ». Un module ne peut jamais être vendu tant qu'il n'est pas publié.</Notice></div>
      </Panel>

      <Panel title="Informations">
        <form action={updateCourse.bind(null, id)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre"><Input name="title" defaultValue={c.title} required /></Field>
          <Field label="Slug (URL)"><Input name="slug" defaultValue={c.slug} required /></Field>
          <div className="sm:col-span-2"><Field label="Résumé"><Textarea name="summary" defaultValue={c.summary} rows={3} required /></Field></div>
          <Field label="Phase"><Select name="phaseId" defaultValue={c.phase_id}>{(phases ?? []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>
          <Field label="Niveau"><Select name="difficulty" defaultValue={c.difficulty}><option value="beginner">Débutant</option><option value="intermediate">Intermédiaire</option><option value="advanced">Avancé</option></Select></Field>
          <Field label="Durée estimée (heures)"><Input name="durationHours" defaultValue={String(c.duration_hours)} inputMode="decimal" required /></Field>
          <Field label="Livrable pratique"><Input name="deliverable" defaultValue={c.deliverable ?? ""} /></Field>
          <Field label="Thèmes (un par ligne)"><Textarea name="topics" defaultValue={(c.topics as string[]).join("\n")} /></Field>
          <Field label="Outils requis (un par ligne)"><Textarea name="tools" defaultValue={(c.tools as string[]).join("\n")} /></Field>
          <div className="sm:col-span-2"><Field label="Objectifs d'apprentissage mesurables (un par ligne)"><Textarea name="outcomes" defaultValue={(c.outcomes as string[]).join("\n")} rows={5} /></Field></div>
          <Field label="Titre SEO (70 max.)"><Input name="seoTitle" defaultValue={c.seo_title ?? ""} /></Field>
          <Field label="Description SEO (170 max.)"><Input name="seoDescription" defaultValue={c.seo_description ?? ""} /></Field>
          <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">Conditions de complétion</legend>
            <div className="mt-2 grid gap-2"><Check name="requireAllLessons" label="Toutes les leçons obligatoires terminées" defaultChecked={rules.requireAllLessons !== false} />
              <Check name="requireQuizzes" label="Tous les quiz réussis (seuil propre à chaque quiz)" defaultChecked={rules.requireQuizzes !== false} />
              <Check name="requireAssignments" label="Devoirs obligatoires acceptés par le formateur" defaultChecked={rules.requireAssignments !== false} /></div></fieldset>
          <div className="sm:col-span-2"><Button type="submit" variant="accent">Enregistrer</Button></div>
        </form>
      </Panel>

      <Panel title="Prérequis">
        <ul className="space-y-2 text-sm">{(others ?? []).filter((o) => preIds.has(o.id)).map((o) => (
          <li key={o.id} className="flex items-center gap-3"><span><span className="font-mono text-muted">{o.code}</span> {o.title}</span>
            <form action={removePrerequisite.bind(null, id)}><input type="hidden" name="prerequisiteId" value={o.id} /><Button type="submit" variant="ghost" className="px-2 py-1">Retirer</Button></form></li>))}
          {preIds.size === 0 && <li className="text-muted">Aucun prérequis.</li>}</ul>
        <form action={addPrerequisite.bind(null, id)} className="mt-4 flex gap-2"><Select name="prerequisiteId" aria-label="Module prérequis">{(others ?? []).filter((o) => !preIds.has(o.id)).map((o) => <option key={o.id} value={o.id}>{o.code} — {o.title}</option>)}</Select><Button type="submit" variant="secondary">Ajouter</Button></form>
      </Panel>
    </>
  );
}
