import Link from "next/link";
import { masteryBenefits } from "@/lib/faq-data";
import { Badge, ButtonLink, kickerCls } from "@/components/ui";
import { coursesOfPath, formatEuro, isPathPurchasable, type Catalog, type LearningPath } from "@/lib/catalog";

function Includes({ extra }: { extra?: string }) {
  return <ul className="flex flex-col gap-1.5 text-[15px] text-muted">{extra && <li className="font-medium text-fg">{extra}</li>}{included.map((i) => <li key={i}>✓ {i}</li>)}</ul>;
}

const included = ["Leçons vidéo et exercices pratiques", "Ressources à télécharger", "Quiz corrigés automatiquement", "Livrables relus par le formateur", "Attestation de réussite privée et vérifiable"];

/** Sum of the individual prices of a path's modules: the honest "à l'unité" comparison. */
function unitTotal(path: LearningPath, catalog: Catalog): number {
  return coursesOfPath(path, catalog).reduce((sum, c) => sum + (catalog.coursePrices[c.slug] ?? 0), 0);
}

/**
 * The three public offers: Module, Parcours, AI Mastery. Built from the catalogue (database or seed), so prices, content
 * and availability always match what the administrator configured. Nothing is shown as buyable unless its offer is open.
 */
export function OfferCards({ catalog }: { catalog: Catalog }) {
  const moduleOffer = catalog.offers.find((o) => o.slug === "module");
  const paths = catalog.learningPaths.filter((p) => p.kind === "path");
  const pathOffers = paths.map((p) => ({ path: p, offer: catalog.offers.find((o) => o.slug === p.slug) })).filter((x) => x.offer?.amountCents != null);
  const mastery = catalog.learningPaths.find((p) => p.kind === "bundle");
  const masteryOffer = mastery ? catalog.offers.find((o) => o.slug === mastery.slug) : undefined;
  const open = (slug: string) => catalog.openCourses.length > 0 && catalog.offers.find((o) => o.slug === slug)?.active === true;
  const pathPrice = pathOffers.length ? Math.min(...pathOffers.map((x) => x.offer!.amountCents!)) : null;
  const pathFrom = pathOffers.length > 1 && new Set(pathOffers.map((x) => x.offer!.amountCents)).size > 1;

  const card = "glass relative flex h-full flex-col gap-4 rounded-[26px] p-8";
  const price = (cents: number | null | undefined, from?: boolean) => cents == null ? null : (
    <p className="flex items-baseline gap-2">{from && <span className="text-sm text-muted">dès</span>}<span className="font-display text-4xl font-bold">{formatEuro(cents)}</span><span className="text-sm text-muted">TTC</span></p>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {moduleOffer?.amountCents != null && (
        <section className={card} aria-label="Module">
          <p className={`${kickerCls} text-muted`}>À la carte</p>
          <h3 className="text-2xl font-bold">Un module</h3>
          <p className="text-muted">Un sujet précis, à votre rythme : de Prompt Engineering à la sécurité des LLM.</p>
          {price(moduleOffer.amountCents, moduleOffer.priceFrom)}
          <p className="-mt-2 text-sm text-muted">Accès {moduleOffer.accessMonths} mois · {catalog.courses.length} modules au choix</p>
          <Includes />
          <div className="mt-auto pt-2"><ButtonLink href="/formations" variant="secondary" className="w-full">Choisir un module</ButtonLink></div>
        </section>
      )}

      {pathPrice != null && (
        <section className={`${card} !border-accent/50 !bg-accent-soft shadow-[0_30px_80px_rgba(11,122,131,0.3)]`} aria-label="Parcours">
          <span className="absolute -top-3.5 left-8 rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-on-accent">Le plus adapté pour un métier</span>
          <p className={`${kickerCls} text-muted`}>Une trajectoire métier</p>
          <h3 className="text-2xl font-bold">Un parcours</h3>
          <p className="text-muted">Les modules dans l'ordre recommandé pour votre métier. {paths.length} parcours au choix, au même prix : produit et IA, marketing et communication, RH, juridique, finance.</p>
          {price(pathPrice, pathFrom)}
          <p className="-mt-2 text-sm text-muted">Accès {paths[0]?.accessMonths ?? 18} mois</p>
          <ul className="flex flex-col gap-3 rounded-2xl bg-black/25 p-4 text-[15px]">
            {pathOffers.map(({ path }) => {
              const n = coursesOfPath(path, catalog).length, total = unitTotal(path, catalog);
              return (
                <li key={path.slug}>
                  <Link href={`/parcours/${path.slug}`} className="font-semibold text-accent hover:underline">{path.title}</Link>
                  <span className="block text-muted">{n} modules{total > 0 ? ` · au lieu de ${formatEuro(total)} à l'unité` : ""}</span>
                  {!open(path.slug) && <span className="mt-1 inline-block"><Badge tone="warn">Bientôt disponible</Badge></span>}
                </li>
              );
            })}
          </ul>
          <Includes />
          <div className="mt-auto pt-2"><ButtonLink href="/parcours" variant="secondary" className="w-full">Comparer les parcours</ButtonLink></div>
        </section>
      )}

      {mastery && masteryOffer?.amountCents != null && (
        <section className={card} aria-label="AI Mastery">
          <span className="self-start rounded-full border border-accent/35 bg-accent-soft px-3 py-1 text-[13px] font-semibold text-accent">L'accès complet</span>
          <h3 className="text-2xl font-bold">AI Mastery</h3>
          <p className="text-muted">Les {catalog.courses.length} modules et les {paths.length} parcours : de la stratégie aux systèmes en production, et toutes les fonctions métier.</p>
          {price(masteryOffer.amountCents)}
          <p className="-mt-2 text-sm text-muted">Accès {mastery.accessMonths} mois · au lieu de {formatEuro(catalog.courses.reduce((s, c) => s + (catalog.coursePrices[c.slug] ?? 0), 0))} à l'unité</p>
          <Includes extra={`${catalog.courses.length} modules et les ${paths.length} parcours`} />
          <ul className="flex flex-col gap-1.5 text-sm text-muted">{masteryBenefits(catalog.courses.length, paths.length).slice(0, 2).map((b) => <li key={b}>• {b}</li>)}</ul>
          <div className="mt-auto pt-2">
            {isPathPurchasable(mastery, catalog) ? <ButtonLink href={`/achat/${mastery.slug}`} className="w-full">Acheter AI Mastery</ButtonLink>
              : <><Badge tone="warn">Bientôt disponible</Badge><p className="mt-2 text-sm text-muted">L'achat s'ouvre quand les modules sont publiés et validés.</p></>}
          </div>
        </section>
      )}
    </div>
  );
}
