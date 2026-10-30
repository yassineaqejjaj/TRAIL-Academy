import type { Metadata } from "next";
import { PathCard } from "@/components/cards";
import { Badge, Container, Notice } from "@/components/ui";
import { availability, coursesOfPath, isProfessionPath } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog/load";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbLd, itemListLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Parcours de formation IA",
  description: "Product Manager Augmenté, AI Product Manager et AI Mastery : comparez les modules inclus dans chaque parcours.",
  alternates: { canonical: "/parcours" },
};

export const revalidate = 60;

export default async function PathsPage() {
  const catalog = await getCatalog();
  const { courses, learningPaths } = catalog;
  const productPaths = learningPaths.filter((p) => p.kind === "path" && !isProfessionPath(p, catalog));
  const professionPaths = learningPaths.filter((p) => isProfessionPath(p, catalog));
  const bundles = learningPaths.filter((p) => p.kind === "bundle");
  return (
    <Container className="py-12">
      <JsonLd data={itemListLd("Parcours de formation IA", learningPaths.map((p) => ({ name: p.title, path: "/parcours" })))} />
      <JsonLd data={breadcrumbLd([{ name: "Accueil", path: "/" }, { name: "Parcours", path: "/parcours" }])} />
      <h1 className="display-light text-4xl sm:text-5xl">Parcours de formation</h1>
      <p className="mt-3 max-w-2xl text-muted">Des parcours pour les métiers du produit et de l'IA, des parcours pour les fonctions marketing, RH, juridique et finance, et un accès complet. Chaque parcours est vendu au même prix ; vous choisissez selon votre métier.</p>
      <h2 className="mt-10 text-2xl font-semibold">Produit et IA</h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">{productPaths.map((p) => <PathCard key={p.slug} path={p} catalog={catalog} />)}</div>
      <h2 className="mt-14 text-2xl font-semibold">Par métier : marketing, RH, juridique, finance</h2>
      <p className="mt-2 max-w-2xl text-muted">Les fondations de l'IA, puis trois modules écrits pour votre fonction, avec des ateliers no-code et un livrable relu par le formateur.</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">{professionPaths.map((p) => <PathCard key={p.slug} path={p} catalog={catalog} />)}</div>
      <h2 className="mt-14 text-2xl font-semibold">L'accès complet</h2>
      <div className="mt-4 grid gap-6">{bundles.map((p) => <PathCard key={p.slug} path={p} catalog={catalog} />)}</div>

      <h2 className="mt-16 text-2xl font-semibold">Comparaison des modules inclus</h2>
      <div className="mt-4 overflow-x-auto glass rounded-2xl">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">Modules inclus dans chaque parcours</caption>
          <thead className="bg-surface-2 text-left"><tr>
            <th scope="col" className="p-3">Module</th><th scope="col" className="p-3">Statut</th>
            {learningPaths.map((p) => <th key={p.slug} scope="col" className="p-3">{p.title}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-border">
            {courses.map((c) => (
              <tr key={c.code}>
                <th scope="row" className="p-3 text-left font-medium"><span className="mr-2 font-mono text-xs text-muted">{c.code}</span>{c.title}</th>
                <td className="p-3"><Badge tone={availability(c, catalog).tone}>{availability(c, catalog).label}</Badge></td>
                {learningPaths.map((p) => {
                  const inPath = coursesOfPath(p, catalog).some((x) => x.code === c.code);
                  return <td key={p.slug} className="p-3">{inPath ? <><span aria-hidden>✓</span><span className="sr-only">Inclus</span></> : <><span aria-hidden className="text-muted">—</span><span className="sr-only">Non inclus</span></>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6"><Notice title="Disponibilité">Un parcours ne peut être acheté qu'une fois tous ses modules publiés et validés. Aucune pré-vente n'est ouverte à ce jour : en attendant, lisez une leçon gratuite par module ou demandez à être prévenu.</Notice></div>
    </Container>
  );
}
