import type { Metadata } from "next";
import { Card, Container, Section } from "@/components/ui";
import { formatEuro } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog/load";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Formation IA pour les entreprises", description: "Licences d'équipe, formations sur mesure et ateliers privés pour vos collaborateurs.", alternates: { canonical: "/entreprise" } };

export const revalidate = 60;

export default async function EnterprisePage() {
  const { offers } = await getCatalog();
  const packs = offers.filter((o) => o.kind === "enterprise");
  return (
    <>
      <Container className="py-12">
        <h1 className="text-4xl font-semibold tracking-tight">Former vos équipes à l'IA</h1>
        <p className="mt-3 max-w-2xl text-muted">Licences pour vos collaborateurs, suivi de progression autorisé, formations sur mesure et ateliers privés.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card><h2 className="font-semibold">Gestion des licences</h2><p className="mt-1 text-sm text-muted">Invitez vos apprenants, attribuez un parcours, suivez les places disponibles.</p></Card>
          <Card><h2 className="font-semibold">Suivi de progression</h2><p className="mt-1 text-sm text-muted">Rapports de progression limités aux apprenants de votre organisation.</p></Card>
          <Card><h2 className="font-semibold">Sur mesure</h2><p className="mt-1 text-sm text-muted">Formation adaptée à vos cas d'usage ; devis sur demande.</p></Card>
        </div>
      </Container>
      <Section title="Offres">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packs.map((o) => (
            <Card key={o.slug}><p className="text-sm text-muted">{o.title}</p>
              <p className="mt-2 text-2xl font-semibold">{o.amountCents == null ? "Sur devis" : <>{o.priceFrom && <span className="mr-1 text-sm font-normal text-muted">dès</span>}{formatEuro(o.amountCents)}<span className="ml-1 text-xs font-normal text-muted">HT</span></>}</p>
              {o.note && <p className="mt-1 text-sm text-muted">{o.note}</p>}</Card>
          ))}
        </div>
      </Section>
      <Section title="Demande de devis" intro="Décrivez votre besoin. Nous vous répondons par e-mail.">
        <ContactForm />
      </Section>
    </>
  );
}
