import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { ButtonLink, Container } from "@/components/ui";
import { breadcrumbLd } from "@/lib/seo";
import { Demo } from "./demo";

export const metadata: Metadata = {
  title: "Aperçu interactif de la plateforme",
  description: "Parcourez un module de démonstration : leçon, quiz corrigé, atelier no-code, livrable et progression. Sans inscription.",
  alternates: { canonical: "/apercu-plateforme" },
};

export default function PlatformPreviewPage() {
  return (
    <Container className="max-w-3xl py-12">
      <JsonLd data={breadcrumbLd([{ name: "Accueil", path: "/" }, { name: "Aperçu de la plateforme", path: "/apercu-plateforme" }])} />
      <h1 className="text-4xl font-bold sm:text-5xl">Voir la plateforme avant d'acheter</h1>
      <p className="mt-3 text-muted">Essayez le déroulé d'un module en quatre étapes : lire, répondre au quiz, faire l'atelier, déposer le livrable. Le contenu est fictif et rien n'est enregistré. Pour lire une vraie leçon, choisissez un module : chacun propose une <Link href="/formations" className="font-semibold text-accent hover:underline">leçon gratuite</Link>.</p>
      <div className="mt-8"><Demo /></div>
      <div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="/exemples-livrables">Voir des exemples de livrables</ButtonLink><ButtonLink href="/evaluation" variant="secondary">Évaluer mon niveau</ButtonLink></div>
    </Container>
  );
}
