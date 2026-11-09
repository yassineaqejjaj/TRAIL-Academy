import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InterestForm } from "@/components/interest-form";
import { JsonLd } from "@/components/json-ld";
import { Badge, Container, Faq, kickerCls } from "@/components/ui";
import { getCatalog } from "@/lib/catalog/load";
import { getProgramme, programmes } from "@/lib/programmes";
import { abs, breadcrumbLd, faqLd } from "@/lib/seo";

export const revalidate = 60;

export function generateStaticParams() {
  return programmes.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getProgramme((await params).slug);
  if (!p) return {};
  return {
    title: `${p.title} – ${p.subtitle} : formation en ${p.durationWeeks} semaines`,
    description: `${p.tagline} ${p.onSiteDays.min} à ${p.onSiteDays.max} jours sur site chez un client PME par semaine. Places limitées.`,
    alternates: { canonical: `/programmes/${p.slug}` },
  };
}

export default async function ProgrammePage({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProgramme((await params).slug);
  if (!p) notFound();
  const catalog = await getCatalog();
  const refs = p.referenceCourseCodes.map((code) => catalog.courses.find((c) => c.code === code)).filter((c) => c != null);
  const onSite = `${p.onSiteDays.min} à ${p.onSiteDays.max} jours par semaine`;
  const faq = [
    { q: "À qui s'adresse cette formation ?", a: `${p.audience}.` },
    { q: "Que signifie « contribution en PME » ?", a: `Pendant les ${p.durationWeeks} semaines, vous travaillez sur un besoin réel d'une PME, ${onSite} sur site chez le client. Vous livrez une solution IA utile à l'entreprise, et c'est ce travail qui sert de projet de formation.` },
    { q: "Quels sont les prérequis ?", a: `${p.prerequisites.join(" ; ")}. Ils ne sont pas enseignés dans le programme.` },
    { q: "Pourquoi les places sont-elles limitées ?", a: p.seatsNote },
    { q: "Combien ça coûte et quand démarre la prochaine promotion ?", a: `Le tarif est de ${p.priceNote}. La prochaine promotion démarre ${p.datesNote.charAt(0).toLowerCase() + p.datesNote.slice(1)}. Laissez votre e-mail pour être prévenu dès l'ouverture des inscriptions, sans engagement.` },
    { q: "Obtient-on une certification ?", a: "Non : il ne s'agit pas d'une certification officielle. Les livrables sont relus par le formateur." },
  ];
  return (
    <Container className="py-12">
      <JsonLd data={breadcrumbLd([{ name: "Accueil", path: "/" }, { name: "Parcours", path: "/parcours" }, { name: p.title, path: `/programmes/${p.slug}` }])} />
      <JsonLd data={faqLd(faq)} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Course", "@id": `${abs(`/programmes/${p.slug}`)}#course`, name: `${p.title} – ${p.subtitle}`, description: p.tagline, url: abs(`/programmes/${p.slug}`), inLanguage: "fr", provider: { "@id": abs("/#organization") }, isAccessibleForFree: false, offers: { "@type": "Offer", price: (p.priceCents / 100).toFixed(2), priceCurrency: "EUR", url: abs(`/programmes/${p.slug}`) }, timeRequired: `P${p.durationWeeks}W`, coursePrerequisites: p.prerequisites }} />
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted"><Link href="/" className="hover:text-fg">Accueil</Link> / <Link href="/parcours" className="hover:text-fg">Parcours</Link> / <span aria-current="page">{p.title}</span></nav>
      <div className="mt-8 flex flex-wrap items-start gap-12">
        <div className="min-w-0 flex-[999_1_560px]">
          <p className={`${kickerCls} mb-3 text-accent`}>Programme en cohorte · {p.durationWeeks} semaines · mission en {p.clientType}</p>
          <h1 className="display-light text-4xl sm:text-5xl">{p.title}<span className="block text-accent">{p.subtitle}</span></h1>
          <p className="mt-4 max-w-2xl text-xl text-muted [text-wrap:pretty]">{p.tagline}</p>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Points clés">
            <li><Badge tone="accent">{p.durationWeeks} semaines</Badge></li>
            <li><Badge tone="accent">{onSite} sur site</Badge></li>
            <li><Badge tone="accent">Mission réelle en {p.clientType}</Badge></li>
            {p.limitedSeats && <li><Badge tone="warn">Places limitées</Badge></li>}
          </ul>
          <p className="mt-6 max-w-2xl text-muted"><strong className="text-fg">Pour qui :</strong> {p.audience}.</p>

          <h2 className="mt-12 text-2xl font-semibold">Prérequis</h2>
          <ul className="mt-3 flex flex-col gap-2 text-[17px]">{p.prerequisites.map((x) => <li key={x}>✓ {x}</li>)}</ul>

          <h2 className="mt-12 text-2xl font-semibold">Ce que vous saurez faire</h2>
          <ul className="mt-3 flex flex-col gap-2 text-[17px]">{p.outcomes.map((x) => <li key={x}>✓ {x}</li>)}</ul>

          <h2 className="mt-12 text-2xl font-semibold">Les {p.durationWeeks} semaines</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {p.weeks.map((w) => (
              <li key={w.week} className="glass rounded-2xl p-5">
                <span className="text-sm text-muted">Semaine {w.week}</span>
                <h3 className="mt-1 text-lg font-semibold">{w.title}</h3>
                <p className="mt-1 text-[15px] text-muted">{w.focus}</p>
                <p className="mt-2 text-sm"><strong>Sur site :</strong> {w.onSite}</p>
                <p className="mt-1 text-sm"><strong>Livrable :</strong> {w.deliverable}</p>
              </li>
            ))}
          </ol>

          {refs.length > 0 && (
            <>
              <h2 className="mt-12 text-2xl font-semibold">Modules de référence</h2>
              <p className="mt-2 max-w-2xl text-muted">Le catalogue sert de base de ressources pendant le programme.</p>
              <ul className="mt-3 flex flex-col gap-1.5">{refs.map((c) => <li key={c.code}><Link href={`/formations/${c.slug}`} className="font-medium text-accent hover:underline">{c.code} · {c.title}</Link></li>)}</ul>
            </>
          )}

          <h2 className="mt-12 text-2xl font-semibold">Questions fréquentes</h2>
          <div className="mt-4"><Faq items={faq} /></div>
        </div>
        <aside aria-label="Inscription" className="flex min-w-0 max-w-[420px] flex-[1_1_340px] flex-col gap-4 glass rounded-3xl p-8 lg:sticky lg:top-6">
          <Badge tone="warn">Places limitées</Badge>
          <p className="text-[15px] text-muted">{p.seatsNote}</p>
          <dl className="text-[15px]">
            <div className="flex justify-between gap-4 border-b border-border py-2"><dt className="text-muted">Durée</dt><dd className="font-semibold">{p.durationWeeks} semaines</dd></div>
            <div className="flex justify-between gap-4 border-b border-border py-2"><dt className="text-muted">Sur site</dt><dd className="font-semibold">{onSite}</dd></div>
            <div className="flex justify-between gap-4 border-b border-border py-2"><dt className="text-muted">Tarif</dt><dd className="font-semibold">{p.priceNote}</dd></div>
            <div className="flex justify-between gap-4 py-2"><dt className="text-muted">Prochaine promotion</dt><dd className="text-right font-semibold">{p.datesNote}</dd></div>
          </dl>
          <InterestForm kind="course_launch" courseSlug={p.slug} label="Adresse e-mail (sans paiement)" submitLabel="Me préinscrire" />
        </aside>
      </div>
    </Container>
  );
}
