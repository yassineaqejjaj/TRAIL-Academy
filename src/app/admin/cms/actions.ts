"use server";
import { z } from "zod";
import { adminDb, dbMessage, flash, formData, revalidatePublic } from "@/lib/admin/ctx";
import { faqSchema, postSchema, sectionSchema, testimonialSchema } from "@/lib/admin/schemas";
import { editableSections } from "@/lib/cms-registry";

const P = "/admin/cms";
const uuid = z.string().uuid();
const issue = (e: z.ZodError) => e.issues[0]?.message ?? "Formulaire invalide.";

export async function saveSection(page: string, key: string, fd: FormData) {
  const { db } = await adminDb();
  const def = editableSections.find((s) => s.page === page && s.key === key);
  if (!def) flash(P, "error", "Bloc inconnu.");
  const p = sectionSchema.safeParse(formData(fd));
  if (!p.success) flash(P, "error", issue(p.error));
  const { data: row, error: e1 } = await db.from("pages").upsert({ slug: page, title: def!.pageTitle, status: "published", requires_legal_review: !!def!.legal }, { onConflict: "slug", ignoreDuplicates: true }).select("id").maybeSingle();
  let pageId = row?.id as string | undefined;
  if (!pageId) pageId = (await db.from("pages").select("id").eq("slug", page).single()).data?.id;
  if (e1 || !pageId) flash(P, "error", dbMessage(e1));
  const content = { title: p.data!.title ?? null, subtitle: p.data!.subtitle ?? null, body_md: p.data!.bodyMd ?? null };
  const { error } = await db.from("page_sections").upsert({ page_id: pageId, key, content, position: 1 }, { onConflict: "page_id,key" });
  if (error) flash(P, "error", dbMessage(error));
  revalidatePublic();
  flash(P, "ok", def!.legal ? "Texte enregistré. Il doit être validé par un professionnel du droit avant le lancement." : "Contenu enregistré.");
}

export async function addFaq(fd: FormData) {
  const { db } = await adminDb();
  const p = faqSchema.safeParse(formData(fd));
  if (!p.success) flash(P, "error", issue(p.error));
  const { error } = await db.from("faq_items").insert({ scope: "global", question: p.data!.question, answer: p.data!.answer, position: p.data!.position, status: p.data!.published ? "published" : "draft" });
  if (error) flash(P, "error", dbMessage(error));
  revalidatePublic();
  flash(P, "ok", "Question ajoutée.");
}
export async function toggleFaq(id: string, publish: boolean) {
  const { db } = await adminDb();
  await db.from("faq_items").update({ status: publish ? "published" : "draft" }).eq("id", id);
  revalidatePublic();
  flash(P, "ok", publish ? "Question publiée." : "Question dépubliée.");
}
export async function deleteFaq(id: string) {
  const { db } = await adminDb();
  await db.from("faq_items").delete().eq("id", id);
  revalidatePublic();
  flash(P, "ok", "Question supprimée.");
}

// Testimonials are never invented: publishing requires explicit verification and a consent reference.
export async function addTestimonial(fd: FormData) {
  const { db } = await adminDb();
  const p = testimonialSchema.safeParse(formData(fd));
  if (!p.success) flash(P, "error", issue(p.error));
  const v = p.data!;
  const { error } = await db.from("testimonials").insert({
    author_name: v.authorName, author_role: v.authorRole ?? null, quote: v.quote, consent_reference: v.consentReference ?? null,
    verified_at: v.publish ? new Date().toISOString() : null, status: v.publish ? "published" : "draft",
  });
  if (error) flash(P, "error", dbMessage(error));
  revalidatePublic();
  flash(P, "ok", v.publish ? "Témoignage publié." : "Témoignage enregistré en brouillon.");
}
export async function unpublishTestimonial(id: string) {
  const { db } = await adminDb();
  await db.from("testimonials").update({ status: "draft" }).eq("id", id);
  revalidatePublic();
  flash(P, "ok", "Témoignage dépublié.");
}
export async function deleteTestimonial(id: string) {
  const { db } = await adminDb();
  await db.from("testimonials").delete().eq("id", id);
  revalidatePublic();
  flash(P, "ok", "Témoignage supprimé.");
}

export async function createPost(fd: FormData) {
  const { db } = await adminDb();
  const p = z.object({ slug: postSchema.shape.slug, title: postSchema.shape.title }).safeParse(formData(fd));
  if (!p.success) flash(P, "error", issue(p.error));
  const { data, error } = await db.from("blog_posts").insert({ slug: p.data!.slug, title: p.data!.title, body_md: "" }).select("id").single();
  if (error || !data) flash(P, "error", dbMessage(error));
  flash(`${P}/articles/${data!.id}`, "ok", "Brouillon créé.");
}

export async function savePost(id: string, fd: FormData) {
  const { db } = await adminDb();
  const path = `${P}/articles/${id}`;
  const p = postSchema.safeParse(formData(fd));
  if (!p.success) flash(path, "error", issue(p.error));
  const v = p.data!;
  const related = fd.getAll("related").map(String).filter((x) => uuid.safeParse(x).success);
  const { data: cur } = await db.from("blog_posts").select("published_at").eq("id", id).single();
  const { error } = await db.from("blog_posts").update({
    slug: v.slug, title: v.title, excerpt: v.excerpt ?? null, body_md: v.bodyMd, category: v.category ?? null, seo_title: v.seoTitle ?? null, seo_description: v.seoDescription ?? null,
    related_course_ids: related, status: v.publish ? "published" : "draft", published_at: v.publish ? cur?.published_at ?? new Date().toISOString() : null,
  }).eq("id", id);
  if (error) flash(path, "error", dbMessage(error));
  revalidatePublic();
  flash(path, "ok", v.publish ? "Article publié." : "Article enregistré en brouillon.");
}

export async function deletePost(id: string) {
  const { db } = await adminDb();
  await db.from("blog_posts").delete().eq("id", id);
  revalidatePublic();
  flash(P, "ok", "Article supprimé.");
}
