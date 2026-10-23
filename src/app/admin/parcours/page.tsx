import type { Metadata } from "next";
import { Badge, Button } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { ActionButton, Field, Flash, Input, Panel, Select } from "../ui";
import { addPathCourse, createPath, movePathCourse, removePathCourse, updatePath } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Parcours — administration", robots: { index: false } };

export default async function AdminPaths({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await adminDb();
  const [{ data: paths }, { data: pc }, { data: courses }] = await Promise.all([
    db.from("learning_paths").select("id, slug, title, tagline, audience, access_months, is_bundle").order("title"),
    db.from("learning_path_courses").select("path_id, course_id, position").order("position"),
    db.from("courses").select("id, code, title, status").order("position"),
  ]);
  const byId = new Map((courses ?? []).map((c) => [c.id, c]));

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Parcours</h1>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>
      {(paths ?? []).map((p) => {
        const list = (pc ?? []).filter((x) => x.path_id === p.id);
        return (
          <Panel key={p.id} title={p.title} actions={<Badge tone={p.is_bundle ? "accent" : "neutral"}>{p.is_bundle ? "Accès complet" : "Parcours"}</Badge>}>
            <form action={updatePath.bind(null, p.id)} className="grid gap-3 sm:grid-cols-2">
              <Field label="Titre"><Input name="title" defaultValue={p.title} required /></Field>
              <Field label="Durée d'accès (mois)"><Input name="accessMonths" type="number" min={1} max={60} defaultValue={p.access_months} required /></Field>
              <Field label="Accroche"><Input name="tagline" defaultValue={p.tagline ?? ""} /></Field>
              <Field label="Public visé"><Input name="audience" defaultValue={p.audience ?? ""} /></Field>
              <div className="sm:col-span-2"><Button type="submit" variant="secondary">Enregistrer</Button></div>
            </form>
            <h3 className="mt-6 text-sm font-semibold">Modules ({list.length}) dans l'ordre recommandé</h3>
            <ol className="mt-2 divide-y divide-border rounded-lg border border-border text-sm">
              {list.map((x, i) => { const c = byId.get(x.course_id); return (
                <li key={x.course_id} className="flex flex-wrap items-center gap-3 p-3"><span className="w-6 text-muted">{i + 1}.</span><span className="font-mono text-muted">{c?.code}</span><span>{c?.title}</span>
                  {c?.status !== "published" && <Badge tone="warn">Non publié</Badge>}
                  <span className="ml-auto flex gap-1"><ActionButton action={movePathCourse.bind(null, p.id, x.course_id, "up")} label="Monter" variant="ghost" /><ActionButton action={movePathCourse.bind(null, p.id, x.course_id, "down")} label="Descendre" variant="ghost" /><ActionButton action={removePathCourse.bind(null, p.id, x.course_id)} label="Retirer" variant="ghost" /></span></li>); })}
            </ol>
            <form action={addPathCourse.bind(null, p.id)} className="mt-3 flex gap-2"><Select name="courseId" aria-label="Module à ajouter">{(courses ?? []).filter((c) => !list.some((x) => x.course_id === c.id)).map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}</Select><Button type="submit" variant="secondary">Ajouter</Button></form>
          </Panel>);
      })}
      <Panel title="Créer un parcours">
        <form action={createPath} className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><Field label="Titre"><Input name="title" required /></Field></div>
          <Field label="Slug"><Input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></Field>
          <Field label="Accès (mois)"><Input name="accessMonths" type="number" defaultValue={18} min={1} required /></Field>
          <Field label="Type"><Select name="kind"><option value="path">Parcours</option><option value="bundle">Accès complet</option></Select></Field>
          <div className="sm:col-span-4"><Button type="submit" variant="accent">Créer (offre fermée jusqu'à publication et prix)</Button></div>
        </form>
      </Panel>
    </>
  );
}
