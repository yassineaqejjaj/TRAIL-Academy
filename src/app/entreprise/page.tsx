import type { Metadata } from "next";
import { Card, Container, Section } from "@/components/ui";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Formation IA pour les entreprises", description: "Formations sur mesure, licences pour vos équipes et ateliers privés : demandez un devis.", alternates: { canonical: "/entreprise" } };

export default function EnterprisePage() {
  return (
    <>
      <Container className="py-12">
        <h1 className="text-4xl font-bold sm:text-5xl">Former vos équipes à l'IA</h1>
        <p className="mt-3 max-w-2xl text-muted">Chaque besoin est différent : taille de l'équipe, métiers, niveau de départ, calendrier. Nous construisons une proposition sur devis, à partir des mêmes modules et parcours que les particuliers.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card><h2 className="font-semibold">Licences d'équipe</h2><p className="mt-1 text-sm text-muted">Un accès pour chaque collaborateur, sur les modules ou parcours de votre choix.</p></Card>
          <Card><h2 className="font-semibold">Programme sur mesure</h2><p className="mt-1 text-sm text-muted">Un parcours composé pour vos cas d'usage et votre niveau de maturité.</p></Card>
          <Card><h2 className="font-semibold">Ateliers privés</h2><p className="mt-1 text-sm text-muted">Une journée de travail pratique avec votre équipe, sur vos propres sujets.</p></Card>
        </div>
        <p className="mt-6 max-w-2xl text-sm text-muted">Le suivi de progression par organisation (invitations, sièges, rapports) est en préparation : il sera confirmé dans la proposition.</p>
      </Container>
      <Section title="Demande de devis" intro="Décrivez votre besoin. Nous vous répondons par e-mail.">
        <ContactForm />
      </Section>
    </>
  );
}
