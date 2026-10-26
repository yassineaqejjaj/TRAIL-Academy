import type { Metadata } from "next";
import Link from "next/link";
import { CourseCard } from "@/components/cards";
import { Button, Chip, Container, EmptyState, kickerCls } from "@/components/ui";
import { difficultyLabel, filterCourses, statusLabel, type CatalogFilters, type Difficulty } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog/load";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbLd, itemListLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Catalogue des formations IA",
  description: "Les modules de formation à l'intelligence artificielle pour professionnels : fondations, productivité, produit, ingénierie.",
  alternates: { canonical: "/formations" },
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const label = `${kickerCls} mb-2 block text-muted`;
const field = "w-full min-h-12 rounded-lg border border-border bg-surface px-4 text-base";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters: CatalogFilters = {
    q: one(sp.q),
    difficulty: (["beginner", "intermediate", "advanced"] as const).find((d) => d === one(sp.difficulty)),
    phase: Number(one(sp.phase)) || undefined,
    path: one(sp.path),
    status: (["published", "coming_soon"] as const).find((s) => s === one(sp.status)),
    maxHours: Number(one(sp.maxHours)) || undefined,
  };
  const catalog = await getCatalog();
  const { phases, learningPaths, courses } = catalog;
  const list = filterCourses(filters, catalog);

  /** Link that toggles one filter while keeping the others. */
  const href = (key: string, value?: string | number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: filters.q, phase: filters.phase, difficulty: filters.difficulty, path: filters.path, status: filters.status, maxHours: filters.maxHours })) if (v) p.set(k, String(v));
    if (value === undefined || String(filters[key as keyof CatalogFilters]) === String(value)) p.delete(key); else p.set(key, String(value));
    const s = p.toString();
    return s ? `/formations?${s}` : "/formations";
  };

  return (
    <>
      <JsonLd data={itemListLd("Catalogue des formations IA", courses.map((c) => ({ name: `${c.code} ${c.title}`, path: `/formations/${c.slug}` })))} />
      <JsonLd data={breadcrumbLd([{ name: "Accueil", path: "/" }, { name: "Formations", path: "/formations" }])} />
      <Container className="pb-6 pt-14">
        <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted"><Link href="/" className="hover:text-fg">Accueil</Link> / Formations</nav>
        <h1 className="mb-3 text-4xl font-bold sm:text-5xl">Les {courses.length} modules TRAIL</h1>
        <p className="max-w-2xl text-muted">Quatre phases, du socle théorique aux systèmes en production. Seules les formations publiées sont achetables.</p>
      </Container>
      <Container className="flex flex-wrap items-start gap-10 pb-24 pt-6">
        <aside aria-label="Filtres" className="flex min-w-60 flex-[0_1_280px] flex-col gap-8">
          <form role="search" action="/formations">
            <label htmlFor="q" className={label}>Recherche</label>
            <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="Prompt, RAG, agents…" className={field} />
            {(["phase", "difficulty", "path", "status", "maxHours"] as const).map((k) => filters[k] ? <input key={k} type="hidden" name={k} value={String(filters[k])} /> : null)}
            <Button type="submit" variant="secondary" className="mt-3 w-full">Rechercher</Button>
          </form>
          <div><span className={label}>Phase</span><div className="flex flex-wrap gap-2"><Chip href={href("phase")} active={!filters.phase}>Toutes</Chip>{phases.map((p) => <Chip key={p.id} href={href("phase", p.id)} active={filters.phase === p.id}>{p.title}</Chip>)}</div></div>
          <div><span className={label}>Niveau</span><div className="flex flex-wrap gap-2"><Chip href={href("difficulty")} active={!filters.difficulty}>Tous</Chip>{(Object.keys(difficultyLabel) as Difficulty[]).map((d) => <Chip key={d} href={href("difficulty", d)} active={filters.difficulty === d}>{difficultyLabel[d]}</Chip>)}</div></div>
          <details open={Boolean(filters.path || filters.status || filters.maxHours)}>
            <summary className={`${kickerCls} text-muted`}>Plus de filtres</summary>
            <div className="mt-4 flex flex-col gap-6">
              <div><span className={label}>Parcours</span><div className="flex flex-wrap gap-2">{learningPaths.map((p) => <Chip key={p.slug} href={href("path", p.slug)} active={filters.path === p.slug}>{p.title}</Chip>)}</div></div>
              <div><span className={label}>Disponibilité</span><div className="flex flex-wrap gap-2"><Chip href={href("status", "published")} active={filters.status === "published"}>{statusLabel.published}</Chip><Chip href={href("status", "coming_soon")} active={filters.status === "coming_soon"}>{statusLabel.coming_soon}</Chip></div></div>
              <div><span className={label}>Durée estimée</span><div className="flex flex-wrap gap-2">{[5, 6, 8].map((h) => <Chip key={h} href={href("maxHours", h)} active={filters.maxHours === h}>≤ {h} h</Chip>)}</div></div>
            </div>
          </details>
          <p className="text-sm text-muted">Les niveaux et durées sont indicatifs, à confirmer avec le formateur. Prix détaillés sur chaque fiche.</p>
        </aside>
        <div className="min-w-0 flex-[999_1_640px]">
          <p aria-live="polite" className="mb-6 text-[15px] text-muted">{list.length} module{list.length > 1 ? "s" : ""} affiché{list.length > 1 ? "s" : ""} sur {courses.length}</p>
          {list.length === 0 ? <EmptyState title="Aucun module ne correspond">Modifiez votre recherche ou retirez un filtre.</EmptyState> : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{list.map((c) => <CourseCard key={c.code} course={c} catalog={catalog} />)}</div>
          )}
        </div>
      </Container>
    </>
  );
}
