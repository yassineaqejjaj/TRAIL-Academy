import type { Metadata } from "next";
import { Card, Container, Notice } from "@/components/ui";
import { formatEuro } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog/load";

export const metadata: Metadata = { title: "Tarifs", description: "Modules individuels, parcours, AI Mastery et offres entreprises.", alternates: { canonical: "/tarifs" } };

export const revalidate = 60;

export default async function PricingPage() {
  const { offers, courses } = await getCatalog();
  const anyPurchasable = courses.some((c) => c.status === "published");
  const b2c = offers.filter((o) => o.kind !== "enterprise" && o.amountCents != null);
  const b2b = offers.filter((o) => o.kind === "enterprise");
  return (
    <Container className="py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Tarifs</h1>
      <p className="mt-3 max-w-2xl text-muted">Les prix sont indiqués pour information. Les taxes applicables sont calculées au paiement.</p>

      <h2 className="mt-10 text-2xl font-semibold">Particuliers</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {b2c.map((o) => (
          <Card key={o.slug} className={o.slug === "ai-mastery" ? "border-accent" : ""}>
            <p className="text-sm text-muted">{o.title}</p>
            <p className="mt-2 text-3xl font-semibold">{formatEuro(o.amountCents!)}<span className="ml-1 text-xs font-normal text-muted">TTC</span></p>
            <p className="mt-1 text-sm text-muted">Accès {o.accessMonths} mois</p>
          </Card>
        ))}
      </div>
      <div className="mt-4"><Notice title={anyPurchasable ? "Disponibilité" : "Achat indisponible pour le moment"}>Un module ou un parcours n'est proposé à l'achat qu'une fois son contenu publié et validé.{anyPurchasable ? " Consultez la fiche de chaque module pour sa disponibilité." : " Aucun module n'est ouvert à la vente à ce jour."}</Notice></div>

      <h2 className="mt-12 text-2xl font-semibold">Entreprises</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {b2b.map((o) => (
          <Card key={o.slug}>
            <p className="text-sm text-muted">{o.title}</p>
            <p className="mt-2 text-2xl font-semibold">{o.amountCents == null ? "Sur devis" : <>{o.slug === "ateliers-prives" && <span className="mr-1 text-sm font-normal text-muted">dès</span>}{formatEuro(o.amountCents)}<span className="ml-1 text-xs font-normal text-muted">HT</span></>}</p>
            {o.note && <p className="mt-1 text-sm text-muted">{o.note}</p>}
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted"><a className="font-semibold text-accent hover:underline" href="/entreprise">Demander un devis</a></p>
    </Container>
  );
}
