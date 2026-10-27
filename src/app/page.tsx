import type { Metadata } from "next";
import Link from "next/link";
import { CourseCard } from "@/components/cards";
import { OfferCards } from "@/components/offers";
import { InstructorPhoto, instructor } from "@/components/instructor";
import { ButtonLink, Card, Container, Faq, Section, kickerCls } from "@/components/ui";
import { WaitlistForm } from "@/components/waitlist";
import { availabilitySummary, waitlistOptions } from "@/lib/waitlist";
import { getCatalog } from "@/lib/catalog/load";
import { getFaq, getSection, getTestimonials } from "@/lib/cms";
import { MIN_PUBLISHED_REVIEWS } from "@/lib/reviews";
import { JsonLd } from "@/components/json-ld";
import { faqLd, itemListLd } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { courses, learningPaths } = await getCatalog();
  const paths = learningPaths.filter((p) => p.kind === "path").length;
  return {
    title: { absolute: "TRAIL Academy — Formation IA pour Product Managers et professionnels de la tech" },
    description: `${courses.length} modules et ${paths} parcours pour apprendre, appliquer et piloter l'IA, du produit à la tech, au marketing, aux RH, au juridique et à la finance. Ateliers no-code, livrables relus par le formateur.`,
    alternates: { canonical: "/" },
  };
}


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

/** The three formations to open first, shown as "what you will build". */
const FLAGSHIP = ["M4", "M6", "M12"];

