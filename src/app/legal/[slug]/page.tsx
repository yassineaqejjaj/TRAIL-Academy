import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Container, Notice } from "@/components/ui";
import { getSection } from "@/lib/cms";
import { legalPages } from "@/lib/site";

export function generateStaticParams() {
  return legalPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = legalPages.find((p) => p.slug === slug);
  return page ? { title: page.title, robots: { index: false } } : {};
}

const sections: Record<string, string[]> = {
  "mentions-legales": ["Éditeur du site (raison sociale, forme juridique, capital, SIREN/SIRET)", "Directeur de la publication", "Hébergeur", "Contact"],
  confidentialite: ["Responsable de traitement", "Données collectées et finalités", "Bases légales", "Durées de conservation", "Destinataires et sous-traitants", "Droits des personnes (accès, export, suppression)", "Contact DPO / exercice des droits"],
  cookies: ["Cookies strictement nécessaires", "Mesure d'audience (soumise au consentement)", "Gestion du consentement"],
  "conditions-de-vente": ["Objet et description des formations", "Prix et taxes", "Commande et paiement", "Droit de rétractation et exceptions applicables", "Accès et durée", "Obligations liées à la formation professionnelle", "Médiation de la consommation"],
  "conditions-utilisation": ["Accès au compte", "Licence d'usage des contenus", "Comportements interdits", "Responsabilité"],
  accessibilite: ["État de conformité (référentiel RGAA / WCAG 2.2 AA)", "Contenus non accessibles connus", "Contact et voies de recours"],
  remboursement: ["Délai et conditions de rétractation", "Modalités de remboursement", "Accès après remboursement"],
};

export const revalidate = 60;

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = legalPages.find((p) => p.slug === slug);
  if (!page) notFound();
  const custom = await getSection(`legal-${slug}`, "corps");
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-4xl font-semibold tracking-tight">{page.title}</h1>
      <div className="mt-6"><Notice title="Modèle — validation juridique requise avant lancement">Cette page est un squelette à compléter. Son contenu doit être rédigé et validé par un professionnel du droit avant toute ouverture à la vente.</Notice></div>
      {custom?.body_md ? <div className="mt-8"><Markdown>{custom.body_md}</Markdown></div> : (
        <ol className="mt-8 list-decimal space-y-3 pl-5">
          {sections[page.slug].map((s) => <li key={s}><span className="font-medium">{s}</span><span className="block text-sm text-muted">[À compléter]</span></li>)}
        </ol>
      )}
    </Container>
  );
}
