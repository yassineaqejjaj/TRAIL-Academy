import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { ActionButton, Check, Field, Flash, Input, Panel, Select } from "../../../ui";
import { addChapter, addLesson, deleteChapter, deleteLesson, moveChapter, moveLesson, renameChapter } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contenu — administration", robots: { index: false } };

export default async function AdminContent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { db } = await adminDb();
  const { data: course } = await db.from("courses").select("id, title").eq("id", id).maybeSingle();
  if (!course) notFound();
  const [{ data: chapters }, { data: lessons }] = await Promise.all([
    db.from("chapters").select("id, title, position").eq("course_id", id).order("position"),
    db.from("lessons").select("id, chapter_id, title, kind, position, content_status, is_free_preview, required, video_asset_id").eq("course_id", id).order("position"),
  ]);

  return (
    <>
      <p className="text-sm text-muted"><Link href={`/admin/cours/${id}`} className="hover:text-fg">{course.title}</Link> / Chapitres et leçons</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Chapitres et leçons</h1>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      {(chapters ?? []).map((ch) => {
        const ls = (lessons ?? []).filter((l) => l.chapter_id === ch.id);
        return (
          <Panel key={ch.id} title={`${ch.position}. ${ch.title}`} actions={
            <div className="flex flex-wrap gap-2">
              <ActionButton action={moveChapter.bind(null, id, ch.id, "up")} label="Monter" /><ActionButton action={moveChapter.bind(null, id, ch.id, "down")} label="Descendre" />
              <ActionButton action={deleteChapter.bind(null, id, ch.id)} label="Supprimer le chapitre" variant="ghost" />
            </div>}>
            <form action={renameChapter.bind(null, id, ch.id)} className="flex gap-2"><Input name="title" defaultValue={ch.title} aria-label="Titre du chapitre" /><Button type="submit" variant="secondary">Renommer</Button></form>
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {ls.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <span className="text-muted">{l.position}.</span>
                  <Link href={`/admin/cours/${id}/lecons/${l.id}`} className="font-medium hover:underline">{l.title}</Link>
                  <Badge tone={l.content_status === "published" ? "accent" : "warn"}>{l.content_status === "published" ? "Publiée" : "Brouillon"}</Badge>
                  {l.is_free_preview && <Badge>Aperçu gratuit</Badge>}
                  {!l.required && <Badge>Facultative</Badge>}
                  <span className="ml-auto flex gap-1">
                    <ActionButton action={moveLesson.bind(null, id, ch.id, l.id, "up")} label="Monter" variant="ghost" /><ActionButton action={moveLesson.bind(null, id, ch.id, l.id, "down")} label="Descendre" variant="ghost" />
                    <ActionButton action={deleteLesson.bind(null, id, l.id)} label="Supprimer" variant="ghost" />
                  </span>
                </li>))}
              {ls.length === 0 && <li className="p-3 text-sm text-muted">Aucune leçon.</li>}
            </ul>
            <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-accent">Ajouter une leçon</summary>
              <form action={addLesson.bind(null, id, ch.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Titre"><Input name="title" required /></Field>
                <Field label="Type"><Select name="kind"><option value="video">Vidéo</option><option value="reading">Lecture</option><option value="exercise">Exercice</option><option value="demo">Démonstration</option></Select></Field>
                <Field label="Statut"><Select name="contentStatus" defaultValue="draft"><option value="draft">Brouillon</option><option value="published">Publiée</option></Select></Field>
                <div className="grid gap-2 self-end"><Check name="required" label="Obligatoire pour la complétion" defaultChecked /><Check name="isFreePreview" label="Aperçu gratuit" /></div>
                <input type="hidden" name="chapters" value="" />
                <div className="sm:col-span-2"><Button type="submit" variant="secondary">Créer puis compléter</Button></div>
              </form></details>
          </Panel>);
      })}

      <Panel title="Nouveau chapitre">
        <form action={addChapter.bind(null, id)} className="flex gap-2"><Input name="title" required aria-label="Titre du chapitre" placeholder="Titre du chapitre" /><Button type="submit" variant="accent">Ajouter</Button></form>
      </Panel>
    </>
  );
}
