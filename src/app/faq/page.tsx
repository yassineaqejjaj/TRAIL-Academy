import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { ButtonLink, Container, Faq } from "@/components/ui";
import { generalFaq } from "@/lib/faq-data";
import { breadcrumbLd, faqLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Questions fréquentes sur les formations IA",
  description: "Prix, durée d'accès, prérequis, attestation, sessions en direct, paiement : les réponses aux questions les plus posées sur TRAIL Academy.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <Container className="max-w-3xl py-12">
      <JsonLd data={faqLd(generalFaq)} />
      <JsonLd data={breadcrumbLd([{ name: "Accueil", path: "/" }, { name: "Questions fréquentes", path: "/faq" }])} />
      <h1 className="text-4xl font-bold sm:text-5xl">Questions fréquentes</h1>
      <p className="mt-3 text-muted">Les réponses courtes aux questions posées avant de s'inscrire. Une autre question ? Passez par la page Entreprises ou le conseiller de parcours.</p>
      <div className="mt-8"><Faq items={generalFaq} /></div>
      <div className="mt-10 flex flex-wrap gap-3"><ButtonLink href="/conseiller">Trouver mon parcours</ButtonLink><ButtonLink href="/formations" variant="secondary">Voir les formations</ButtonLink></div>
    </Container>
  );
}
