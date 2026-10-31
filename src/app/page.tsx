import type { Metadata } from "next";
import Link from "next/link";
import { HeroPathCard, type HeroPath } from "@/components/home/hero-path-card";
import { OfferCards } from "@/components/offers";
import { InstructorPhoto, instructor } from "@/components/instructor";
import { ButtonLink, Faq } from "@/components/ui";
import { WaitlistForm } from "@/components/waitlist";
import { JsonLd } from "@/components/json-ld";
import { coursesOfPath, formatEuro } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog/load";
import { getFaq, getSection, getTestimonials } from "@/lib/cms";
import { contentStats } from "@/lib/content-stats";
import { MIN_PUBLISHED_REVIEWS } from "@/lib/reviews";
import { faqLd, itemListLd } from "@/lib/seo";
import { availabilitySummary, waitlistOptions } from "@/lib/waitlist";

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

const SHORT: Record<string, string> = { "product-manager-augmente": "Product", "ai-product-manager": "AI Product", "marketing-communication-augmentee": "Marketing", "rh-augmentees": "RH", "juridique-augmente": "Juridique", "finance-augmentee": "Finance" };
const label = "text-[13px] font-semibold uppercase tracking-[0.1em] text-kicker";
const wrap = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";
const H2 = "display-light text-4xl leading-[1.1] sm:text-5xl";

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

const defaultFaq = [
  { q: "Puis-je acheter une formation qui n'est pas encore publiée ?", a: "Non. Seules les formations publiées et validées sont achetables. Les autres restent visibles avec la mention « Bientôt disponible »." },
  { q: "Que contient un module ?", a: "Des leçons vidéo, des exercices pratiques, des ressources à télécharger, un quiz, un livrable relu par le formateur et une attestation de réussite privée." },
  { q: "L'attestation est-elle une certification officielle ?", a: "Non. C'est une attestation privée et vérifiable de TRAIL Academy. Ce n'est ni un titre d'État ni une certification RNCP." },
  { q: "Si j'achète un module puis un parcours, est-ce que je paie deux fois ?", a: "Le prix d'un parcours n'est pas réduit des modules que vous détenez déjà : il les contient et prolonge simplement leur accès. Si vous prévoyez plusieurs modules, comparez avec le parcours ou AI Mastery avant d'acheter. Vous ne pouvez pas racheter ce que vous détenez déjà en totalité." },
];

