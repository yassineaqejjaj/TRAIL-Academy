import type { Metadata } from "next";
import { PathCard } from "@/components/cards";
import { Badge, Container, Notice } from "@/components/ui";
import { coursesOfPath, statusLabel } from "@/lib/catalog";
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
  return (
    <Container className="py-12">
      <JsonLd data={itemListLd("Parcours de formation IA", learningPaths.map((p) => ({ name: p.title, path: "/parcours" })))} />
      <JsonLd data={breadcrumbLd([{ name: "Accueil", path: "/" }, { name: "Parcours", path: "/parcours" }])} />
      <h1 className="text-4xl font-semibold tracking-tight">Parcours de formation</h1>
      <p className="mt-3 max-w-2xl text-muted">Deux parcours professionnels et un accès complet. Un module déjà inclus dans un pack acheté n'est jamais à repayer pendant la durée d'accès.</p>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">{learningPaths.map((p) => <PathCard key={p.slug} path={p} catalog={catalog} />)}</div>

      <h2 className="mt-16 text-2xl font-semibold">Comparaison des modules inclus</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
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
                <td className="p-3"><Badge tone={c.status === "published" ? "accent" : "warn"}>{statusLabel[c.status]}</Badge></td>
                {learningPaths.map((p) => {
                  const inPath = coursesOfPath(p, catalog).some((x) => x.code === c.code);
                  return <td key={p.slug} className="p-3">{inPath ? <><span aria-hidden>✓</span><span className="sr-only">Inclus</span></> : <><span aria-hidden className="text-muted">—</span><span className="sr-only">Non inclus</span></>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6"><Notice title="Disponibilité">Les parcours ne peuvent être achetés qu'une fois leurs modules publiés et validés. Aucune pré-vente n'est ouverte à ce jour.</Notice></div>
    </Container>
  );
}
