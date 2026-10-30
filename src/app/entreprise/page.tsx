import type { Metadata } from "next";
import { Card, Container, Section } from "@/components/ui";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Formation IA pour les entreprises", description: "Formations sur mesure, licences pour vos équipes et ateliers privés : demandez un devis.", alternates: { canonical: "/entreprise" } };

const programmes = [
  { name: "AI Discovery Workshop", target: "Une équipe qui veut savoir par où commencer", promise: "Identifier et prioriser les cas d'usage IA de l'équipe en une journée de travail.",
    modules: "Une journée d'atelier : cartographie des tâches, repérage des cas d'usage, critères de choix, premiers garde-fous. S'appuie sur les modules AI Product Strategy et Responsible AI.", duration: "1 journée.",
    prereq: "Aucun prérequis technique ; 6 à 15 personnes de préférence.", deliverables: "Liste priorisée de cas d'usage, estimation de valeur, plan d'action.", example: "Un service client qui classe six cas d'usage selon la valeur, le risque et l'effort." },
  { name: "AI Skills Accelerator", target: "Une équipe à faire monter en compétence", promise: "Un parcours de 4 à 8 semaines, avec diagnostic initial, ateliers et réalisation de projets.",
    modules: "Parcours choisi avec vous (produit, marketing, RH, juridique, finance ou technique), évaluation de niveau au départ et à la fin.", duration: "4 à 8 semaines, rythme défini avec vous.",
    prereq: "Un référent côté client ; temps libéré chaque semaine.", deliverables: "Évaluation avant/après, projets réalisés, bilan des compétences.", example: "Une équipe RH qui structure un recrutement assisté, avec registre des risques." },
  { name: "Enterprise AI Academy", target: "Une organisation avec plusieurs métiers et niveaux", promise: "Un programme structuré, avec sessions, suivi pédagogique et reporting.",
    modules: "Plusieurs parcours en parallèle, sessions en direct, licences et suivi dans l'espace « Mon équipe ».", duration: "Plusieurs mois, selon le périmètre.",
    prereq: "Cadrage préalable avec les responsables des équipes.", deliverables: "Plan de formation, suivi des apprenants, indicateurs d'adoption.", example: "Une direction qui forme marketing, finance et juridique sur des parcours distincts avec un tableau de bord commun." },
];

export default function EnterprisePage() {
  return (
    <>
      <Container className="py-12">
        <h1 className="display-light text-4xl sm:text-5xl">Former vos équipes à l'IA</h1>
        <p className="mt-3 max-w-2xl text-muted">Chaque besoin est différent : taille de l'équipe, métiers, niveau de départ, calendrier. Nous construisons une proposition sur devis, à partir des mêmes modules et parcours que les particuliers.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card><h2 className="font-semibold">Licences d'équipe</h2><p className="mt-1 text-sm text-muted">Un accès pour chaque collaborateur, sur les modules ou parcours de votre choix.</p></Card>
          <Card><h2 className="font-semibold">Programme sur mesure</h2><p className="mt-1 text-sm text-muted">Un parcours composé pour vos cas d'usage et votre niveau de maturité.</p></Card>
          <Card><h2 className="font-semibold">Ateliers privés</h2><p className="mt-1 text-sm text-muted">Une journée de travail pratique avec votre équipe, sur vos propres sujets.</p></Card>
        </div>
        <h2 className="mt-14 text-2xl font-bold">Trois offres pour vos équipes</h2>
        <p className="mt-2 max-w-2xl text-muted">Trois formats, définis et chiffrés sur devis après un échange sur votre contexte. Les durées sont indicatives et confirmées dans la proposition.</p>
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
        <p className="mt-6 max-w-2xl text-sm text-muted">Les parcours métier (marketing et communication, RH, juridique, finance) peuvent remplacer ou compléter ces programmes pour une équipe d'une même fonction.</p>
        <h2 className="mt-14 text-2xl font-bold">Suivre la progression de votre équipe</h2>
        <p className="mt-2 max-w-2xl text-muted">Une fois la proposition signée, un responsable de votre organisation dispose d'un espace « Mon équipe » :</p>
        <ul className="mt-3 max-w-2xl list-disc pl-6 text-muted">
          <li>invitation des collaborateurs par un lien privé à usage unique ;</li>
          <li>attribution et retrait des licences, dans la limite du pack acheté et jusqu'à sa date de fin ;</li>
          <li>progression de chaque membre par module, quiz réussis et dernière activité, avec export CSV.</li>
        </ul>
        <p className="mt-3 max-w-2xl text-sm text-muted">Respect de la vie privée : chaque membre accepte explicitement le partage de sa progression et peut l'arrêter à tout moment. Le responsable ne voit jamais les réponses, les notes, les livrables ni les retours du formateur.</p>
      </Container>
      <Section title="Demande de devis" intro="Décrivez votre besoin. Nous vous répondons par e-mail.">
        <ContactForm />
      </Section>
    </>
  );
}
