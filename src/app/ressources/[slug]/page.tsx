import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { InterestForm } from "@/components/interest-form";
import { ReadAloud } from "@/components/read-aloud";
import { Badge, Card, Container } from "@/components/ui";
import { getCatalog } from "@/lib/catalog/load";
import { getPost } from "@/lib/cms";
import { site } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};
  const title = post.seo_title ?? post.title;
  const description = post.seo_description ?? post.excerpt ?? undefined;
  return { title, description, alternates: { canonical: `/ressources/${post.slug}` }, openGraph: { type: "article", title, description, url: `/ressources/${post.slug}`, publishedTime: post.published_at ?? undefined } };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const catalog = await getCatalog();
  const related = catalog.courses.filter((c) => c.id !== undefined && post.related_course_ids.includes(c.id));
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: post.title, description: post.excerpt ?? undefined, datePublished: post.published_at ?? undefined, author: { "@type": "Organization", name: site.name }, mainEntityOfPage: `${site.url}/ressources/${post.slug}` };
  return (
    <Container className="max-w-3xl py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted"><Link href="/" className="hover:text-fg">Accueil</Link> / <Link href="/ressources" className="hover:text-fg">Ressources</Link> / <span aria-current="page">{post.title}</span></nav>
      {post.category && <div className="mt-6"><Badge tone="accent">{post.category}</Badge></div>}
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{post.title}</h1>
      {post.published_at && <p className="mt-2 text-sm text-muted">{new Date(post.published_at).toLocaleDateString("fr-FR")}</p>}
      <div className="mt-6"><ReadAloud targetId="article-text" label="Écouter cet article" /></div>
      <div id="article-text" className="mt-6"><Markdown>{post.body_md}</Markdown></div>
      <section className="mt-12 rounded-2xl border border-border bg-surface-2 p-6" aria-label="Lettre d'information"><h2 className="text-lg font-semibold">Recevoir les prochains articles</h2><p className="mb-4 mt-1 text-sm text-muted">Un message quand un nouvel article ou un nouveau module est publié. Désinscription à tout moment.</p><InterestForm kind="newsletter" label="Adresse e-mail" submitLabel="Je m'abonne" /></section>
      {related.length > 0 && (
        <section className="mt-12" aria-label="Formations liées"><h2 className="text-xl font-semibold">Formations liées</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">{related.map((c) => <Card key={c.code}><Link className="font-semibold hover:underline" href={`/formations/${c.slug}`}>{c.code} · {c.title}</Link></Card>)}</div></section>
      )}
    </Container>
  );
}
