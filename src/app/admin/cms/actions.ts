"use server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { flash, formData, revalidatePublic, withAdmin } from "@/lib/admin/ctx";
import { faqSchema, postSchema, sectionSchema, testimonialSchema } from "@/lib/admin/schemas";
import { editableSections } from "@/lib/cms-registry";

const P = "/admin/cms";
const uuid = z.string().uuid();
const issue = (e: z.ZodError) => e.issues[0]?.message ?? "Formulaire invalide.";

export async function saveSection(page: string, key: string, fd: FormData) {
  const admin = await requireAdmin();
  const def = editableSections.find((s) => s.page === page && s.key === key);
  if (!def) flash(P, "error", "Bloc inconnu.");
  const p = sectionSchema.safeParse(formData(fd));
  if (!p.success) flash(P, "error", issue(p.error));
  const content = JSON.stringify({ title: p.data!.title ?? null, subtitle: p.data!.subtitle ?? null, body_md: p.data!.bodyMd ?? null });
  await withAdmin(admin, P, async (q) => {
    const row = await q.one<{ id: string }>(
      `insert into pages (slug, title, status, requires_legal_review) values ($1, $2, 'published', $3)
       on conflict (slug) do update set slug = excluded.slug returning id`, [page, def!.pageTitle, Boolean(def!.legal)]);
    await q("insert into page_sections (page_id, key, content, position) values ($1, $2, $3::jsonb, 1) on conflict (page_id, key) do update set content = excluded.content", [row!.id, key, content]);
  });
  revalidatePublic();
  flash(P, "ok", def!.legal ? "Texte enregistré. Il doit être validé par un professionnel du droit avant le lancement." : "Contenu enregistré.");
}

export async function addFaq(fd: FormData) {
  const admin = await requireAdmin();
  const p = faqSchema.safeParse(formData(fd));
  if (!p.success) flash(P, "error", issue(p.error));
  await withAdmin(admin, P, (q) => q("insert into faq_items (scope, question, answer, position, status) values ('global', $1, $2, $3, $4)", [p.data!.question, p.data!.answer, p.data!.position, p.data!.published ? "published" : "draft"]));
  revalidatePublic();
  flash(P, "ok", "Question ajoutée.");
}
export async function toggleFaq(id: string, publish: boolean) {
  const admin = await requireAdmin();
  await withAdmin(admin, P, (q) => q("update faq_items set status = $2 where id = $1", [id, publish ? "published" : "draft"]));
  revalidatePublic();
  flash(P, "ok", publish ? "Question publiée." : "Question dépubliée.");
}
export async function deleteFaq(id: string) {
  const admin = await requireAdmin();
  await withAdmin(admin, P, (q) => q("delete from faq_items where id = $1", [id]));
  revalidatePublic();
  flash(P, "ok", "Question supprimée.");
}

// Testimonials are never invented: publishing requires explicit verification and a consent reference.
export async function addTestimonial(fd: FormData) {
  const admin = await requireAdmin();
  const p = testimonialSchema.safeParse(formData(fd));
  if (!p.success) flash(P, "error", issue(p.error));
  const v = p.data!;
  await withAdmin(admin, P, (q) => q(
    "insert into testimonials (author_name, author_role, quote, consent_reference, verified_at, status) values ($1, $2, $3, $4, $5, $6)",
    [v.authorName, v.authorRole ?? null, v.quote, v.consentReference ?? null, v.publish ? new Date().toISOString() : null, v.publish ? "published" : "draft"]));
  revalidatePublic();
  flash(P, "ok", v.publish ? "Témoignage publié." : "Témoignage enregistré en brouillon.");
}
export async function unpublishTestimonial(id: string) {
  const admin = await requireAdmin();
  await withAdmin(admin, P, (q) => q("update testimonials set status = 'draft' where id = $1", [id]));
  revalidatePublic();
  flash(P, "ok", "Témoignage dépublié.");
}
export async function deleteTestimonial(id: string) {
  const admin = await requireAdmin();
  await withAdmin(admin, P, (q) => q("delete from testimonials where id = $1", [id]));
  revalidatePublic();
  flash(P, "ok", "Témoignage supprimé.");
}

export async function createPost(fd: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ slug: postSchema.shape.slug, title: postSchema.shape.title }).safeParse(formData(fd));
  if (!p.success) flash(P, "error", issue(p.error));
  const row = await withAdmin(admin, P, (q) => q.one<{ id: string }>("insert into blog_posts (slug, title, body_md) values ($1, $2, '') returning id", [p.data!.slug, p.data!.title]));
  flash(`${P}/articles/${row!.id}`, "ok", "Brouillon créé.");
}

export async function savePost(id: string, fd: FormData) {
  const admin = await requireAdmin();
  const path = `${P}/articles/${id}`;
  const p = postSchema.safeParse(formData(fd));
  if (!p.success) flash(path, "error", issue(p.error));
  const v = p.data!;
  const related = fd.getAll("related").map(String).filter((x) => uuid.safeParse(x).success);
  await withAdmin(admin, path, async (q) => {
    const cur = await q.one<{ published_at: string | null }>("select published_at from blog_posts where id = $1", [id]);
    await q(
      `update blog_posts set slug = $2, title = $3, excerpt = $4, body_md = $5, category = $6, seo_title = $7, seo_description = $8,
         related_course_ids = $9::uuid[], status = $10, published_at = $11 where id = $1`,
      [id, v.slug, v.title, v.excerpt ?? null, v.bodyMd, v.category ?? null, v.seoTitle ?? null, v.seoDescription ?? null, related,
        v.publish ? "published" : "draft", v.publish ? cur?.published_at ?? new Date().toISOString() : null]);
  });
  revalidatePublic();
  flash(path, "ok", v.publish ? "Article publié." : "Article enregistré en brouillon.");
}

export async function deletePost(id: string) {
  const admin = await requireAdmin();
  await withAdmin(admin, P, (q) => q("delete from blog_posts where id = $1", [id]));
  revalidatePublic();
  flash(P, "ok", "Article supprimé.");
}
