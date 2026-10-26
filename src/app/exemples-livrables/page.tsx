import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { Badge, ButtonLink, Container, Notice } from "@/components/ui";
import { deliverableExamples } from "@/lib/deliverable-examples";
import { breadcrumbLd, itemListLd } from "@/lib/seo";
import { getCatalog } from "@/lib/catalog/load";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Exemples de livrables des formations IA",
  description: "Six exemples de livrables (prompts évalués, analyse de risques, modèle de coûts, plan d'adoption, playbook de contrats, reporting) avec leurs critères de relecture. Données fictives.",
  alternates: { canonical: "/exemples-livrables" },
};

export default async function DeliverableExamplesPage() {
  const catalog = await getCatalog();
  const slug = (code: string) => catalog.courses.find((c) => c.code === code)?.slug;
  return (
    <Container className="max-w-4xl py-12">
      <JsonLd data={breadcrumbLd([{ name: "Accueil", path: "/" }, { name: "Exemples de livrables", path: "/exemples-livrables" }])} />
      <JsonLd data={itemListLd("Exemples de livrables", deliverableExamples.map((d) => ({ name: d.title, path: `/exemples-livrables#${d.code}` })))} />
      <h1 className="text-4xl font-bold sm:text-5xl">À quoi ressemble un livrable ?</h1>
      <p className="mt-3 max-w-2xl text-muted">À la fin de chaque module, vous remettez un livrable que le formateur relit avec une grille de critères. Voici six exemples de ce qui est attendu : un extrait et les critères de relecture.</p>
      <div className="mt-6"><Notice tone="info" title="Exemples fictifs">Les organisations, les chiffres et les cas sont inventés pour illustrer la forme attendue. Ce ne sont pas des résultats réels ni des modèles à recopier.</Notice></div>
      <div className="mt-10 flex flex-col gap-10">
        {deliverableExamples.map((d) => (
          <article key={d.code} id={d.code} className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3"><Badge tone="accent">{d.code}</Badge>{slug(d.code) && <Link href={`/formations/${slug(d.code)}`} className="text-sm font-semibold text-accent hover:underline">Voir le module</Link>}</div>
            <h2 className="mt-2 text-2xl font-semibold">{d.title}</h2>
            <p className="mt-1 text-muted">{d.context}</p>
            <dl className="mt-5 flex flex-col gap-3 rounded-xl bg-bg p-5">{d.excerpt.map((e) => <div key={e.label}><dt className="text-sm font-semibold">{e.label}</dt><dd className="text-[15px] text-muted">{e.value}</dd></div>)}</dl>
            <h3 className="mt-5 font-semibold">Critères de relecture</h3>
            <ul className="mt-2 list-disc pl-6 text-[15px] text-muted">{d.criteria.map((c) => <li key={c}>{c}</li>)}</ul>
          </article>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3"><ButtonLink href="/formations">Voir les modules</ButtonLink><ButtonLink href="/apercu-plateforme" variant="secondary">Essayer la démonstration</ButtonLink></div>
    </Container>
  );
}
