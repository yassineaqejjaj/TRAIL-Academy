import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { ReadAloud } from "@/components/read-aloud";
import { Badge, ButtonLink, Container } from "@/components/ui";
import { getCourse, isPurchasable } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog/load";
import { getPreview } from "@/lib/catalog/syllabus";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const course = getCourse(slug, await getCatalog());
  const preview = await getPreview(slug);
  if (!course || !preview) return {};
  return { title: `${preview.title} — aperçu gratuit de ${course.title}`, description: `Lisez gratuitement une leçon du module ${course.title}.`, alternates: { canonical: `/formations/${slug}/apercu` } };
}

/** A real lesson of the module, free and without an account: the best answer to "is this worth buying?". */
export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const catalog = await getCatalog();
  const course = getCourse(slug, catalog);
  const preview = await getPreview(slug);
  if (!course || !preview) notFound();
  const purchasable = isPurchasable(course, catalog);
  return (
    <Container className="max-w-3xl py-12">
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted"><Link href="/formations" className="hover:text-fg">Formations</Link> / <Link href={`/formations/${slug}`} className="hover:text-fg">{course.title}</Link> / <span aria-current="page">Aperçu</span></nav>
      <div className="mt-6 flex flex-wrap items-center gap-2"><Badge tone="accent">Aperçu gratuit</Badge><span className="text-sm text-muted">{course.code} · {preview.chapter}</span></div>
      <h1 className="mt-3 text-4xl font-bold">{preview.title}</h1>
      <div className="mt-6"><ReadAloud targetId="preview-text" /></div>
      <article id="preview-text" className="mt-6 rounded-xl border border-border bg-surface p-6 sm:p-8"><Markdown>{preview.body_md}</Markdown></article>
      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-surface-2 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-semibold">Cette leçon est l'une des leçons du module {course.title}.</p><p className="text-sm text-muted">Le module complet comprend vidéos, exercices, quiz et un livrable relu par le formateur.</p></div>
        <ButtonLink href={purchasable ? `/achat/${slug}` : `/formations/${slug}`}>{purchasable ? "Acheter ce module" : "Voir le module"}</ButtonLink>
      </div>
    </Container>
  );
}
