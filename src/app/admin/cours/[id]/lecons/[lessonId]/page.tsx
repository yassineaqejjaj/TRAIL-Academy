import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui";
import { adminPage } from "@/lib/admin/ctx";
import { Check, Field, Flash, Input, Panel, Select, Textarea } from "../../../../ui";
import { deleteResource, updateLesson } from "../../../actions";
import { retryVideo } from "../../../video-actions";
import { LessonUploader } from "./lesson-uploader";
import { VideoUploader } from "./video-uploader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leçon — administration", robots: { index: false } };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default async function AdminLesson({ params, searchParams }: { params: Promise<{ id: string; lessonId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id, lessonId } = await params;
  const sp = await searchParams;
  const data = await adminPage(async (q) => {
    const l = await q.one<Record<string, unknown> & { id: string; title: string; kind: string; content_status: string; required: boolean; is_free_preview: boolean; video_provider: string | null; video_asset_id: string | null; duration_seconds: number | null; body_md: string | null; transcript: string | null; video_chapters: { title: string; start_seconds: number }[]; subtitle_tracks: { lang: string; label: string }[] }>(
      "select * from lessons where id = $1 and course_id = $2", [lessonId, id]);
    if (!l) return null;
    return {
      l,
      resources: await q<{ id: string; title: string; size_bytes: number }>("select id, title, size_bytes from lesson_resources where lesson_id = $1", [lessonId]),
      videos: await q<{ id: string; status: string; error: string | null; created_at: string; duration_seconds: number | null }>("select id, status, error, created_at, duration_seconds from video_assets where lesson_id = $1 order by created_at desc limit 5", [lessonId]),
    };
  });
  if (!data) notFound();
  const { l, resources, videos } = data;
  const videoLabel: Record<string, string> = { uploaded: "En attente d'encodage", processing: "Encodage en cours", ready: "Prête", failed: "Échec" };
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
          <Field label="Source vidéo"><Select name="videoProvider" defaultValue={l.video_provider ?? ""}><option value="">Aucune vidéo</option><option value="hls">HLS auto-hébergé (passerelle de streaming)</option></Select></Field>
          <Field label="Identifiant du média" hint="Identifiant du dossier video/<id>/ du bucket, produit par scripts/encode-hls.sh. Jamais d'URL publique permanente."><Input name="videoAssetId" defaultValue={l.video_asset_id ?? ""} /></Field>
          <Field label="Durée (secondes)"><Input name="durationSeconds" type="number" min={0} defaultValue={l.duration_seconds ?? ""} /></Field>
          <Field label="Chapitres vidéo" hint="Une ligne par chapitre : « 2:30 Titre »"><Textarea name="chapters" defaultValue={chapters} rows={3} /></Field>
          <div className="sm:col-span-2"><Field label="Texte de la leçon (Markdown)"><Textarea name="bodyMd" defaultValue={l.body_md ?? ""} rows={10} /></Field></div>
          <div className="sm:col-span-2"><Field label="Transcription"><Textarea name="transcript" defaultValue={l.transcript ?? ""} rows={6} /></Field></div>
          <div className="sm:col-span-2"><Button type="submit" variant="accent">Enregistrer</Button></div>
        </form>
      </Panel>

      <Panel title="Vidéo">
        <p className="text-sm text-muted">{l.video_provider === "hls" && l.video_asset_id ? `Vidéo attachée à la leçon (média ${l.video_asset_id}).` : "Aucune vidéo attachée à cette leçon."}</p>
        <ul className="mt-3 space-y-2 text-sm">{videos.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-3">
            <span>{new Date(v.created_at).toLocaleString("fr-FR")} — <strong>{videoLabel[v.status] ?? v.status}</strong>{v.status === "ready" && v.duration_seconds ? ` (${fmt(v.duration_seconds)})` : ""}{v.error ? <span className="text-danger"> : {v.error}</span> : null}</span>
            {v.status === "failed" && <form action={retryVideo.bind(null, id, lessonId)}><input type="hidden" name="assetId" value={v.id} /><Button type="submit" variant="ghost" className="px-2 py-1">Relancer</Button></form>}
          </li>))}
          {!videos.length && <li className="text-muted">Aucune vidéo envoyée.</li>}</ul>
        <VideoUploader courseId={id} lessonId={lessonId} />
        <p className="mt-2 text-xs text-muted">La vidéo est encodée en HLS adaptatif par le service video-worker, puis rattachée à la leçon automatiquement. Un nouvel envoi remplace la vidéo actuelle une fois l'encodage terminé.</p>
      </Panel>

      <Panel title="Ressources téléchargeables">
        <ul className="space-y-2 text-sm">{resources.map((r) => (
          <li key={r.id} className="flex items-center gap-3"><span>{r.title} <span className="text-muted">({Math.ceil(r.size_bytes / 1024)} Ko)</span></span>
            <form action={deleteResource.bind(null, id, lessonId)}><input type="hidden" name="resourceId" value={r.id} /><Button type="submit" variant="ghost" className="px-2 py-1">Supprimer</Button></form></li>))}
          {!resources.length && <li className="text-muted">Aucune ressource.</li>}</ul>
        <LessonUploader lessonId={lessonId} kind="resource" />
        <p className="mt-2 text-xs text-muted">Stockage privé (S3) : les apprenants reçoivent un lien signé de 60 secondes après vérification de leur accès.</p>
      </Panel>

      <Panel title="Sous-titres">
        <p className="text-sm text-muted">{tracks.length ? tracks.map((t) => `${t.label} (${t.lang})`).join(", ") : "Aucune piste."}</p>
        <LessonUploader lessonId={lessonId} kind="subtitle" />
      </Panel>
    </>
  );
}
