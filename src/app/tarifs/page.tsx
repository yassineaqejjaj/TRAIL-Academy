import type { Metadata } from "next";
import Link from "next/link";
import { Container, Notice } from "@/components/ui";
import { OfferCards } from "@/components/offers";
import { getCatalog } from "@/lib/catalog/load";

export const metadata: Metadata = { title: "Tarifs", description: "Trois offres : un module, un parcours, ou l'accès complet AI Mastery.", alternates: { canonical: "/tarifs" } };
export const revalidate = 60;

const faq = [
  ["Que veut dire « accès 12 ou 18 mois » ?", "Vous suivez les contenus quand vous voulez pendant cette durée. Votre progression et vos attestations sont conservées ensuite."],
  ["Puis-je passer d'un module à un parcours ?", "Oui, mais le prix d'un parcours n'est pas réduit des modules déjà achetés : il les contient et prolonge leur accès. Si vous visez plusieurs modules, comparez avec le parcours ou AI Mastery avant d'acheter."],
  ["Les taxes sont-elles incluses ?", "Les prix affichés sont TTC. Le calcul des taxes applicables est effectué au paiement."],
  ["Et pour mon équipe ?", "Pour plusieurs personnes, une formation sur mesure ou un atelier, demandez un devis : la page Entreprises vous répond sous quelques jours."],
] as const;

export default async function PricingPage() {
  const catalog = await getCatalog();
  const anyOpen = catalog.openCourses.length > 0;
  return (
    <Container className="py-12">
      <h1 className="text-4xl font-bold sm:text-5xl">Tarifs</h1>
      <p className="mt-3 max-w-2xl text-muted">Trois offres, sans option cachée. Les prix sont TTC ; les taxes applicables sont calculées au paiement.</p>
      <div className="mt-10"><OfferCards catalog={catalog} /></div>
      <div className="mt-8">
        <Notice title={anyOpen ? "Disponibilité" : "Achat bientôt ouvert"}>
          Un module ou un parcours n'est proposé à l'achat qu'une fois son contenu publié et validé.{anyOpen ? " Consultez la fiche de chaque module pour sa disponibilité." : " Aucun module n'est ouvert à la vente à ce jour."}
        </Notice>
      </div>
      <h2 className="mt-16 text-2xl font-bold">Questions sur les tarifs</h2>
      <div className="mt-4 border-b border-border">
        {faq.map(([q, a]) => <details key={q} className="border-t border-border py-4"><summary className="flex min-h-11 items-center font-semibold">{q}</summary><p className="mt-2 text-muted">{a}</p></details>)}
      </div>
      <p className="mt-8 text-muted">Équipes et entreprises : <Link className="font-semibold text-accent hover:underline" href="/entreprise">demander un devis</Link>.</p>
    </Container>
  );
}