const method = [
  ["70 %", "Pratique", "Ateliers, prototypes, études de cas et livrable du module."],
  ["20 %", "Exercices guidés et quiz", "Corrigés automatiquement ou relus par le formateur. Ce ne sont pas des échanges entre apprenants : le direct avec le formateur passe par les sessions en visio."],
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
  const flagship = FLAGSHIP.map((code) => courses.find((c) => c.code === code)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const summary = availabilitySummary(catalog);
  const options = waitlistOptions(catalog);
  const freeLesson = courses.find((c) => c.status === "published");
  const faqItems = customFaq.length ? customFaq.map((f) => ({ q: f.question, a: f.answer })) : defaultFaq;

  return (
    <>
      <JsonLd data={faqLd(faqItems)} />
      <JsonLd data={itemListLd("Modules de formation IA", courses.map((c) => ({ name: `${c.code} ${c.title}`, path: `/formations/${c.slug}` })))} />
      <section>
        <Container className="flex flex-wrap items-center gap-14 py-16 sm:py-24">
          <div className="min-w-0 flex-[1_1_520px]">
            <p className={`${kickerCls} mb-6 text-accent`}>Formations IA pour professionnels</p>
            <h1 className="mb-6 text-4xl font-bold leading-[1.08] sm:text-6xl">{hero?.title ?? "Apprenez à utiliser, construire et piloter l'IA dans votre métier."}</h1>
            <p className="mb-6 max-w-xl text-xl text-muted [text-wrap:pretty]">{hero?.subtitle ?? "Des formations conçues par un Head of AI. Des cas réels, des ateliers pratiques sans code et un livrable relu personnellement par le formateur. Pour le produit et la tech, mais aussi le marketing, les RH, le juridique et la finance."}</p>
            <div className="mb-8 flex flex-wrap gap-4">
              <ButtonLink href="#liste-attente">Être informé de l'ouverture</ButtonLink>
              <ButtonLink href="/evaluation" variant="secondary">Évaluer mon niveau gratuitement</ButtonLink>
              {freeLesson && <Link href={`/formations/${freeLesson.slug}/apercu`} className="inline-flex min-h-12 items-center px-2 font-semibold text-accent hover:underline">Lire une leçon gratuite</Link>}
            </div>
            <dl className="grid max-w-xl gap-4 sm:grid-cols-3">
              <div><dt className="text-sm text-muted">Expérience du formateur</dt><dd className="font-display text-2xl font-bold">1 500+ <span className="text-sm font-normal text-muted">professionnels formés</span></dd></div>
              <div><dt className="text-sm text-muted">Objectif de pratique</dt><dd className="font-display text-2xl font-bold">70 %</dd></div>
              <div><dt className="text-sm text-muted">À chaque module</dt><dd className="font-display text-2xl font-bold">1 <span className="text-sm font-normal text-muted">livrable relu</span></dd></div>
            </dl>
            <p className="mt-4 text-sm text-muted">Les 1 500 professionnels formés relèvent de l'expérience personnelle du formateur, avant TRAIL Academy. {summary.buyable === 0 ? `Aujourd'hui, ${summary.preview} modules sont lisibles en aperçu gratuit et aucun n'est encore ouvert à l'achat.` : `${summary.buyable} modules sont ouverts à l'achat.`}</p>
          </div>
          <div className="min-w-0 flex-[1_1_400px] rounded-2xl border border-border bg-surface p-8">
            <p className={`${kickerCls} mb-6 text-muted`}>{courses.length} modules · {phases.length} phases · {learningPaths.filter((p) => p.kind === "path").length} parcours</p>
            <ol>
              {phases.map((p, i) => (
                <li key={p.id} className="flex items-baseline gap-4 border-t border-border py-4">
                  <span className="min-w-8 font-display text-xl font-bold text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <span><span className="block font-semibold">{p.title}</span><span className="block text-sm text-muted">{courses.filter((c) => c.phaseId === p.id).length} modules</span></span>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <Section tone="surface" title="Ce que vous saurez faire" intro="Des résultats professionnels concrets, chacun associé à un livrable.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{outcomes.map(([t, d]) => <div key={t} className="rounded-xl border border-border bg-bg p-6"><div className="mb-1 font-semibold">{t}</div><div className="text-sm text-muted">{d}</div></div>)}</div>
      </Section>

      <Section kicker="Voici ce que vous allez construire" title="Trois formations phares pour commencer" intro="Chacune se termine par un livrable concret, relu par le formateur. Des exemples fictifs de livrables sont consultables sans inscription.">
        <div className="grid gap-6 md:grid-cols-3">{flagship.map((c) => <CourseCard key={c.code} course={c} catalog={catalog} />)}</div>
        <div className="mt-6 flex flex-wrap gap-4"><ButtonLink href="/exemples-livrables" variant="secondary">Voir des exemples de livrables</ButtonLink><Link href="/formations" className="inline-flex min-h-12 items-center font-semibold text-accent hover:underline">Voir les {courses.length} modules</Link></div>
      </Section>

      <Section tone="surface" kicker="Votre métier" title="Un parcours pour votre fonction" intro="Les fondations, puis des modules écrits pour votre métier : produit et IA, marketing et communication, RH, juridique, finance.">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {learningPaths.filter((p) => p.kind === "path").map((p) => <div key={p.slug} className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-6"><h3 className="text-lg font-semibold"><Link href={`/parcours/${p.slug}`} className="hover:underline">{p.title}</Link></h3><p className="text-[15px] text-muted">{p.tagline}</p><p className="mt-auto text-sm text-muted">Pour : {p.audience}</p></div>)}
        </div>
        <p className="mt-6 flex flex-wrap gap-6"><Link href="/parcours" className="font-semibold text-accent hover:underline">Comparer les parcours</Link><Link href="/conseiller" className="font-semibold text-accent hover:underline">Décrire mon métier au conseiller</Link></p>
      </Section>

      <Section kicker="Avant d'acheter" title="Essayez, comparez, jugez sur pièces" intro="Trois façons de vous faire une idée sans vous inscrire.">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6"><h3 className="text-lg font-semibold"><Link href="/evaluation" className="hover:underline">Évaluer mon niveau</Link></h3><p className="text-[15px] text-muted">15 questions en 5 minutes : votre niveau estimé, vos points à travailler et le parcours qui vous correspond.</p></div>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6"><h3 className="text-lg font-semibold"><Link href="/apercu-plateforme" className="hover:underline">Parcourir la plateforme</Link></h3><p className="text-[15px] text-muted">Un module de démonstration : leçon, quiz corrigé, atelier no-code et livrable.</p></div>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6"><h3 className="text-lg font-semibold">{freeLesson ? <Link href={`/formations/${freeLesson.slug}/apercu`} className="hover:underline">Lire une leçon gratuite</Link> : "Lire une leçon gratuite"}</h3><p className="text-[15px] text-muted">Une vraie leçon de chaque module publié, sans compte, avec lecture audio.</p></div>
        </div>
      </Section>

      <Section tone="surface" kicker="Pourquoi TRAIL ?" title="Apprendre en construisant, avec quelqu'un qui le fait" intro="Un formateur unique, des projets réels, des livrables concrets : pas un catalogue de vidéos génériques.">
        <div className="flex flex-wrap items-center gap-10">
          <InstructorPhoto size={200} />
          <ul className="grid min-w-0 flex-1 gap-4 text-[17px] sm:grid-cols-3">
            <li className="rounded-xl border border-border bg-bg p-5"><strong className="block">Expérience de terrain</strong><span className="text-[15px] text-muted">Plus de 10 ans à concevoir, développer et déployer des solutions d'IA pour de grandes organisations.</span></li>
            <li className="rounded-xl border border-border bg-bg p-5"><strong className="block">Pratique d'abord</strong><span className="text-[15px] text-muted">Chaque module se termine par trois ateliers sur des outils no-code et un livrable relu par le formateur.</span></li>
            <li className="rounded-xl border border-border bg-bg p-5"><strong className="block">Un formateur identifiable</strong><span className="text-[15px] text-muted">{instructor.name}, Head of AI, formé à Stanford (machine learning) et à Duke University (AI product management).</span></li>
          </ul>
        </div>
        <p className="mt-6"><Link href="/formateur" className="font-semibold text-accent hover:underline">Découvrir le parcours du formateur</Link></p>
      </Section>

      {testimonials.length >= MIN_PUBLISHED_REVIEWS && (
        <Section kicker="Témoignages" title="Ce qu'en disent les apprenants">
          <div className="grid gap-4 md:grid-cols-3">{testimonials.map((t) => <Card key={t.id}><blockquote className="text-sm">« {t.quote} »</blockquote><p className="mt-3 text-sm font-semibold">{t.author_name}</p>{t.author_role && <p className="text-xs text-muted">{t.author_role}</p>}</Card>)}</div>
        </Section>
      )}

      <Section tone="surface">
        <div className="flex flex-wrap gap-14">
          <div className="min-w-0 flex-[1_1_380px]">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Apprendre autrement</h2>
            <p className="text-muted [text-wrap:pretty]">Chaque module est conçu autour de la pratique : démonstrations, exercices guidés, ateliers autonomes, puis un livrable concret. Cette répartition est une cible de conception pédagogique, pas une mesure.</p>
          </div>
          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-6">
            <div className="flex h-4 overflow-hidden rounded-lg" role="img" aria-label="Objectif de conception : 70 % pratique, 20 % exercices guidés et quiz, 10 % théorie">
              <div className="bg-accent" style={{ flex: 70 }} /><div className="bg-band" style={{ flex: 20 }} /><div className="bg-border" style={{ flex: 10 }} />
            </div>
            <div className="grid gap-6 sm:grid-cols-3">{method.map(([pct, t, d]) => <div key={t}><div className="font-display text-3xl font-bold">{pct}</div><div className="font-semibold">{t}</div><div className="text-sm text-muted">{d}</div></div>)}</div>
          </div>
        </div>
      </Section>

      <Section title="Trois offres" intro="Un module, un parcours, ou l'accès complet. Les prix sont TTC, sans abonnement.">
        <OfferCards catalog={catalog} />
        <p className="mt-6 text-sm text-muted">Le paiement en ligne n'est ouvert que pour les formations dont l'offre est ouverte. Pour une équipe : <Link href="/entreprise" className="font-semibold text-accent hover:underline">demander un devis</Link>. <Link href="/tarifs" className="font-semibold text-accent hover:underline">Voir le détail des tarifs</Link>.</p>
      </Section>

      <Section tone="surface" className="max-w-[800px]" title="Questions fréquentes"><Faq items={faqItems} /><p className="mt-4"><Link href="/faq" className="font-semibold text-accent hover:underline">Toutes les questions</Link></p></Section>

      <section id="liste-attente" className="bg-band text-band-fg">
        <Container className="flex flex-wrap items-start justify-between gap-10 py-20">
          <div className="min-w-0 flex-[1_1_420px]">
            <h2 className="mb-3 text-3xl font-bold sm:text-4xl">Être informé de l'ouverture</h2>
            <p className="text-band-muted">Choisissez ce qui vous intéresse. Vous recevrez un seul e-mail à l'ouverture, sans engagement. Pas sûr de votre choix ? <Link href="/conseiller" className="font-semibold underline">Le conseiller</Link> vous recommande un parcours.</p>
          </div>
          <div className="min-w-0 flex-[1_1_420px] rounded-2xl bg-surface p-8 text-fg"><WaitlistForm options={options} /></div>
        </Container>
      </section>
    </>
  );
}