export default async function Home() {
  const [catalog, hero, customFaq, testimonials] = await Promise.all([getCatalog(), getSection("accueil", "hero"), getFaq(), getTestimonials()]);
  const { courses, learningPaths, offers } = catalog;
  const freeLesson = courses.find((c) => c.status === "published");
  const summary = availabilitySummary(catalog);
  const options = waitlistOptions(catalog);
  const faqItems = customFaq.length ? customFaq.map((f) => ({ q: f.question, a: f.answer })) : defaultFaq;
  const paths = learningPaths.filter((p) => p.kind === "path");
  const mastery = learningPaths.find((p) => p.kind === "bundle");
  const priceOf = (slug: string) => { const o = offers.find((x) => x.slug === slug); return o?.amountCents != null ? formatEuro(o.amountCents) : "—"; };
  const heroPaths: HeroPath[] = paths.map((p) => {
    const list = coursesOfPath(p, catalog);
    return { slug: p.slug, short: SHORT[p.slug] ?? p.title, title: p.title, tagline: p.tagline, months: p.accessMonths, price: priceOf(p.slug), more: Math.max(0, list.length - 4),
      steps: list.slice(0, 4).map((c) => ({ code: c.code, name: c.title, deliverable: c.deliverable })) };
  });
  const marquee = courses.filter((c) => ["M4", "M5", "M6", "M11", "M12", "M8", "M10", "M15", "M13", "M27", "M19", "M22", "M28"].includes(c.code)).map((c) => c.title);
  const experience = "text-[15px] leading-[1.6] text-muted";

  return (
    <>
      <JsonLd data={faqLd(faqItems)} />
      <JsonLd data={itemListLd("Modules de formation IA", courses.map((c) => ({ name: `${c.code} ${c.title}`, path: `/formations/${c.slug}` })))} />

      {/* HERO */}
      <section className="relative">
        <svg aria-hidden viewBox="0 0 1440 860" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 size-full">
          <defs>
            <filter id="trail-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12" /></filter>
            <linearGradient id="trail-grad" x1="0" x2="1"><stop offset="0" stopColor="#3ccfc0" stopOpacity="0" /><stop offset=".45" stopColor="#3ccfc0" /><stop offset="1" stopColor="#4f8dff" /></linearGradient>
          </defs>
          <path className="trail-line pulse-dot" d="M-60 720 C 240 690, 420 470, 660 520 S 1000 720, 1180 430 S 1400 110, 1520 80" fill="none" stroke="url(#trail-grad)" strokeWidth="9" strokeLinecap="round" filter="url(#trail-blur)" />
          <path className="trail-line" d="M-60 720 C 240 690, 420 470, 660 520 S 1000 720, 1180 430 S 1400 110, 1520 80" fill="none" stroke="url(#trail-grad)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className={`${wrap} relative grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:pb-24`}>
          <div className="flex flex-col gap-6">
            <span className="glass self-start rounded-full px-3.5 py-2 text-[13px] font-medium"><span className="font-semibold text-accent">Learn AI.</span> <span className="font-semibold text-kicker">Apply AI.</span> Lead with AI.</span>
            <h1 className="display-light text-[44px] leading-[1.04] sm:text-6xl lg:text-[74px]">{hero?.title ?? <>Maîtrisez l'IA.<br />Appliquez-la à <b className="text-accent">votre métier</b>.</>}</h1>
            <p className="max-w-[560px] text-[19px] leading-[1.6] text-muted">{hero?.subtitle ?? "Des formations conçues par un Head of AI. Des cas réels, des ateliers pratiques sans code et un livrable relu personnellement par le formateur. Pour le produit et la tech, mais aussi le marketing, les RH, le juridique et la finance."}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/conseiller" className="cta-glow inline-flex min-h-14 items-center gap-2.5 rounded-full bg-primary px-8 text-base font-semibold text-primary-fg shadow-[0_12px_40px_rgba(60,207,192,0.3)]">Trouver mon parcours en 2 min <span aria-hidden>→</span></Link>
              <Link href={freeLesson ? `/formations/${freeLesson.slug}/apercu` : "/formations"} className="glass inline-flex min-h-14 items-center rounded-full px-7 text-base font-medium transition-colors hover:bg-tint">Lire une leçon gratuite</Link>
            </div>
            <dl className="mt-1 grid max-w-[580px] grid-cols-3 gap-4">
              <div className="flex flex-col-reverse"><dt className="text-[13px] text-muted">professionnels formés*</dt><dd className="font-display text-[28px] font-bold sm:text-3xl">1 500+</dd></div>
              <div className="flex flex-col-reverse"><dt className="text-[13px] text-muted">ateliers no-code</dt><dd className="font-display text-[28px] font-bold sm:text-3xl">{courses.length * 3}</dd></div>
              <div className="flex flex-col-reverse"><dt className="text-[13px] text-muted">livrable relu par module</dt><dd className="font-display text-[28px] font-bold text-accent sm:text-3xl">1</dd></div>
            </dl>
            <p className="max-w-[560px] text-xs leading-normal text-muted">* Expérience personnelle du formateur, avant TRAIL Academy. {summary.buyable === 0 ? `Aujourd'hui, ${summary.preview} modules sont lisibles en aperçu gratuit ; aucun n'est encore ouvert à l'achat.` : `${summary.buyable} modules sont ouverts à l'achat.`}</p>
          </div>
          <HeroPathCard paths={heroPaths} />
        </div>
        <div aria-hidden className="relative overflow-hidden border-y border-hairline bg-band-soft py-5">
          <div className="marquee flex w-max gap-12 whitespace-nowrap font-display text-base text-muted">
            {[0, 1].map((k) => <div key={k} className="flex gap-12">{marquee.map((m) => <span key={`${k}-${m}`} className="flex gap-12"><span>{m}</span><span className="text-accent">/</span></span>)}</div>)}
          </div>
        </div>
      </section>

      {/* PROOF: real catalogue figures */}
      <section className={`${wrap} py-14 sm:py-[72px]`}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[[String(courses.length), `modules en ${catalog.phases.length} phases`], [String(contentStats.lessons), "leçons rédigées"], [String(contentStats.quizQuestions), "questions de quiz corrigées"], [`${contentStats.diagrams}+`, "schémas intégrés aux leçons"]].map(([n, t], k) => (
            <div key={t} className="glass flex flex-col gap-1.5 rounded-[22px] p-6 sm:p-7"><span className={`font-display text-4xl font-bold leading-[1.1] sm:text-[46px] ${k === 1 ? "text-accent" : ""}`}>{n}</span><span className="text-sm text-muted">{t}</span></div>
          ))}
        </div>
      </section>

      {/* OUTCOMES */}
      <section className={`${wrap} py-14 sm:py-20`}>
        <div className="mb-11 flex max-w-[760px] flex-col gap-4"><span className={label}>Ce que vous saurez faire</span><h2 className={H2}>Des résultats concrets, <b>chacun associé à un livrable</b>.</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {outcomes.map(([t, d], k) => (
            <div key={t} className="glass lift group flex min-h-[150px] flex-col gap-2.5 rounded-[22px] p-6">
              <span className="font-display text-[13px] font-bold text-accent">{String(k + 1).padStart(2, "0")}</span>
              <span className="font-display text-lg font-semibold leading-[1.35]">{t}</span>
              <span className="text-[13px] leading-normal text-muted lg:max-h-0 lg:overflow-hidden lg:opacity-0 lg:transition-all lg:duration-300 lg:group-focus-within:max-h-20 lg:group-focus-within:opacity-100 lg:group-hover:max-h-20 lg:group-hover:opacity-100">{d}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PARCOURS BENTO */}
      <section id="parcours" className={`${wrap} py-16 sm:py-24`}>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="flex max-w-[720px] flex-col gap-4"><span className={label}>Six parcours métier</span><h2 className={H2}>Les fondations, puis <b>votre fonction</b>.</h2></div>
          <Link href="/parcours" className="text-[15px] font-semibold text-accent hover:underline">Comparer les parcours →</Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {mastery && (
            <Link href="/parcours/ai-mastery" className="glass-strong lift relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[30px] p-8 sm:p-9 lg:col-span-2 lg:row-span-2">
              <div aria-hidden className="absolute -right-24 -top-24 size-[440px]"><div className="absolute inset-[70px] rounded-full bg-blue opacity-[var(--orb-card)] blur-[60px]" /><svg viewBox="0 0 440 440" className="absolute inset-0 size-full"><circle cx="220" cy="220" r="170" fill="none" stroke="rgba(255,255,255,.18)" strokeDasharray="2 8" /><circle cx="220" cy="50" r="7" fill="#3ccfc0" /><circle cx="220" cy="220" r="115" fill="none" stroke="rgba(255,255,255,.12)" /></svg></div>
              <span className="relative self-start rounded-full border border-accent/35 bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">Accès complet</span>
              <div className="relative flex max-w-[460px] flex-col gap-3.5">
                <h3 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-[40px]">AI Mastery</h3>
                <p className="text-base leading-[1.6] text-muted">Les {courses.length} modules et les {paths.length} parcours, en un seul achat. Des fondations du machine learning aux agents, à la sécurité des LLM et à l'IA appliquée à chaque métier.</p>
                <div className="flex flex-wrap gap-2 text-[13px]"><span className="rounded-full bg-tint px-3 py-1.5">{courses.length} modules</span><span className="rounded-full bg-tint px-3 py-1.5">{mastery.accessMonths} mois d'accès</span><span className="rounded-full bg-tint px-3 py-1.5">{priceOf(mastery.slug)} TTC</span></div>
              </div>
            </Link>
          )}
          {paths.map((p, k) => (
            <Link key={p.slug} href={`/parcours/${p.slug}`} className="glass lift flex min-h-[220px] flex-col justify-between gap-3 rounded-3xl p-6">
              <div className="flex items-center justify-between"><span className={`flex size-11 items-center justify-center rounded-[14px] font-display text-lg font-bold ${k % 2 ? "bg-blue/25 text-kicker" : "bg-accent-soft text-accent"}`}>{(SHORT[p.slug] ?? p.title).charAt(0)}</span><span className="text-xs text-muted">{coursesOfPath(p, catalog).length} modules</span></div>
              <div className="flex flex-col gap-1.5"><h3 className="font-display text-[19px] font-semibold leading-[1.3]">{p.title}</h3><p className="text-[13px] leading-normal text-muted">{p.tagline}</p></div>
            </Link>
          ))}
          <Link href="/conseiller" className="lift flex min-h-[200px] flex-col justify-between rounded-3xl border border-accent bg-accent p-7 text-on-accent hover:!bg-accent lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.08em]">Pas sûr de votre choix ?</span>
            <div className="flex flex-wrap items-end justify-between gap-3"><h3 className="max-w-[420px] font-display text-2xl font-bold leading-tight">Décrivez votre métier au conseiller : il vous recommande un parcours et explique pourquoi.</h3><span className="whitespace-nowrap text-[15px] font-bold">Commencer →</span></div>
          </Link>
        </div>
      </section>

      {/* MÉTHODE */}
      <section id="methode" className={`${wrap} py-20 sm:py-28`}>
        <div className="mb-14 flex max-w-[760px] flex-col gap-4"><span className={label}>La méthode TRAIL</span><h2 className={H2}>Comprendre, essayer, vérifier, <b>livrer</b>.</h2><p className="text-lg leading-[1.6] text-muted">Chaque module suit le même cycle. Vous repartez avec un travail réel, pas seulement des notions.</p></div>
        <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          <svg aria-hidden viewBox="0 0 1280 60" preserveAspectRatio="none" className="absolute inset-x-0 top-5 hidden h-[60px] w-full lg:block"><path d="M40 30 C 280 0, 400 60, 640 30 S 1000 0, 1240 30" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" /></svg>
          {[["Comprendre", "Une leçon courte, un schéma, une vidéo : l'idée-clé et un cas métier, pas un cours magistral."], ["Essayer", "Un atelier sur des outils no-code, avec des données fictives fournies. Vous manipulez avant de théoriser."], ["Vérifier", "Un quiz corrigé tout de suite et une grille de critères écrite à l'avance : vous savez où vous en êtes."], ["Livrer", "Un livrable professionnel que le formateur relit personnellement. Il débouche sur une attestation vérifiable."]].map(([t, d], k) => (
            <li key={t} className="relative flex flex-col gap-4">
              <span className={`flex size-[68px] items-center justify-center rounded-full font-display text-xl font-bold ${k === 3 ? "bg-accent text-on-accent shadow-[0_0_0_8px_rgba(60,207,192,0.15),0_0_40px_rgba(60,207,192,0.5)]" : k === 2 ? "border border-blue/60 bg-blue/25" : "glass"}`}>{k + 1}</span>
              <h3 className="font-display text-[22px] font-semibold">{t}</h3>
              <p className={experience}>{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* AVANT D'ACHETER */}
      <section className={`${wrap} py-16 sm:py-24`}>
        <div className="mb-12 flex max-w-[760px] flex-col gap-4"><span className={label}>Avant d'acheter</span><h2 className={H2}>Essayez, comparez, <b>jugez sur pièces</b>.</h2></div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass-strong flex flex-col gap-6 rounded-[30px] p-7 sm:p-9 lg:col-span-2">
            <div className="flex flex-col gap-2.5"><span className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">Conseiller en texte libre</span><h3 className="font-display text-2xl font-semibold leading-[1.3] sm:text-[28px]">Décrivez votre métier avec vos mots. Il vous répond en citant les vôtres.</h3></div>
            <div className="flex flex-col gap-3 rounded-[20px] border border-hairline bg-inset p-5 text-sm leading-[1.6]">
              <div className="max-w-[80%] self-end rounded-[18px_18px_4px_18px] bg-tint px-4 py-3">Je suis contrôleuse de gestion, je veux automatiser mon reporting mensuel sans coder.</div>
              <div className="flex max-w-[88%] flex-col gap-2 rounded-[18px_18px_18px_4px] border border-accent/30 bg-accent-soft px-4 py-3.5">
                <span>Vous parlez de <strong className="text-accent">« reporting mensuel »</strong> et de <strong className="text-accent">« sans coder »</strong> : le parcours <strong>Finance Augmentée</strong> vous correspond.</span>
                <span className="text-muted">Premier module conseillé : <strong className="text-fg">M28 · IA pour le contrôle de gestion et le FP&amp;A</strong>, livrable : un pack de reporting mensuel avec explication d'écarts.</span>
              </div>
            </div>
            <span className="text-xs text-muted">Calculé dans votre navigateur : rien n'est envoyé. Exemple de conversation fictif. <Link href="/conseiller" className="font-semibold text-accent hover:underline">Essayer</Link></span>
          </div>
          {[
            { href: "/evaluation", t: "Évaluer mon niveau", d: "15 questions en 5 minutes : votre niveau estimé sur 5 dimensions et vos points à travailler.", extra: "Gratuit, sans compte →", icon: <path d="M3 3v18h18M7 15l4-4 3 3 5-6" /> },
            { href: freeLesson ? `/formations/${freeLesson.slug}/apercu` : "/formations", t: "Lire une leçon gratuite", d: "Une vraie leçon de chaque module, sans compte, avec lecture audio et schémas.", icon: <><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2Z" /><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8Z" /></> },
            { href: "/apercu-plateforme", t: "Parcourir la plateforme", d: "Un module de démonstration : leçon, quiz corrigé, atelier no-code et livrable.", icon: <><rect x="3" y="4" width="18" height="14" rx="3" /><path d="M8 21h8M12 18v3" /></> },
          ].map((c, k) => (
            <Link key={c.t} href={c.href} className="glass lift flex flex-col justify-between gap-4 rounded-[30px] p-7 sm:p-8">
              <svg aria-hidden width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={k === 1 ? "text-kicker" : "text-accent"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
              <div className="flex flex-col gap-2"><h3 className="font-display text-[22px] font-semibold">{c.t}</h3><p className={experience}>{c.d}</p>{c.extra && <span className="text-sm font-semibold text-accent">{c.extra}</span>}</div>
            </Link>
          ))}
          <div className="glass flex flex-wrap items-center justify-between gap-7 rounded-[30px] p-7 sm:p-8 lg:col-span-2">
            <div className="flex max-w-[440px] flex-col gap-2.5"><span className="text-xs font-semibold uppercase tracking-[0.1em] text-kicker">Attestation vérifiable</span><h3 className="font-display text-2xl font-semibold leading-[1.3]">Un code public, partageable sur LinkedIn. Jamais présentée comme une certification d'État.</h3></div>
            <div aria-hidden className="flex min-w-60 flex-col gap-1.5 rounded-[18px] border border-hairline bg-tint px-5 py-4"><span className="text-[11px] uppercase tracking-[0.1em] text-muted">Code de vérification</span><span className="font-mono text-xl tracking-[0.08em] text-accent">TRL-XXXX-XXXX</span><span className="text-xs text-muted">Exemple de format</span></div>
          </div>
        </div>
      </section>

      {/* FORMATEUR */}
      <section id="formateur" className={`${wrap} py-16 sm:py-24`}>
        <div className="glass mx-auto grid max-w-[1180px] items-center gap-10 rounded-[36px] p-6 sm:p-10 lg:grid-cols-[360px_1fr] lg:gap-14">
          <div className="relative"><div aria-hidden className="absolute inset-5 rounded-[28px] bg-accent opacity-[var(--orb-card)] blur-[50px]" /><div className="relative [&_img]:!size-full [&_img]:!rounded-[28px] [&_img]:!border-hairline"><InstructorPhoto size={360} /></div></div>
          <div className="flex flex-col gap-5">
            <span className={label}>Pourquoi TRAIL ?</span>
            <h2 className="display-light text-4xl leading-[1.12] sm:text-[44px]">Apprendre en construisant, <b>avec quelqu'un qui le fait</b>.</h2>
            <p className="text-[17px] leading-[1.6] text-muted"><strong className="text-fg">{instructor.name}</strong>, Head of AI, formé à Stanford (machine learning) et à Duke University (AI product management). Plus de 10 ans à concevoir, développer et déployer des solutions d'IA pour de grandes organisations.</p>
            <ul className="flex flex-wrap gap-2">{instructor.expertise.map((t) => <li key={t} className="rounded-full border border-hairline px-3.5 py-2 text-[13px]">{t}</li>)}</ul>
            <div className="flex flex-wrap items-center gap-5"><Link href="/formateur" className="font-semibold text-accent hover:underline">Découvrir le parcours du formateur →</Link><Link href="/sessions" className="font-semibold text-muted hover:text-fg">Sessions en visio</Link></div>
          </div>
        </div>
      </section>

      {testimonials.length >= MIN_PUBLISHED_REVIEWS && (
        <section className={`${wrap} py-16`}>
          <div className="mb-8 flex flex-col gap-3"><span className={label}>Témoignages</span><h2 className={H2}>Ce qu'en disent <b>les apprenants</b>.</h2></div>
          <div className="grid gap-4 md:grid-cols-3">{testimonials.map((t) => <figure key={t.id} className="glass rounded-3xl p-6"><blockquote className="text-[15px] leading-[1.6]">« {t.quote} »</blockquote><figcaption className="mt-4 text-sm font-semibold">{t.author_name}{t.author_role && <span className="block text-xs font-normal text-muted">{t.author_role}</span>}</figcaption></figure>)}</div>
        </section>
      )}

      {/* ENTREPRISE */}
      <section id="entreprise" className={`${wrap} grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-14`}>
        <div className="flex flex-col gap-5">
          <span className={label}>Entreprises</span>
          <h2 className={H2}>Formez <b>vos équipes</b>, suivez leur progression.</h2>
          <div className="flex flex-col gap-2.5">{["AI Discovery Workshop", "AI Skills Accelerator", "Enterprise AI Academy"].map((n) => <div key={n} className="glass flex justify-between gap-3 rounded-[18px] px-5 py-[18px]"><span className="font-display font-semibold">{n}</span><span className="text-[13px] text-muted">Sur devis</span></div>)}</div>
          <div><ButtonLink href="/entreprise">Demander un devis</ButtonLink></div>
        </div>
        <div className="glass-strong flex flex-col gap-4 rounded-[30px] p-6 sm:p-7">
          <div className="flex items-center justify-between"><span className="font-display text-base font-semibold">Mon équipe</span><span className="rounded-full bg-tint px-3 py-1.5 text-xs font-semibold">Licences d'équipe</span></div>
          <div className="grid grid-cols-3 gap-3">{[["Sièges actifs", "12 / 15", ""], ["Modules validés", "27", "text-accent"], ["Livrables relus", "31", ""]].map(([k, v, c]) => <div key={k} className="flex flex-col gap-1 rounded-[18px] bg-inset p-4"><span className="text-xs text-muted">{k}</span><span className={`font-display text-2xl font-bold ${c}`}>{v}</span></div>)}</div>
          <div className="flex flex-col gap-3 rounded-[18px] bg-inset p-[18px]"><span className="text-[13px] font-semibold">Progression par module</span>
            {[["M4 Prompt Engineering", 82], ["M5 Context Eng.", 57], ["M10 Responsible AI", 34]].map(([k, v]) => <div key={k} className="grid grid-cols-[130px_1fr_40px] items-center gap-3 text-[13px] sm:grid-cols-[150px_1fr_40px]"><span className="truncate">{k}</span><span className="h-2 overflow-hidden rounded-full bg-tint"><span className="block h-full bg-blue" style={{ width: `${v}%` }} /></span><span>{v} %</span></div>)}
          </div>
          <span className="text-xs text-muted">Données fictives d'illustration</span>
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" className={`${wrap} flex flex-col items-center gap-10 py-20 sm:py-28`}>
        <div className="flex max-w-[760px] flex-col items-center gap-4 text-center"><span className={label}>Trois offres</span><h2 className={H2}>Un module, un parcours, <b>ou tout</b>.</h2><p className="text-[17px] text-muted">Prix TTC, paiement unique, sans abonnement ni option cachée.</p></div>
        <div className="w-full"><OfferCards catalog={catalog} /></div>
        <p className="text-center text-[13px] text-muted">Le paiement en ligne n'ouvre que pour les formations dont l'offre est ouverte. Pour une équipe : <Link href="/entreprise" className="font-semibold text-accent hover:underline">demander un devis</Link>. <Link href="/tarifs" className="font-semibold text-accent hover:underline">Détail des tarifs</Link>.</p>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-[880px] px-4 py-16 sm:px-8 sm:py-24">
        <h2 className="display-light mb-8 text-4xl leading-[1.15] sm:text-[42px]">Questions <b>fréquentes</b></h2>
        <Faq items={faqItems} />
        <p className="mt-5"><Link href="/faq" className="font-semibold text-accent hover:underline">Toutes les questions →</Link></p>
      </section>

      {/* LISTE D'ATTENTE */}
      <section id="liste-attente" className={`${wrap} pb-24 pt-8 sm:pb-32`}>
        <div className="glass-strong relative mx-auto grid max-w-[1180px] items-center gap-10 overflow-hidden rounded-[36px] p-7 sm:p-14 lg:grid-cols-2">
          <svg aria-hidden viewBox="0 0 1180 460" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full"><defs><filter id="wl-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" /></filter></defs><path className="pulse-dot" d="M-20 420 C 220 380, 360 140, 560 220 S 960 400, 1200 60" fill="none" stroke="#3ccfc0" strokeWidth="10" filter="url(#wl-blur)" opacity=".6" /></svg>
          <div className="relative flex flex-col gap-4">
            <h2 className="display-light text-4xl leading-[1.1] sm:text-5xl">Soyez là <b className="text-accent">à l'ouverture</b>.</h2>
            <p className="text-[17px] leading-[1.6] text-muted">Choisissez ce qui vous intéresse. Vous recevrez un seul e-mail à l'ouverture, sans engagement.</p>
            <Link href="/conseiller" className="font-semibold text-accent hover:underline">Pas sûr de votre choix ? Le conseiller vous recommande un parcours →</Link>
          </div>
          <div className="relative rounded-[26px] border border-hairline bg-inset p-6 sm:p-7"><WaitlistForm options={options} /></div>
        </div>
      </section>
    </>
  );
}
