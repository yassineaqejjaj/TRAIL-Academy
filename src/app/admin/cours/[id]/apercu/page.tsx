import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Badge, Notice } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { getPlayback } from "@/lib/video";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aperçu — administration", robots: { index: false } };

export default async function AdminPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await adminDb();
  const { data: course } = await db.from("courses").select("id, title").eq("id", id).maybeSingle();
  if (!course) notFound();
  const [{ data: chapters }, { data: lessons }] = await Promise.all([
    db.from("chapters").select("id, title, position").eq("course_id", id).order("position"),
    db.from("lessons").select("id, chapter_id, title, position, content_status, body_md, video_provider, video_asset_id, kind").eq("course_id", id).order("position"),
  ]);

  return (
    <>
      <p className="text-sm text-muted"><Link href={`/admin/cours/${id}`} className="hover:text-fg">{course.title}</Link> / Aperçu</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Aperçu du parcours apprenant</h1>
      <div className="mt-4"><Notice tone="info" title="Lecture seule">Vous voyez aussi les brouillons, signalés ci-dessous. Aucune progression n'est enregistrée.</Notice></div>
      {(chapters ?? []).map((ch) => (
        <section key={ch.id} className="mt-8"><h2 className="text-xl font-semibold">{ch.position}. {ch.title}</h2>
          {(lessons ?? []).filter((l) => l.chapter_id === ch.id).map((l) => {
            const playback = getPlayback(l);
            return (
              <article key={l.id} className="mt-4 rounded-xl border border-border bg-surface p-5">
                <div className="flex items-center gap-2"><h3 className="font-medium">{l.title}</h3>{l.content_status === "draft" && <Badge tone="warn">Brouillon — invisible pour les apprenants</Badge>}</div>
                {playback.kind === "hls" ? <p className="mt-2 text-sm text-muted">Vidéo : lecture signée disponible ({l.video_provider}).</p>
                  : l.video_asset_id ? <p className="mt-2 text-sm text-muted">Vidéo associée, mais le fournisseur n&apos;est pas configuré dans cet environnement.</p>
                  : <p className="mt-2 text-sm text-muted">Pas de vidéo.</p>}
                {l.body_md && <div className="mt-3"><Markdown>{l.body_md}</Markdown></div>}
              </article>);
          })}
        </section>))}
      {!chapters?.length && <p className="mt-6 text-muted">Aucun contenu pour l&apos;instant.</p>}
    </>
  );
}
