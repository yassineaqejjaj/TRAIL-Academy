import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Notice } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { editableSections } from "@/lib/cms-registry";
import { ActionButton, Check, Field, Flash, Input, Panel, Textarea } from "../ui";
import { addFaq, addTestimonial, createPost, deleteFaq, deleteTestimonial, saveSection, toggleFaq, unpublishTestimonial } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contenu du site — administration", robots: { index: false } };

export default async function AdminCms({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await adminDb();
  const [{ data: pages }, { data: sections }, { data: faq }, { data: testimonials }, { data: posts }] = await Promise.all([
    db.from("pages").select("id, slug"),
    db.from("page_sections").select("page_id, key, content"),
    db.from("faq_items").select("id, question, status, position").eq("scope", "global").order("position"),
    db.from("testimonials").select("id, author_name, quote, status, consent_reference").order("author_name"),
    db.from("blog_posts").select("id, title, status, slug, published_at").order("created_at", { ascending: false }),
  ]);
  const current = (page: string, key: string) => {
    const id = pages?.find((p) => p.slug === page)?.id;
    return ((sections ?? []).find((s) => s.page_id === id && s.key === key)?.content ?? {}) as { title?: string; subtitle?: string; body_md?: string };
  };
  const site = editableSections.filter((s) => !s.legal);
  const legal = editableSections.filter((s) => s.legal);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Contenu du site</h1>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      {site.map((s) => { const c = current(s.page, s.key); return (
        <Panel key={`${s.page}/${s.key}`} title={s.label}>
          <form action={saveSection.bind(null, s.page, s.key)} className="grid gap-3">
            {s.fields.includes("title") && <Field label="Titre"><Input name="title" defaultValue={c.title ?? ""} /></Field>}
            {s.fields.includes("subtitle") && <Field label="Sous-titre / accroche"><Textarea name="subtitle" rows={2} defaultValue={c.subtitle ?? ""} /></Field>}
            {s.fields.includes("bodyMd") && <Field label="Texte (Markdown)"><Textarea name="bodyMd" rows={10} defaultValue={c.body_md ?? ""} /></Field>}
            <div><Button type="submit" variant="secondary">Enregistrer</Button></div>
          </form>
          <p className="mt-2 text-xs text-muted">Vide = texte par défaut du site. Aucun logo, témoignage ou contenu d'un ancien employeur sans autorisation explicite.</p>
        </Panel>); })}

      <Panel title="Questions fréquentes">
        <ul className="divide-y divide-border rounded-lg border border-border text-sm">{(faq ?? []).map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-3 p-3"><span className="font-medium">{f.question}</span><Badge tone={f.status === "published" ? "accent" : "warn"}>{f.status === "published" ? "Publiée" : "Brouillon"}</Badge>
            <span className="ml-auto flex gap-1"><ActionButton action={toggleFaq.bind(null, f.id, f.status !== "published")} label={f.status === "published" ? "Dépublier" : "Publier"} variant="ghost" /><ActionButton action={deleteFaq.bind(null, f.id)} label="Supprimer" variant="ghost" /></span></li>))}
          {!faq?.length && <li className="p-3 text-muted">Aucune question personnalisée : la FAQ par défaut est affichée.</li>}</ul>
        <form action={addFaq} className="mt-4 grid gap-3"><Field label="Question"><Input name="question" required /></Field><Field label="Réponse"><Textarea name="answer" rows={3} required /></Field>
          <div className="flex items-center gap-4"><Field label="Position"><Input name="position" type="number" defaultValue={0} className="w-24" /></Field><Check name="published" label="Publier" defaultChecked /></div><div><Button type="submit" variant="secondary">Ajouter</Button></div></form>
      </Panel>

      <Panel title="Témoignages">
        <div className="mb-4"><Notice title="Jamais inventés">Un témoignage ne peut être publié qu'avec une référence de consentement vérifiable (ex. « e-mail du 12/10, accord écrit »). Sans témoignage publié, la section n'apparaît pas sur le site.</Notice></div>
        <ul className="divide-y divide-border rounded-lg border border-border text-sm">{(testimonials ?? []).map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-3 p-3"><span className="font-medium">{t.author_name}</span><span className="text-muted">« {t.quote.slice(0, 80)}{t.quote.length > 80 ? "…" : ""} »</span><Badge tone={t.status === "published" ? "accent" : "warn"}>{t.status === "published" ? "Publié" : "Brouillon"}</Badge>
            <span className="ml-auto flex gap-1">{t.status === "published" && <ActionButton action={unpublishTestimonial.bind(null, t.id)} label="Dépublier" variant="ghost" />}<ActionButton action={deleteTestimonial.bind(null, t.id)} label="Supprimer" variant="ghost" /></span></li>))}
          {!testimonials?.length && <li className="p-3 text-muted">Aucun témoignage.</li>}</ul>
        <form action={addTestimonial} className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Nom"><Input name="authorName" required /></Field><Field label="Fonction"><Input name="authorRole" /></Field>
          <div className="sm:col-span-2"><Field label="Citation exacte"><Textarea name="quote" rows={3} required /></Field></div>
          <div className="sm:col-span-2"><Field label="Référence du consentement (obligatoire pour publier)"><Input name="consentReference" /></Field></div>
          <div className="sm:col-span-2 flex items-center gap-4"><Check name="publish" label="Je confirme l'authenticité et le consentement : publier" /><Button type="submit" variant="secondary">Enregistrer</Button></div></form>
      </Panel>

      <Panel title="Articles">
        <ul className="divide-y divide-border rounded-lg border border-border text-sm">{(posts ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 p-3"><Link className="font-medium hover:underline" href={`/admin/cms/articles/${p.id}`}>{p.title}</Link><Badge tone={p.status === "published" ? "accent" : "warn"}>{p.status === "published" ? "Publié" : "Brouillon"}</Badge><span className="text-muted">/{p.slug}</span></li>))}
          {!posts?.length && <li className="p-3 text-muted">Aucun article.</li>}</ul>
        <form action={createPost} className="mt-4 grid gap-3 sm:grid-cols-3"><Field label="Titre"><Input name="title" required /></Field><Field label="Slug (URL)"><Input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></Field><div className="self-end"><Button type="submit" variant="accent">Créer un brouillon</Button></div></form>
      </Panel>

      <Panel title="Pages légales (modèles à faire valider)">
        <div className="mb-4"><Notice title="Validation juridique requise">Ces textes engagent l'éditeur. Ils doivent être rédigés ou relus par un professionnel du droit avant l'ouverture à la vente. Le bandeau d'avertissement reste affiché tant que le texte n'est pas validé.</Notice></div>
        {legal.map((s) => { const c = current(s.page, s.key); return (
          <details key={s.page} className="mb-3 rounded-lg border border-border p-4"><summary className="cursor-pointer font-medium">{s.pageTitle}{c.body_md ? "" : " — modèle par défaut"}</summary>
            <form action={saveSection.bind(null, s.page, s.key)} className="mt-3 grid gap-3"><Field label="Texte (Markdown)"><Textarea name="bodyMd" rows={12} defaultValue={c.body_md ?? ""} /></Field><div><Button type="submit" variant="secondary">Enregistrer</Button></div></form></details>); })}
      </Panel>
    </>
  );
}
