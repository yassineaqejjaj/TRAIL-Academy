import type { Metadata } from "next";
import { Card, Container, Section } from "@/components/ui";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Formation IA pour les entreprises", description: "Formations sur mesure, licences pour vos équipes et ateliers privés : demandez un devis.", alternates: { canonical: "/entreprise" } };

const programmes = [
  { name: "AI Foundations", target: "Équipes métier", promise: "Comprendre et utiliser les outils IA sur des tâches réelles, en sécurité.",
    modules: "IA générative, Prompt Engineering, Context Engineering, Responsible AI, puis les modules de la fonction (marketing, RH, juridique ou finance).", duration: "Environ 30 à 40 h de travail par personne.",
    prereq: "Aucun prérequis technique.", deliverables: "Un guide d'usage de l'IA pour l'équipe et un livrable par module, relu par le formateur.", example: "Une équipe RH qui structure son processus de recrutement assisté, avec registre des risques." },
  { name: "AI Builders", target: "Produit, tech et data", promise: "Concevoir, prototyper et évaluer des solutions IA fiables.",
    modules: "Context Engineering, RAG, Agentic AI, LLM Safety & Security, AI Evaluation & Observability, Vibe Coding.", duration: "Environ 40 à 50 h de travail par personne.",
    prereq: "Aisance technique ; Prompt Engineering recommandé.", deliverables: "Un prototype RAG évalué, un agent outillé, un rapport de red teaming, une suite d'évaluation.", example: "Une équipe produit qui bâtit un assistant sur sa base documentaire avec jeu d'évaluation." },
  { name: "AI Leaders", target: "Managers et responsables", promise: "Définir les priorités IA, mesurer la valeur et piloter l'adoption.",
    modules: "AI Product Strategy, AI Economics & FinOps, AI Adoption & Change Management, Responsible AI, AI Product Delivery.", duration: "Environ 25 à 30 h de travail par personne.",
    prereq: "Aucun prérequis technique.", deliverables: "Une stratégie IA d'une page, un modèle de coûts, un plan d'adoption, une analyse de risques.", example: "Un comité de direction qui arbitre ses cas d'usage IA avec un business case chiffré." },
];

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
        <h2 className="mt-14 text-2xl font-bold">Trois programmes types pour vos équipes</h2>
        <p className="mt-2 max-w-2xl text-muted">Des points de départ, adaptés après un échange sur votre contexte. Les durées sont indicatives et s'appuient sur les durées estimées des modules ; elles sont confirmées dans la proposition.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {programmes.map((g) => (
            <Card key={g.name}>
              <h3 className="text-xl font-semibold">{g.name}</h3>
              <p className="mt-1 text-sm font-medium text-accent">{g.target}</p>
              <p className="mt-3 text-[15px] text-muted">{g.promise}</p>
              <dl className="mt-4 flex flex-col gap-2 text-sm">
                <div><dt className="font-semibold">Programme type</dt><dd className="text-muted">{g.modules}</dd></div>
                <div><dt className="font-semibold">Durée indicative</dt><dd className="text-muted">{g.duration}</dd></div>
                <div><dt className="font-semibold">Prérequis</dt><dd className="text-muted">{g.prereq}</dd></div>
                <div><dt className="font-semibold">Livrables</dt><dd className="text-muted">{g.deliverables}</dd></div>
                <div><dt className="font-semibold">Exemple de cas</dt><dd className="text-muted">{g.example}</dd></div>
              </dl>
            </Card>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-sm text-muted">Les parcours métier (marketing et communication, RH, juridique, finance) peuvent remplacer ou compléter ces programmes pour une équipe d'une même fonction. Le suivi de progression par organisation (invitations, sièges, rapports) est en préparation : il sera confirmé dans la proposition.</p>
      </Container>
      <Section title="Demande de devis" intro="Décrivez votre besoin. Nous vous répondons par e-mail.">
        <ContactForm />
      </Section>
    </>
  );
}
