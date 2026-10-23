import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui";
import { adminPage } from "@/lib/admin/ctx";
import { ActionButton, Check, Field, Flash, Input, Panel, Select, Textarea } from "../../../ui";
import { deletePost, savePost } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Article — administration", robots: { index: false } };

export default async function AdminPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const data = await adminPage(async (q) => {
    const p = await q.one<{ id: string; slug: string; title: string; excerpt: string | null; body_md: string; category: string | null; seo_title: string | null; seo_description: string | null; related_course_ids: string[]; status: string }>("select * from blog_posts where id = $1", [id]);
    if (!p) return null;
    return { p, courses: await q<{ id: string; code: string; title: string }>("select id, code, title from courses order by position") };
  });
  if (!data) notFound();
  const { p, courses } = data;

  return (
    <>
      <p className="text-sm text-muted"><Link href="/admin/cms" className="hover:text-fg">Contenu du site</Link> / Article</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{p.title}</h1>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>
      <Panel title="Rédaction" actions={<ActionButton action={deletePost.bind(null, id)} label="Supprimer l'article" variant="ghost" />}>
        <form action={savePost.bind(null, id)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre"><Input name="title" defaultValue={p.title} required /></Field>
          <Field label="Slug (URL)"><Input name="slug" defaultValue={p.slug} required /></Field>
          <Field label="Catégorie"><Input name="category" defaultValue={p.category ?? ""} /></Field>
          <Field label="Résumé"><Input name="excerpt" defaultValue={p.excerpt ?? ""} /></Field>
          <div className="sm:col-span-2"><Field label="Texte (Markdown)"><Textarea name="bodyMd" rows={18} defaultValue={p.body_md} /></Field></div>
          <Field label="Titre SEO (70 max.)"><Input name="seoTitle" defaultValue={p.seo_title ?? ""} /></Field>
          <Field label="Description SEO (170 max.)"><Input name="seoDescription" defaultValue={p.seo_description ?? ""} /></Field>
          <div className="sm:col-span-2"><Field label="Formations liées" hint="Maintenez Ctrl/Cmd pour en choisir plusieurs"><Select name="related" multiple defaultValue={p.related_course_ids} className="h-40">{courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}</Select></Field></div>
          <div className="sm:col-span-2 flex items-center gap-4"><Check name="publish" label="Publié" defaultChecked={p.status === "published"} /><Button type="submit" variant="accent">Enregistrer</Button></div>
        </form>
      </Panel>
    </>
  );
}
