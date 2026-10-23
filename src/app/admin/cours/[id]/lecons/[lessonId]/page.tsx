import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { Check, Field, Flash, Input, Panel, Select, Textarea } from "../../../../ui";
import { deleteResource, updateLesson, uploadResource, uploadSubtitle } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leçon — administration", robots: { index: false } };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default async function AdminLesson({ params, searchParams }: { params: Promise<{ id: string; lessonId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id, lessonId } = await params;
  const sp = await searchParams;
  const { db } = await adminDb();
  const { data: l } = await db.from("lessons").select("*").eq("id", lessonId).eq("course_id", id).maybeSingle();
  if (!l) notFound();
  const { data: resources } = await db.from("lesson_resources").select("id, title, size_bytes").eq("lesson_id", lessonId);
  const chapters = ((l.video_chapters ?? []) as { title: string; start_seconds: number }[]).map((c) => `${fmt(c.start_seconds)} ${c.title}`).join("\n");
  const tracks = (l.subtitle_tracks ?? []) as { lang: string; label: string }[];

  return (
    <>
      <p className="text-sm text-muted"><Link href={`/admin/cours/${id}/contenu`} className="hover:text-fg">Chapitres et leçons</Link> / {l.title}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{l.title}</h1>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      <Panel title="Contenu">
        <form action={updateLesson.bind(null, id, lessonId)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre"><Input name="title" defaultValue={l.title} required /></Field>
          <Field label="Type"><Select name="kind" defaultValue={l.kind}><option value="video">Vidéo</option><option value="reading">Lecture</option><option value="exercise">Exercice</option><option value="demo">Démonstration</option></Select></Field>
          <Field label="Statut"><Select name="contentStatus" defaultValue={l.content_status}><option value="draft">Brouillon (invisible)</option><option value="published">Publiée</option></Select></Field>
          <div className="grid gap-2 self-end"><Check name="required" label="Obligatoire pour la complétion" defaultChecked={l.required} /><Check name="isFreePreview" label="Aperçu gratuit" defaultChecked={l.is_free_preview} /></div>
          <Field label="Fournisseur vidéo"><Select name="videoProvider" defaultValue={l.video_provider ?? ""}><option value="">Aucune vidéo</option><option value="mux">Mux</option><option value="cloudflare_stream">Cloudflare Stream (lecture non encore prise en charge)</option></Select></Field>
          <Field label="Identifiant de lecture (playback ID)" hint="Téléversez la vidéo chez le fournisseur avec une politique de lecture signée, puis collez l'identifiant. Jamais d'URL publique permanente."><Input name="videoAssetId" defaultValue={l.video_asset_id ?? ""} /></Field>
          <Field label="Durée (secondes)"><Input name="durationSeconds" type="number" min={0} defaultValue={l.duration_seconds ?? ""} /></Field>
          <Field label="Chapitres vidéo" hint="Une ligne par chapitre : « 2:30 Titre »"><Textarea name="chapters" defaultValue={chapters} rows={3} /></Field>
          <div className="sm:col-span-2"><Field label="Texte de la leçon (Markdown)"><Textarea name="bodyMd" defaultValue={l.body_md ?? ""} rows={10} /></Field></div>
          <div className="sm:col-span-2"><Field label="Transcription"><Textarea name="transcript" defaultValue={l.transcript ?? ""} rows={6} /></Field></div>
          <div className="sm:col-span-2"><Button type="submit" variant="accent">Enregistrer</Button></div>
        </form>
      </Panel>

      <Panel title="Ressources téléchargeables">
        <ul className="space-y-2 text-sm">{(resources ?? []).map((r) => (
          <li key={r.id} className="flex items-center gap-3"><span>{r.title} <span className="text-muted">({Math.ceil(r.size_bytes / 1024)} Ko)</span></span>
            <form action={deleteResource.bind(null, id, lessonId)}><input type="hidden" name="resourceId" value={r.id} /><Button type="submit" variant="ghost" className="px-2 py-1">Supprimer</Button></form></li>))}
          {!resources?.length && <li className="text-muted">Aucune ressource.</li>}</ul>
        <form action={uploadResource.bind(null, id, lessonId)} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Titre"><Input name="title" required /></Field>
          <Field label="Fichier (50 Mo max.)"><Input name="file" type="file" required accept=".pdf,.docx,.pptx,.xlsx,.csv,.json,.txt,.md,.png,.jpg,.jpeg,.zip" /></Field>
          <div className="sm:col-span-2"><Button type="submit" variant="secondary">Téléverser</Button></div>
        </form>
        <p className="mt-2 text-xs text-muted">Stockage privé : les apprenants reçoivent un lien signé de 60 secondes après vérification de leur accès.</p>
      </Panel>

      <Panel title="Sous-titres">
        <p className="text-sm text-muted">{tracks.length ? tracks.map((t) => `${t.label} (${t.lang})`).join(", ") : "Aucune piste."}</p>
        <form action={uploadSubtitle.bind(null, id, lessonId)} className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Langue (fr, en…)"><Input name="lang" required pattern="[a-z]{2}(-[A-Z]{2})?" defaultValue="fr" /></Field>
          <Field label="Libellé"><Input name="label" required defaultValue="Français" /></Field>
          <Field label="Fichier .vtt"><Input name="file" type="file" required accept=".vtt" /></Field>
          <div className="sm:col-span-3"><Button type="submit" variant="secondary">Ajouter la piste</Button></div>
        </form>
      </Panel>
    </>
  );
}
