import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, Container, EmptyState } from "@/components/ui";
import { InterestForm } from "@/components/interest-form";
import { getPosts } from "@/lib/cms";
import { JsonLd } from "@/components/json-ld";
import { abs, breadcrumbLd } from "@/lib/seo";

export const metadata: Metadata = { title: "Ressources", description: "Articles et guides pratiques sur l'IA au travail.", alternates: { canonical: "/ressources", types: { "application/rss+xml": "/ressources/feed.xml" } } };
export const revalidate = 60;

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ categorie?: string }> }) {
  const { categorie } = await searchParams;
  const all = await getPosts();
  const categories = Array.from(new Set(all.map((p) => p.category).filter(Boolean))) as string[];
  const posts = categorie ? all.filter((p) => p.category === categorie) : all;
  return (
    <Container className="py-12">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Blog", name: "TRAIL Academy — Ressources", url: abs("/ressources"), inLanguage: "fr", blogPost: all.slice(0, 20).map((p) => ({ "@type": "BlogPosting", headline: p.title, url: abs(`/ressources/${p.slug}`), datePublished: p.published_at ?? undefined })) }} />
      <JsonLd data={breadcrumbLd([{ name: "Accueil", path: "/" }, { name: "Ressources", path: "/ressources" }])} />
      <h1 className="text-4xl font-semibold tracking-tight">Ressources</h1>
      <p className="mt-3 max-w-2xl text-muted">Articles et guides pratiques, rédigés par le formateur.</p>
      {categories.length > 0 && (
        <nav aria-label="Catégories" className="mt-6 flex flex-wrap gap-2 text-sm">
          <Link href="/ressources" className={`rounded-full border px-4 py-2 ${!categorie ? "border-primary bg-primary text-primary-fg" : "border-border"}`}>Toutes</Link>
          {categories.map((c) => <Link key={c} href={`/ressources?categorie=${encodeURIComponent(c)}`} className={`rounded-full border px-4 py-2 ${categorie === c ? "border-primary bg-primary text-primary-fg" : "border-border"}`}>{c}</Link>)}
        </nav>
      )}
      {posts.length === 0 ? <div className="mt-8"><EmptyState title="Aucun article publié pour l'instant">Les premiers articles seront publiés depuis l'espace d'administration.</EmptyState></div> : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">{posts.map((p) => (
          <Card key={p.id} className="relative transition-colors hover:border-accent">
            {p.category && <Badge tone="accent">{p.category}</Badge>}
            <h2 className="mt-3 text-xl font-semibold tracking-tight"><Link href={`/ressources/${p.slug}`} className="after:absolute after:inset-0">{p.title}</Link></h2>
            {p.excerpt && <p className="mt-2 text-sm text-muted">{p.excerpt}</p>}
            {p.published_at && <p className="mt-3 text-xs text-muted">{new Date(p.published_at).toLocaleDateString("fr-FR")}</p>}
          </Card>))}</div>
      )}
      <div className="mt-16 max-w-md rounded-2xl border border-border bg-surface p-8"><h2 className="mb-4 text-xl font-bold">Newsletter</h2><InterestForm kind="newsletter" label="Recevoir les nouveaux articles" submitLabel="Je m'abonne" /></div>
    </Container>
  );
}
