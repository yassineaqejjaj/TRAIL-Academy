import "server-only";
import { asAnon } from "@/lib/db";
import { dbConfigured } from "@/lib/db/pool";
import { staticCatalog } from "./index";
import { mapCatalog, type CatalogRows } from "./map";
import type { Catalog } from "./types";

/**
 * Loads the public catalogue from PostgreSQL as the `anon` role (Row Level Security exposes only public data).
 * Falls back to the static seed data when no database is configured, it is empty, or it is unreachable.
 */
const TTL_MS = 30_000;
let memo: { at: number; value: Catalog } | null = null;

/** The catalogue changes rarely and costs about ten database round trips: reuse it for 30 s per warm instance (production only). */
export async function getCatalog(): Promise<Catalog> {
  if (process.env.NODE_ENV !== "production") return loadCatalog();
  if (memo && Date.now() - memo.at < TTL_MS) return memo.value;
  const value = await loadCatalog();
  memo = { at: Date.now(), value };
  return value;
}

async function loadCatalog(): Promise<Catalog> {
  if (!dbConfigured()) return staticCatalog;
  try {
    const rows = await asAnon(async (q) => ({
      phases: await q<CatalogRows["phases"][number]>("select id, slug, title, summary from learning_phases"),
      courses: await q<CatalogRows["courses"][number]>("select id, code, slug, title, summary, phase_id, position, status, difficulty, duration_hours, topics, tools, outcomes, deliverable, is_mvp_slot from courses"),
      prerequisites: await q<CatalogRows["prerequisites"][number]>("select course_id, prerequisite_id from course_prerequisites"),
      paths: await q<CatalogRows["paths"][number]>("select id, slug, title, tagline, audience, is_bundle, access_months from learning_paths"),
      pathCourses: await q<CatalogRows["pathCourses"][number]>("select path_id, course_id, position from learning_path_courses"),
      products: await q<CatalogRows["products"][number]>(`
        select p.slug, p.kind, p.title, p.note, p.price_from, p.active, p.access_months, p.seats, p.course_id,
               coalesce(json_agg(json_build_object('amount_cents', pr.amount_cents, 'tax_inclusive', pr.tax_inclusive, 'active', pr.active)) filter (where pr.id is not null), '[]') as prices
        from products p left join prices pr on pr.product_id = p.id group by p.id`),
    }));
    return rows.courses.length ? mapCatalog(rows) : staticCatalog;
  } catch (e) {
    console.error("catalog: falling back to static data", (e as Error).message);
    return staticCatalog;
  }
}
