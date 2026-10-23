import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfigured } from "./env";

export interface SectionContent { title?: string; subtitle?: string; body_md?: string }
export interface Faq { id: string; question: string; answer: string }
export interface Testimonial { id: string; author_name: string; author_role: string | null; quote: string }
export interface Post { id: string; slug: string; title: string; excerpt: string | null; body_md: string; category: string | null; related_course_ids: string[]; seo_title: string | null; seo_description: string | null; published_at: string | null }

/** Public, anonymous reads (RLS only exposes published content). Each helper degrades to "nothing" so pages use their fallbacks. */
function publicDb() {
  if (!supabaseConfigured()) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
}

export async function getSection(page: string, key: string): Promise<SectionContent | null> {
  const db = publicDb();
  if (!db) return null;
  try {
    const { data: p } = await db.from("pages").select("id").eq("slug", page).eq("status", "published").maybeSingle();
    if (!p) return null;
    const { data } = await db.from("page_sections").select("content").eq("page_id", p.id).eq("key", key).maybeSingle();
    const c = (data?.content ?? null) as SectionContent | null;
    return c && (c.title || c.subtitle || c.body_md) ? c : null;
  } catch { return null; }
}

export async function getFaq(scope = "global"): Promise<Faq[]> {
  const db = publicDb();
  if (!db) return [];
  try { return ((await db.from("faq_items").select("id, question, answer").eq("scope", scope).eq("status", "published").order("position")).data ?? []) as Faq[]; } catch { return []; }
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const db = publicDb();
  if (!db) return [];
  try { return ((await db.from("testimonials").select("id, author_name, author_role, quote").eq("status", "published")).data ?? []) as Testimonial[]; } catch { return []; }
}

const postCols = "id, slug, title, excerpt, body_md, category, related_course_ids, seo_title, seo_description, published_at";
export async function getPosts(): Promise<Post[]> {
  const db = publicDb();
  if (!db) return [];
  try { return ((await db.from("blog_posts").select(postCols).eq("status", "published").order("published_at", { ascending: false })).data ?? []) as Post[]; } catch { return []; }
}
export async function getPost(slug: string): Promise<Post | null> {
  const db = publicDb();
  if (!db) return null;
  try { return ((await db.from("blog_posts").select(postCols).eq("slug", slug).eq("status", "published").maybeSingle()).data ?? null) as Post | null; } catch { return null; }
}
