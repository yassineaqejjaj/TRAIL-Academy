"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Button, Notice } from "@/components/ui";
import { addBookmark, addNote, deleteBookmark, deleteNote } from "./actions";

export interface WorkspaceProps {
  lessonId: string;
  playback: { url: string } | { unavailable: "no_video" | "provider_not_configured" | "provider_unsupported" };
  tracks: { lang: string; label: string; url: string }[];
  chapters: { title: string; start_seconds: number }[];
  startAt: number;
  completed: boolean;
  transcript: string | null;
  bodyText: string | null;
  prevHref: string | null;
  nextHref: string | null;
  resources: { id: string; title: string; size_bytes: number }[];
  notes: { id: string; body: string; position_seconds: number | null }[];
  bookmarks: { id: string; label: string | null; position_seconds: number }[];
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
type Tab = "Notes" | "Ressources" | "Transcription";

export function LessonWorkspace(p: WorkspaceProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [done, setDone] = useState(p.completed);
  const [saveError, setSaveError] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState<Tab>("Notes");
  const [pending, startTransition] = useTransition();
  const url = "url" in p.playback ? p.playback.url : null;

  const save = useCallback(async (completed = false): Promise<boolean> => {
    const v = videoRef.current;
    const position = v ? Math.floor(v.currentTime) : 0;
    try {
      const res = await fetch("/api/progress", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId: p.lessonId, position, completed }) });
      if (!res.ok) throw new Error(String(res.status));
      setSaveError(false);
      if (completed) { setDone(true); router.refresh(); }
      return true;
    } catch { setSaveError(true); return false; }
  }, [p.lessonId, router]);

  // HLS: native on Safari, hls.js elsewhere. The signed URL is short-lived and never stored.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !url) return;
    let cleanup = () => {};
    if (v.canPlayType("application/vnd.apple.mpegurl")) v.src = url;
    else import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) return;
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(v);
      cleanup = () => hls.destroy();
    });
    return () => cleanup();
  }, [url]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const id = setInterval(() => { if (!v.paused) void save(); }, 10_000);
    const onHide = () => { if (document.visibilityState === "hidden") void save(); };
    document.addEventListener("visibilitychange", onHide);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onHide); };
  }, [save]);

  const seek = (t: number) => { const v = videoRef.current; if (v) { v.currentTime = t; void v.play().catch(() => {}); } };
  const setRate = (s: number) => { setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s; };
  const run = (fn: () => Promise<unknown>) => startTransition(async () => { await fn(); router.refresh(); });
  const finishAndContinue = async () => { const ok = await save(true); if (ok && p.nextHref) router.push(p.nextHref); };

  const tabs: Tab[] = ["Notes", "Ressources", "Transcription"];
  return (
    <div className="flex flex-col gap-6">
      {url ? (
        <div className="overflow-hidden rounded-xl bg-[#0b1f3a] text-white">
          <video ref={videoRef} controls playsInline preload="metadata" className="aspect-video w-full bg-black"
            onLoadedMetadata={(e) => { const v = e.currentTarget; if (p.startAt > 5 && p.startAt < v.duration - 5) v.currentTime = p.startAt; }}
            onPause={() => void save()} onEnded={() => void save(true)}>
            {p.tracks.map((t) => <track key={t.lang} kind="subtitles" srcLang={t.lang} label={t.label} src={t.url} />)}
          </video>
          <div className="flex flex-wrap items-center gap-2 px-5 py-3" role="group" aria-label="Vitesse de lecture">
            <span className="mr-2 text-sm text-[#b7c4d8]">Vitesse</span>
            {SPEEDS.map((s) => <button key={s} type="button" aria-pressed={speed === s} aria-label={`Vitesse ${s}×`} onClick={() => setRate(s)} className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm font-semibold ${speed === s ? "border-[#4fd1d9] bg-[#4fd1d9] text-[#0b1f3a]" : "border-[#5b7391] text-white"}`}>{s}×</button>)}
            {p.tracks.length > 0 && <span className="ml-auto text-sm text-[#b7c4d8]">Sous-titres : menu du lecteur</span>}
          </div>
        </div>
      ) : p.bodyText ? (
        <article className="rounded-xl border border-border bg-surface p-6 sm:p-8"><Markdown>{p.bodyText}</Markdown></article>
      ) : (
        <Notice title="Contenu vidéo indisponible">{"unavailable" in p.playback && p.playback.unavailable === "provider_not_configured" ? "Le fournisseur vidéo n'est pas configuré dans cet environnement." : "Aucune vidéo n'a encore été ajoutée à cette leçon."}</Notice>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        {p.prevHref ? <Link href={p.prevHref} className="inline-flex items-center rounded-lg border border-fg px-5 py-3.5 text-[15px] font-semibold">Leçon précédente</Link> : <span />}
        <div className="flex flex-wrap items-center gap-3">
          {done && <span className="text-sm font-semibold text-success" role="status">Leçon terminée</span>}
          {p.nextHref ? <Button type="button" onClick={finishAndContinue}>{done ? "Leçon suivante" : "Marquer comme terminée et continuer"}</Button>
            : !done && <Button type="button" onClick={() => void save(true)}>Marquer comme terminée</Button>}
        </div>
      </div>
      {saveError && <p role="alert" className="text-sm text-danger">Progression non enregistrée. Vérifiez votre connexion ; nous réessayons automatiquement.</p>}

      {p.chapters.length > 0 && (
        <section aria-label="Chapitres vidéo"><h2 className="mb-2 text-base font-semibold">Chapitres</h2>
          <ul className="flex flex-wrap gap-2">{p.chapters.map((c) => <li key={c.start_seconds}><button type="button" onClick={() => seek(c.start_seconds)} className="min-h-11 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">{fmt(c.start_seconds)} · {c.title}</button></li>)}</ul></section>
      )}

      <div>
        <div role="tablist" aria-label="Contenu de la leçon" className="flex flex-wrap gap-2 border-b border-border">
          {tabs.map((t) => <button key={t} type="button" role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls={`panel-${t}`} onClick={() => setTab(t)} className={`min-h-12 border-b-[3px] px-4 text-[15px] font-semibold ${tab === t ? "border-accent text-fg" : "border-transparent text-muted"}`}>{t}</button>)}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="py-6">
          {tab === "Notes" && (
            <div>
              <form onSubmit={(e) => { e.preventDefault(); const body = noteText.trim(); if (!body) return; run(async () => { const r = await addNote({ lessonId: p.lessonId, body, position: videoRef.current ? Math.floor(videoRef.current.currentTime) : undefined }); if (r.ok) setNoteText(""); }); }}>
                <label htmlFor="note" className="mb-2 block font-semibold">Nouvelle note{url ? " (horodatée)" : ""}</label>
                <textarea id="note" value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} maxLength={4000} placeholder="Écrivez une note privée…" className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base" />
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button type="submit" disabled={pending || !noteText.trim()}>Enregistrer la note</Button>
                  {url && <Button type="button" variant="secondary" onClick={() => run(() => addBookmark({ lessonId: p.lessonId, position: Math.floor(videoRef.current?.currentTime ?? 0) }))}>Ajouter un signet</Button>}
                </div>
              </form>
              <ul className="mt-6 space-y-3">{p.notes.map((n) => (
                <li key={n.id} className="rounded-xl border border-border bg-surface p-4 text-[15px]"><p className="whitespace-pre-wrap">{n.body}</p>
                  <div className="mt-2 flex items-center gap-3 text-sm text-muted">{n.position_seconds != null && url && <button type="button" onClick={() => seek(n.position_seconds!)} className="font-semibold text-accent hover:underline">à {fmt(n.position_seconds)}</button>}
                    <button type="button" onClick={() => run(() => deleteNote(n.id))} className="ml-auto hover:text-danger">Supprimer</button></div></li>))}</ul>
              {p.bookmarks.length > 0 && <div className="mt-6"><h3 className="mb-2 font-semibold">Signets</h3>
                <ul className="space-y-1 text-sm">{p.bookmarks.map((b) => (
                  <li key={b.id} className="flex items-center gap-3"><button type="button" onClick={() => seek(b.position_seconds)} className="min-h-11 font-semibold text-accent hover:underline">{fmt(b.position_seconds)}</button><span className="text-muted">{b.label ?? ""}</span>
                    <button type="button" aria-label="Supprimer le signet" onClick={() => run(() => deleteBookmark(b.id))} className="ml-auto grid min-h-11 min-w-11 place-items-center text-muted hover:text-danger"><Trash2 size={16} aria-hidden /></button></li>))}</ul></div>}
            </div>
          )}
          {tab === "Ressources" && (p.resources.length ? (
            <ul className="space-y-2 text-[15px]">{p.resources.map((r) => <li key={r.id}><a className="font-semibold text-accent hover:underline" href={`/api/resources/${r.id}`}>{r.title}</a> <span className="text-muted">({Math.ceil(r.size_bytes / 1024)} Ko)</span></li>)}</ul>
          ) : <p className="rounded-xl border border-dashed border-muted p-6 text-muted">Aucune ressource téléchargeable pour cette leçon.</p>)}
          {tab === "Transcription" && (p.transcript ? <p className="whitespace-pre-wrap text-[15px] text-muted">{p.transcript}</p> : <p className="rounded-xl border border-dashed border-muted p-6 text-muted">Pas de transcription pour cette leçon.</p>)}
        </div>
      </div>
    </div>
  );
}
