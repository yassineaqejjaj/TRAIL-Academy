import Link from "next/link";
import { CourseCard, PathCard } from "@/components/cards";
import { OfferCards } from "@/components/offers";
import { ExpertiseTags, InstructorPhoto, instructor } from "@/components/instructor";
import { ButtonLink, Card, Container, Faq, Section, kickerCls } from "@/components/ui";
import { getCatalog } from "@/lib/catalog/load";
import { getFaq, getSection, getTestimonials } from "@/lib/cms";

export const revalidate = 60;

const audiences = [
  { t: "Product Managers et Product Owners", d: "Intégrez l'IA à votre pratique produit, de la discovery à la mise en production." },
  { t: "Consultants et chefs de projet", d: "Cadrez, chiffrez et pilotez des projets IA avec des méthodes réutilisables chez vos clients." },
  { t: "Business analysts et transformation digitale", d: "Analysez les besoins, mesurez la valeur et accompagnez l'adoption dans vos équipes." },
  { t: "Profils tech et data", d: "Construisez des systèmes RAG et agentiques, puis évaluez-les et sécurisez-les." },
  { t: "Managers et responsables d'équipe", d: "Définissez une stratégie IA réaliste et gouvernez les risques, dont l'AI Act européen." },
  { t: "Professionnels en montée en compétence", d: "Partez des fondations et progressez module par module, à votre rythme." },
];

const outcomes = [
  ["Construire une roadmap de produit IA", "Livrable : une roadmap priorisée, argumentée."],
  ["Développer un prototype avec Claude Code", "Livrable : un prototype fonctionnel et testé."],
  ["Concevoir un système RAG", "Livrable : une architecture et un jeu d'évaluation."],
  ["Structurer un workflow agentique", "Livrable : un workflow multi-étapes documenté."],
  ["Évaluer la qualité d'un système IA", "Livrable : une grille et un protocole d'évaluation."],
  ["Calculer les coûts d'une solution IA", "Livrable : un modèle de coûts par usage."],
  ["Définir une stratégie d'adoption", "Livrable : un plan d'adoption et ses indicateurs."],
  ["Identifier les principaux risques d'un produit IA", "Livrable : un registre de risques et de mesures."],
];

const method = [
  ["70 %", "Pratique", "Exercices, prototypes, études de cas et livrables."],
  ["20 %", "Interaction", "Quiz, exercices guidés et retours pédagogiques."],
  ["10 %", "Théorie", "Les concepts utiles pour prendre les bonnes décisions."],
];

const defaultFaq = [
  { q: "Puis-je acheter une formation qui n'est pas encore publiée ?", a: "Non. Seules les formations publiées et validées sont achetables. Les autres restent visibles avec la mention « Bientôt disponible »." },
  { q: "Que contient un module ?", a: "Des leçons vidéo, des exercices pratiques, des ressources à télécharger, un quiz, un livrable relu par le formateur et une attestation de réussite privée." },
  { q: "L'attestation est-elle une certification officielle ?", a: "Non. C'est une attestation privée et vérifiable de TRAIL Academy. Ce n'est ni un titre d'État ni une certification RNCP." },
  { q: "Si j'achète un module puis un parcours, est-ce que je paie deux fois ?", a: "Le prix d'un parcours n'est pas réduit des modules que vous détenez déjà : il les contient et prolonge simplement leur accès. Si vous prévoyez plusieurs modules, comparez avec le parcours ou AI Mastery avant d'acheter. Vous ne pouvez pas racheter ce que vous détenez déjà en totalité." },
];

