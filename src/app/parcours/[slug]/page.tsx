import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InterestForm } from "@/components/interest-form";
import { JsonLd } from "@/components/json-ld";
import { Badge, ButtonLink, Container, Faq, kickerCls } from "@/components/ui";
import { availability, coursesOfPath, difficultyLabel, formatEuro, getPath, isPathPurchasable, totalHours } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog/load";
import { masteryBenefits, masteryNote } from "@/lib/faq-data";
import { abs, breadcrumbLd, faqLd, itemListLd } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const catalog = await getCatalog();
  const path = getPath((await params).slug, catalog);
  if (!path) return {};
  const n = coursesOfPath(path, catalog).length;
  return {
    title: `${path.title} : parcours de formation IA`,
    description: `${path.tagline} ${n} modules, ateliers pratiques et livrables relus par le formateur. Pour : ${path.audience}.`,
    alternates: { canonical: `/parcours/${path.slug}` },
  };
}

export default async function PathPage({ params }: { params: Promise<{ slug: string }> }) {
  const catalog = await getCatalog();
  const path = getPath((await params).slug, catalog);
  if (!path) notFound();
  const list = coursesOfPath(path, catalog);
  const offer = catalog.offers.find((o) => o.slug === path.slug);
  const purchasable = isPathPurchasable(path, catalog) && offer?.amountCents != null;
  const pathsTotal = catalog.offers.filter((o) => o.kind === "path").reduce((s, o) => s + (o.amountCents ?? 0), 0);
  const unit = list.reduce((s, c) => s + (catalog.coursePrices[c.slug] ?? 0), 0);
  const faq = [
    { q: `À qui s'adresse le parcours ${path.title} ?`, a: `${path.audience}. ${path.tagline}` },
    { q: "Combien de temps dure l'accès ?", a: `${path.accessMonths} mois à partir de l'achat. La progression et les attestations restent consultables ensuite.` },
    { q: "Faut-il savoir coder ?", a: "Non. Chaque module comprend trois ateliers sur des outils no-code et low-code, et le livrable peut se faire sans écrire de code." },
    { q: "Comment suis-je évalué ?", a: "Par des quiz corrigés automatiquement et un livrable pratique relu par le formateur. Vous obtenez une attestation de réussite privée et vérifiable, qui n'est pas une certification officielle." },
    { q: "Puis-je acheter dès maintenant ?", a: purchasable ? "Oui, depuis cette page." : "Pas encore : l'achat s'ouvre quand tous les modules du parcours sont publiés et validés. Une leçon gratuite est lisible dans chaque module publié, et vous pouvez demander à être prévenu." },
  ];
  return (
    <Container className="py-12">
      <JsonLd data={breadcrumbLd([{ name: "Accueil", path: "/" }, { name: "Parcours", path: "/parcours" }, { name: path.title, path: `/parcours/${path.slug}` }])} />
      <JsonLd data={itemListLd(`Modules du parcours ${path.title}`, list.map((c) => ({ name: `${c.code} ${c.title}`, path: `/formations/${c.slug}` })))} />
      <JsonLd data={faqLd(faq)} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Course", "@id": `${abs(`/parcours/${path.slug}`)}#course`, name: path.title, description: path.tagline, url: abs(`/parcours/${path.slug}`), inLanguage: "fr", provider: { "@id": abs("/#organization") }, isAccessibleForFree: false, hasPart: list.map((c) => ({ "@type": "Course", name: c.title, url: abs(`/formations/${c.slug}`) })) }} />
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted"><Link href="/" className="hover:text-fg">Accueil</Link> / <Link href="/parcours" className="hover:text-fg">Parcours</Link> / <span aria-current="page">{path.title}</span></nav>
      <div className="mt-8 flex flex-wrap items-start gap-12">
        <div className="min-w-0 flex-[999_1_560px]">
          <p className={`${kickerCls} mb-3 text-accent`}>{list.length} modules · ~{totalHours(list)} h · accès {path.accessMonths} mois</p>
          <h1 className="text-4xl font-bold sm:text-5xl">{path.title}</h1>
          <p className="mt-4 max-w-2xl text-xl text-muted [text-wrap:pretty]">{path.tagline}</p>
          <p className="mt-4 max-w-2xl text-muted"><strong className="text-fg">Pour qui :</strong> {path.audience}.</p>
          {path.kind === "bundle" && (
            <section className="mt-10 rounded-2xl border-2 border-accent bg-surface p-6" aria-label="Ce qu'AI Mastery apporte">
              <h2 className="text-2xl font-semibold">Ce qu'AI Mastery apporte en plus d'un parcours</h2>
              <ul className="mt-3 flex flex-col gap-2 text-[17px]">{masteryBenefits(list.length, catalog.learningPaths.filter((p) => p.kind === "path").length).map((b) => <li key={b}>✓ {b}</li>)}</ul>
              <p className="mt-4 text-sm text-muted">{masteryNote}</p>
              {offer?.amountCents != null && <p className="mt-2 text-sm text-muted">Pour comparaison : les parcours achetés séparément coûteraient {formatEuro(pathsTotal)}, et les {list.length} modules à l'unité {formatEuro(unit)}.</p>}
            </section>
          )}
          <h2 className="mt-12 text-2xl font-semibold">Les modules, dans l'ordre recommandé</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {list.map((c, i) => {
              const a = availability(c, catalog);
              return (
                <li key={c.code} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm text-muted">{i + 1}. {c.code} · {difficultyLabel[c.difficulty]} · {c.durationHours} h</span><Badge tone={a.tone}>{a.label}</Badge></div>
                  <h3 className="mt-1 text-lg font-semibold"><Link href={`/formations/${c.slug}`} className="hover:underline">{c.title}</Link></h3>
                  <p className="mt-1 text-[15px] text-muted">{c.summary}</p>
                  {c.deliverable && <p className="mt-2 text-sm"><strong>Livrable :</strong> {c.deliverable}</p>}
                </li>
              );
            })}
          </ol>
          <h2 className="mt-12 text-2xl font-semibold">Questions fréquentes</h2>
          <div className="mt-4"><Faq items={faq} /></div>
        </div>
        <aside aria-label="Offre" className="flex min-w-0 max-w-[420px] flex-[1_1_340px] flex-col gap-4 rounded-2xl border border-border bg-surface p-8 lg:sticky lg:top-6">
          {offer?.amountCents != null && <div><div className="flex items-baseline gap-2"><span className="font-display text-4xl font-bold">{formatEuro(offer.amountCents)}</span><span className="text-sm text-muted">TTC</span></div>{unit > 0 && unit > offer.amountCents && <div className="text-sm text-muted">au lieu de {formatEuro(unit)} à l'unité</div>}</div>}
          {purchasable ? <ButtonLink href={`/achat/${path.slug}`} className="min-h-[52px]">Acheter ce parcours</ButtonLink> : (
            <>
              <Badge tone="warn">Inscriptions bientôt ouvertes</Badge>
              <p className="text-[15px] text-muted">L'achat s'ouvre quand tous les modules sont publiés et validés. Indiquez votre e-mail pour être prévenu.</p>
              <InterestForm kind="course_launch" courseSlug={path.slug} label="Adresse e-mail (sans paiement)" submitLabel="Me prévenir" />
            </>
          )}
          <ButtonLink href="/conseiller" variant="secondary">Comparer avec le conseiller</ButtonLink>
        </aside>
      </div>
    </Container>
  );
}
