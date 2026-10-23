import "server-only";
import { asAnon } from "@/lib/db";
import { dbConfigured } from "@/lib/db/pool";

export interface SectionContent { title?: string; subtitle?: string; body_md?: string }
export interface Faq { id: string; question: string; answer: string }
export interface Testimonial { id: string; author_name: string; author_role: string | null; quote: string }
export interface Post { id: string; slug: string; title: string; excerpt: string | null; body_md: string; category: string | null; related_course_ids: string[]; seo_title: string | null; seo_description: string | null; published_at: string | null }

/** Public reads (RLS only exposes published content). Each helper degrades to "nothing" so pages use their built-in copy. */
async function safe<T>(fallback: T, fn: Parameters<typeof asAnon<T>>[0]): Promise<T> {
  if (!dbConfigured()) return fallback;
  try { return await asAnon(fn); } catch { return fallback; }
}

export async function getSection(page: string, key: string): Promise<SectionContent | null> {
  return safe(null, async (q) => {
    const row = await q.one<{ content: SectionContent }>(
      "select s.content from page_sections s join pages p on p.id = s.page_id where p.slug = $1 and p.status = 'published' and s.key = $2", [page, key]);
    const c = row?.content;
    return c && (c.title || c.subtitle || c.body_md) ? c : null;
  });
}

export const getFaq = (scope = "global") =>
  safe<Faq[]>([], (q) => q("select id, question, answer from faq_items where scope = $1 and status = 'published' order by position", [scope]));

export const getTestimonials = () =>
  safe<Testimonial[]>([], (q) => q("select id, author_name, author_role, quote from testimonials where status = 'published'"));

const postCols = "id, slug, title, excerpt, body_md, category, related_course_ids, seo_title, seo_description, published_at";
export const getPosts = () =>
  safe<Post[]>([], (q) => q(`select ${postCols} from blog_posts where status = 'published' order by published_at desc nulls last`));

export const getPost = (slug: string) =>
  safe<Post | null>(null, (q) => q.one<Post>(`select ${postCols} from blog_posts where slug = $1 and status = 'published'`, [slug]));
