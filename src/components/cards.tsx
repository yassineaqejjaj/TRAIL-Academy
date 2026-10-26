import Link from "next/link";
import { Badge, ButtonLink, Card, kickerCls } from "@/components/ui";
import { availability, coursesOfPath, difficultyLabel, formatEuro, isPathPurchasable, totalHours, type Catalog, type Course, type LearningPath } from "@/lib/catalog";

export function CourseCard({ course, catalog }: { course: Course; catalog: Catalog }) {
  const avail = availability(course, catalog);
  const phase = catalog.phases.find((p) => p.id === course.phaseId);
  const price = catalog.coursePrices[course.slug];
  return (
    <Card className="relative flex h-full flex-col gap-3 transition-colors hover:border-accent">
      <div className="flex items-center justify-between gap-2">
        <span className={`${kickerCls} text-muted`}>{course.code}</span>
        <Badge tone={avail.tone}>{avail.label}</Badge>
      </div>
      <h3 className="text-xl font-bold leading-tight"><Link href={`/formations/${course.slug}`} className="after:absolute after:inset-0">{course.title}</Link></h3>
      <p className="text-sm text-muted">{course.topics.slice(0, 4).join(", ")}.</p>
      <div className="mt-auto flex justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted">{phase?.title} · {difficultyLabel[course.difficulty]}</span>
        {price != null && <span className="whitespace-nowrap font-semibold">{formatEuro(price)} TTC</span>}
      </div>
    </Card>
  );
}

export function PathCard({ path, catalog }: { path: LearningPath; catalog: Catalog }) {
  const list = coursesOfPath(path, catalog);
  const offer = catalog.offers.find((o) => o.slug === path.slug);
  const bundle = path.kind === "bundle";
  return (
    <div className={`flex h-full flex-col gap-3 rounded-2xl bg-surface p-8 ${bundle ? "border-2 border-accent" : "border border-border"}`}>
      {bundle && <span className="self-start rounded-full bg-accent px-3 py-1 text-[13px] font-semibold text-white dark:text-[#06201f]">Le programme complet</span>}
      <span className={`${kickerCls} text-muted`}>{list.length} modules · accès {path.accessMonths} mois · ~{totalHours(list)} h</span>
      <h3 className="text-2xl font-bold leading-tight">{path.title}</h3>
      <p className="text-muted"><strong className="text-fg">Pour qui :</strong> {path.audience}</p>
      <p className="text-muted">{path.tagline}</p>
      <p className="mt-1 flex items-baseline gap-2"><span className="font-display text-4xl font-bold">{offer?.amountCents != null ? formatEuro(offer.amountCents) : "—"}</span><span className="text-sm text-muted">TTC</span></p>
      <div className="mt-auto flex flex-col gap-2 pt-2">
        {isPathPurchasable(path, catalog) && offer?.amountCents != null
          ? <ButtonLink href={`/achat/${path.slug}`} variant="primary">Acheter ce parcours</ButtonLink>
          : <ButtonLink href={`/parcours/${path.slug}`} variant={bundle ? "primary" : "secondary"}>{bundle ? "Découvrir AI Mastery" : "Découvrir le parcours"}</ButtonLink>}
      </div>
    </div>
  );
}
