import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Badge, Notice } from "@/components/ui";
import { adminPage } from "@/lib/admin/ctx";
import { getPlayback } from "@/lib/video";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aperçu — administration", robots: { index: false } };

export default async function AdminPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await adminPage(async (q) => {
    const course = await q.one<{ id: string; title: string }>("select id, title from courses where id = $1", [id]);
    if (!course) return null;
    return {
      course,
      chapters: await q<{ id: string; title: string; position: number }>("select id, title, position from chapters where course_id = $1 order by position", [id]),
      lessons: await q<{ id: string; chapter_id: string; title: string; position: number; content_status: string; body_md: string | null; video_provider: string | null; video_asset_id: string | null }>(
        "select id, chapter_id, title, position, content_status, body_md, video_provider, video_asset_id from lessons where course_id = $1 order by position", [id]),
    };
  });
  if (!data) notFound();
  const { course, chapters, lessons } = data;
  const playbacks = new Map(await Promise.all(lessons.map(async (l) => [l.id, await getPlayback(l)] as const)));

  return (
    <>
      <p className="text-sm text-muted"><Link href={`/admin/cours/${id}`} className="hover:text-fg">{course.title}</Link> / Aperçu</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Aperçu du parcours apprenant</h1>
      <div className="mt-4"><Notice tone="info" title="Lecture seule">Vous voyez aussi les brouillons, signalés ci-dessous. Aucune progression n'est enregistrée.</Notice></div>
      {chapters.map((ch) => (
        <section key={ch.id} className="mt-8"><h2 className="text-xl font-semibold">{ch.position}. {ch.title}</h2>
          {lessons.filter((l) => l.chapter_id === ch.id).map((l) => {
            const playback = playbacks.get(l.id)!;
            return (
              <article key={l.id} className="mt-4 rounded-xl border border-border bg-surface p-5">
                <div className="flex items-center gap-2"><h3 className="font-medium">{l.title}</h3>{l.content_status === "draft" && <Badge tone="warn">Brouillon — invisible pour les apprenants</Badge>}</div>
                {playback.kind === "hls" ? <p className="mt-2 text-sm text-muted">Vidéo : lecture signée disponible.</p>
                  : l.video_asset_id ? <p className="mt-2 text-sm text-muted">Vidéo associée, mais la passerelle vidéo n&apos;est pas configurée dans cet environnement.</p>
                  : <p className="mt-2 text-sm text-muted">Pas de vidéo.</p>}
                {l.body_md && <div className="mt-3"><Markdown>{l.body_md}</Markdown></div>}
              </article>);
          })}
        </section>))}
      {!chapters.length && <p className="mt-6 text-muted">Aucun contenu pour l&apos;instant.</p>}
    </>
  );
}
