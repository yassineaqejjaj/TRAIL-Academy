import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InterestForm } from "@/components/interest-form";
import { Badge, ButtonLink, Container, kickerCls } from "@/components/ui";
import { difficultyLabel, formatEuro, getCourse, getCourseByCode, isPurchasable, pathsOfCourse } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog/load";
import { site } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const course = getCourse((await params).slug, await getCatalog());
  if (!course) return {};
  return { title: `${course.title} — formation`, description: course.summary, alternates: { canonical: `/formations/${course.slug}` }, openGraph: { title: course.title, description: course.summary, url: `/formations/${course.slug}` } };
}

const included = ["Formation vidéo à la demande", "Exercices pratiques", "Ressources à télécharger", "Quiz et évaluations", "Suivi de progression", "Attestation de réussite privée"];
const faq = [
  { q: "Combien de temps ai-je accès au module ?", a: "12 mois à partir de la date d'achat." },
  { q: "Le livrable est-il noté par une IA ?", a: "Non. Les quiz sont corrigés automatiquement ; le livrable pratique est relu par le formateur." },
  { q: "Puis-je télécharger les vidéos ?", a: "Les vidéos sont diffusées en streaming sécurisé. Les ressources de chaque leçon sont téléchargeables." },
];

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const catalog = await getCatalog();
  const course = getCourse((await params).slug, catalog);
  if (!course) notFound();
  const phase = catalog.phases.find((p) => p.id === course.phaseId);
  const priceCents = catalog.coursePrices[course.slug] ?? catalog.offers.find((o) => o.slug === "module-standard")?.amountCents ?? null;
  const paths = pathsOfCourse(course, catalog);
  const purchasable = isPurchasable(course);
  const prereqs = course.prerequisites.map((c) => getCourseByCode(c, catalog)).filter(Boolean);

  const jsonLd = { "@context": "https://schema.org", "@type": "Course", name: course.title, description: course.summary, provider: { "@type": "Organization", name: site.name, url: site.url } };
  const box = "rounded-xl border border-border bg-surface p-6";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Container className="pt-10">
        <nav aria-label="Fil d'Ariane" className="text-sm text-muted"><Link href="/" className="hover:text-fg">Accueil</Link> / <Link href="/formations" className="hover:text-fg">Formations</Link> / <span aria-current="page">{course.title}</span></nav>
      </Container>
      <Container className="flex flex-wrap items-start gap-14 pb-24 pt-8">
        <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-14">
          <section>
            <p className={`${kickerCls} mb-4 text-muted`}>{course.code} · Phase {course.phaseId} · {phase?.title}</p>
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl">{course.title}</h1>
            <p className="mb-6 text-[19px] text-muted [text-wrap:pretty]">{course.summary}</p>
            <div className="mb-4 flex flex-wrap gap-2"><Badge tone={purchasable ? "accent" : "warn"}>{purchasable ? "Disponible" : "Bientôt disponible"}</Badge>{priceCents != null && <span className="rounded-full border border-border px-3 py-1 text-[13px] font-semibold">{formatEuro(priceCents)} TTC</span>}</div>
            <div className="flex flex-wrap gap-6 text-sm text-muted"><span><strong className="font-semibold text-fg">Accès :</strong> 12 mois</span><span><strong className="font-semibold text-fg">Durée estimée :</strong> ~{course.durationHours} h</span><span><strong className="font-semibold text-fg">Niveau :</strong> {difficultyLabel[course.difficulty]}</span></div>
          </section>

          <section aria-label="Aperçu"><div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-muted p-6 text-center text-[15px] text-muted">Aperçu gratuit : une leçon d'essai sera proposée avec le contenu publié.</div></section>

          <section>
            <h2 className="mb-2 text-2xl font-bold">À la fin de cette formation</h2>
            <p className="mb-6 text-muted">Vous serez capable de :</p>
            <ul>{course.outcomes.map((o) => <li key={o} className="border-t border-border py-4">{o}</li>)}<li aria-hidden className="border-t border-border" /></ul>
            <p className="mt-2 text-sm text-muted">Compétences visées, à valider par le formateur avant publication.</p>
          </section>

          <section>
            <h2 className="mb-6 text-2xl font-bold">Programme</h2>
            <div>{course.topics.map((t, i) => (
              <details key={t} className="border-t border-border py-2"><summary className="flex min-h-11 items-center gap-4 font-semibold"><span className="min-w-6 text-accent">{String(i + 1).padStart(2, "0")}</span>{t}</summary><p className="mb-3 ml-10 text-[15px] text-muted">{purchasable ? "Leçons, exercices et ressources de ce thème." : "Détail des leçons publié avec le contenu validé par le formateur."}</p></details>
            ))}<div className="border-t border-border" /></div>
          </section>

          <section>
            <h2 className="mb-6 text-2xl font-bold">Avant de commencer</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className={box}><div className="mb-1 font-semibold">Prérequis recommandés</div><div className="text-[15px] text-muted">{prereqs.length ? prereqs.map((p) => `${p!.code} · ${p!.title}`).join(", ") : "Aucun."}</div></div>
              <div className={box}><div className="mb-1 font-semibold">Outils nécessaires</div><div className="text-[15px] text-muted">{course.tools.join(", ") || "Aucun outil particulier."}</div></div>
              <div className={box}><div className="mb-1 font-semibold">Livrable attendu</div><div className="text-[15px] text-muted">{course.deliverable || "À définir avec le formateur."}</div></div>
              <div className={box}><div className="mb-1 font-semibold">Évaluation</div><div className="text-[15px] text-muted">Quiz avec seuil de réussite et livrable relu par le formateur.</div></div>
            </div>
          </section>

          <section>
            <h2 className="mb-6 text-2xl font-bold">Questions sur cette formation</h2>
            <div>{faq.map((f) => <details key={f.q} className="border-t border-border py-4"><summary className="flex min-h-11 items-center font-semibold">{f.q}</summary><p className="mt-2 text-muted">{f.a}</p></details>)}<div className="border-t border-border" /></div>
          </section>
        </div>

        <aside aria-label="Achat" className="flex min-w-0 max-w-[420px] flex-[1_1_340px] flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-8">
            {purchasable ? (
              <>
                <div><div className="flex items-baseline gap-2"><span className="font-display text-4xl font-bold">{priceCents != null ? formatEuro(priceCents) : "—"}</span><span className="text-sm text-muted">TTC</span></div><div className="text-sm text-muted">Paiement unique · accès 12 mois</div></div>
                <ButtonLink href={`/achat/${course.slug}`} className="min-h-[52px]">Acheter ce module</ButtonLink>
                <p className="text-sm text-muted">Paiement sécurisé par Stripe. Code promo possible à l'étape de paiement. <Link href="/legal/conditions-de-vente" className="font-semibold text-accent hover:underline">Conditions de vente</Link>.</p>
              </>
            ) : (
              <>
                <Badge tone="warn">Bientôt disponible</Badge>
                <p className="text-[15px] text-muted">Ce module n'est pas encore publié : il ne peut pas être acheté. Indiquez votre e-mail pour être prévenu à sa sortie.</p>
                <InterestForm kind="course_launch" courseSlug={course.slug} label="Adresse e-mail (sans paiement)" submitLabel="Me prévenir" />
                {priceCents != null && <p className="text-sm text-muted">Prix prévu : {formatEuro(priceCents)} TTC, accès 12 mois.</p>}
              </>
            )}
            <div className="border-t border-border pt-4"><div className="mb-2 font-semibold">Inclus dans le module</div><ul className="flex flex-col gap-1.5 text-[15px] text-muted">{included.map((i) => <li key={i}>{i}</li>)}<li>Accès pendant 12 mois</li></ul></div>
          </div>
          {paths.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-2 font-semibold">Aussi inclus dans</div>
              <ul className="mb-4 flex flex-col gap-1.5 text-[15px] text-muted">{paths.map((p) => { const o = catalog.offers.find((x) => x.slug === p.slug); return <li key={p.slug}>{p.title}{o?.amountCents != null ? ` · ${formatEuro(o.amountCents)} TTC` : ""}</li>; })}</ul>
              <Link href="/tarifs" className="text-[15px] font-semibold text-accent hover:underline">Comparer les offres</Link>
            </div>
          )}
        </aside>
      </Container>
    </>
  );
}
