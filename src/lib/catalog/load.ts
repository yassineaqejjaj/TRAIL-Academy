import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfigured } from "@/lib/env";
import { staticCatalog } from "./index";
import { mapCatalog, type CatalogRows } from "./map";
import type { Catalog } from "./types";

/**
 * Loads the public catalog from the database with the anon key (RLS exposes only public data).
 * Falls back to the static seed data when Supabase is not configured, empty, or unreachable.
 */
export async function getCatalog(): Promise<Catalog> {
  if (!supabaseConfigured()) return staticCatalog;
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const [phases, courses, prerequisites, paths, pathCourses, products] = await Promise.all([
      db.from("learning_phases").select("id, slug, title, summary"),
      db.from("courses").select("id, code, slug, title, summary, phase_id, position, status, difficulty, duration_hours, topics, tools, outcomes, deliverable, is_mvp_slot"),
      db.from("course_prerequisites").select("course_id, prerequisite_id"),
      db.from("learning_paths").select("id, slug, title, tagline, audience, is_bundle, access_months"),
      db.from("learning_path_courses").select("path_id, course_id, position"),
      db.from("products").select("slug, kind, title, active, access_months, seats, course_id, prices(amount_cents, tax_inclusive, active)"),
    ]);
    const failed = [phases, courses, prerequisites, paths, pathCourses, products].find((r) => r.error);
    if (failed?.error) throw failed.error;
    if (!courses.data?.length) return staticCatalog;
    return mapCatalog({ phases: phases.data!, courses: courses.data as CatalogRows["courses"], prerequisites: prerequisites.data!, paths: paths.data!, pathCourses: pathCourses.data!, products: products.data as unknown as CatalogRows["products"] });
  } catch (e) {
    console.error("catalog: falling back to static data", e);
    return staticCatalog;
  }
}