export default async function Home() {
  const [catalog, hero, customFaq, testimonials] = await Promise.all([getCatalog(), getSection("accueil", "hero"), getFaq(), getTestimonials()]);
  const { courses, learningPaths, phases } = catalog;
  const featured = courses.filter((c) => c.mvpSlot);
  const faqItems = customFaq.length ? customFaq.map((f) => ({ q: f.question, a: f.answer })) : defaultFaq;

  return (
    <>
      <section>
        <Container className="flex flex-wrap items-center gap-14 py-20 sm:py-24">
          <div className="min-w-0 flex-[1_1_520px]">
            <p className={`${kickerCls} mb-6 text-accent`}>Learn AI. Apply AI. Lead with AI.</p>
            <h1 className="mb-6 text-4xl font-bold leading-[1.08] sm:text-6xl">{hero?.title ?? "Maîtrisez l'IA. Appliquez-la à votre métier."}</h1>
            <p className="mb-8 max-w-xl text-xl text-muted [text-wrap:pretty]">{hero?.subtitle ?? "Des formations concrètes pour comprendre, utiliser et piloter l'intelligence artificielle dans votre environnement professionnel."}</p>
            <div className="mb-6 flex flex-wrap gap-4">
              <ButtonLink href="/formations">Découvrir les formations</ButtonLink>
              <ButtonLink href="/conseiller" variant="secondary">Trouver mon parcours</ButtonLink>
            </div>
            <p className="text-[15px] text-muted">Des compétences concrètes. Des projets pratiques. Une progression à votre rythme.</p>
          </div>
          <div className="min-w-0 flex-[1_1_400px] rounded-2xl border border-border bg-surface p-8">
            <p className={`${kickerCls} mb-6 text-muted`}>{courses.length} modules · {phases.length} phases · {learningPaths.filter((p) => p.kind === "path").length} parcours</p>
            <ol>
              {phases.map((p, i) => (
                <li key={p.id} className="flex items-baseline gap-4 border-t border-border py-4">
                  <span className="min-w-8 font-display text-xl font-bold text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <span><span className="block font-semibold">{p.title}</span><span className="block text-sm text-muted">{courses.filter((c) => c.phaseId === p.id).map((c) => c.title).join(", ")}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {testimonials.length > 0 && (
        <Section kicker="Témoignages" title="Ce qu'en disent les apprenants">
          <div className="grid gap-4 md:grid-cols-3">{testimonials.map((t) => <Card key={t.id}><blockquote className="text-sm">« {t.quote} »</blockquote><p className="mt-3 text-sm font-semibold">{t.author_name}</p>{t.author_role && <p className="text-xs text-muted">{t.author_role}</p>}</Card>)}</div>
        </Section>
      )}

      <Section tone="surface" title="Conçu pour votre métier" intro="Chaque module part de situations professionnelles réelles, pas de théorie générale.">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {audiences.map((a) => <div key={a.t} className="rounded-xl border border-border bg-bg p-6"><h3 className="mb-2 text-lg font-semibold">{a.t}</h3><p className="text-[15px] text-muted">{a.d}</p></div>)}
        </div>
      </Section>

      <Section title="Les parcours" intro="Un parcours regroupe les modules dans l'ordre recommandé, au prix d'une seule offre.">
        <div className="grid gap-6 lg:grid-cols-3">{learningPaths.map((p) => <PathCard key={p.slug} path={p} catalog={catalog} />)}</div>
        <p className="mt-6"><Link href="/tarifs" className="font-semibold text-accent hover:underline">Comparer toutes les offres</Link></p>
      </Section>

      <Section tone="surface">
        <div className="flex flex-wrap gap-14">
          <div className="min-w-0 flex-[1_1_380px]">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Apprendre autrement</h2>
            <p className="text-muted [text-wrap:pretty]">Chaque module est conçu autour de la pratique : démonstrations, exercices guidés, exercices autonomes, puis un livrable concret. Cette répartition est une cible de conception pédagogique, pas un résultat mesuré.</p>
          </div>
          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-6">
            <div className="flex h-4 overflow-hidden rounded-lg" role="img" aria-label="Objectif de conception : 70 % pratique, 20 % interaction, 10 % théorie">
              <div className="bg-accent" style={{ flex: 70 }} /><div className="bg-band" style={{ flex: 20 }} /><div className="bg-border" style={{ flex: 10 }} />
            </div>
            <div className="grid gap-6 sm:grid-cols-3">{method.map(([pct, t, d]) => <div key={t}><div className="font-display text-3xl font-bold">{pct}</div><div className="font-semibold">{t}</div><div className="text-sm text-muted">{d}</div></div>)}</div>
          </div>
        </div>
      </Section>

      <Section title="Ce que vous saurez faire" intro="Des résultats professionnels concrets, chacun associé à un livrable.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{outcomes.map(([t, d]) => <div key={t} className="rounded-xl border border-border bg-surface p-6"><div className="mb-1 font-semibold">{t}</div><div className="text-sm text-muted">{d}</div></div>)}</div>
      </Section>

      <Section>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="mb-2 text-3xl font-bold sm:text-4xl">Premières formations</h2><p className="text-muted">Les contenus sont en production. Aucune formation non publiée n'est présentée comme accessible.</p></div>
          <Link href="/formations" className="py-3 font-semibold text-accent hover:underline">Voir les {courses.length} modules</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{featured.map((c) => <CourseCard key={c.code} course={c} catalog={catalog} />)}</div>
      </Section>

      <Section tone="surface">
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-center">
          <InstructorPhoto size={200} />
          <div className="max-w-2xl">
            <p className={`${kickerCls} mb-4 text-accent`}>Votre formateur</p>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">{instructor.name}</h2>
            <p className="mb-6 text-muted [text-wrap:pretty]">Les formations sont conçues et animées par un seul formateur, spécialiste du management de produits IA, de l'ingénierie IA et de la transformation en entreprise.</p>
            <div className="mb-6"><ExpertiseTags /></div>
            <Link href="/formateur" className="font-semibold text-accent hover:underline">Découvrir le formateur</Link>
          </div>
        </div>
      </Section>

      <Section title="Trois offres" intro="Un module, un parcours, ou l'accès complet. Les prix sont TTC, sans abonnement.">
        <OfferCards catalog={catalog} />
        <p className="mt-6 text-sm text-muted">Le paiement en ligne n'est ouvert que pour les formations publiées. Pour une équipe : <Link href="/entreprise" className="font-semibold text-accent hover:underline">demander un devis</Link>. <Link href="/tarifs" className="font-semibold text-accent hover:underline">Détail des tarifs</Link></p>
      </Section>

      <Section tone="surface" className="max-w-[800px]" title="Questions fréquentes"><Faq items={faqItems} /></Section>

      <section className="bg-band text-band-fg">
        <Container className="flex flex-wrap items-center justify-between gap-8 py-20">
          <div className="min-w-0 flex-[1_1_480px]"><h2 className="mb-3 text-3xl font-bold sm:text-4xl">Quel parcours pour votre métier ?</h2><p className="text-band-muted">Répondez à six questions. Les règles de recommandation sont visibles et expliquées, sans IA.</p></div>
          <Link href="/conseiller" className="inline-flex min-h-12 items-center rounded-lg bg-white px-7 py-3 font-semibold text-[#0b1f3a]">Trouver mon parcours</Link>
        </Container>
      </section>
    </>
  );
}
