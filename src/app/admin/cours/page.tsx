import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { statusLabel } from "@/lib/catalog";
import { Field, Flash, Input, Panel, Select, Table, Textarea } from "../ui";
import { createCourse } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Modules — administration", robots: { index: false } };

export default async function AdminCourses({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await adminDb();
  const [{ data: courses }, { data: phases }, { data: lessons }] = await Promise.all([
    db.from("courses").select("id, code, title, status, position, phase_id").order("position"),
    db.from("learning_phases").select("id, title").order("id"),
    db.from("lessons").select("course_id, content_status"),
  ]);
  const count = (id: string, status: string) => (lessons ?? []).filter((l) => l.course_id === id && l.content_status === status).length;
  const next = Math.max(0, ...(courses ?? []).map((c) => c.position)) + 1;

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Modules</h1>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>
      <Table head={["Ordre", "Code", "Titre", "Statut", "Leçons publiées / brouillon", ""]}>
        {(courses ?? []).map((c) => (
          <tr key={c.id}><td className="p-3">{c.position}</td><td className="p-3 font-mono">{c.code}</td><td className="p-3 font-medium">{c.title}</td>
            <td className="p-3"><Badge tone={c.status === "published" ? "accent" : "warn"}>{statusLabel[c.status as keyof typeof statusLabel]}</Badge></td>
            <td className="p-3">{count(c.id, "published")} / {count(c.id, "draft")}</td>
            <td className="p-3 text-right"><Link className="font-semibold text-accent hover:underline" href={`/admin/cours/${c.id}`}>Gérer</Link></td></tr>
        ))}
      </Table>
      <Panel title="Créer un module">
        <form action={createCourse} className="grid gap-4 sm:grid-cols-2">
          <Field label="Code (M19…)"><Input name="code" required pattern="M\d{1,3}" /></Field>
          <Field label="Slug (URL)"><Input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></Field>
          <div className="sm:col-span-2"><Field label="Titre"><Input name="title" required /></Field></div>
          <div className="sm:col-span-2"><Field label="Résumé"><Textarea name="summary" required rows={3} /></Field></div>
          <Field label="Phase"><Select name="phaseId">{(phases ?? []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>
          <Field label="Ordre recommandé"><Input name="position" type="number" min={1} defaultValue={next} required /></Field>
          <Field label="Niveau"><Select name="difficulty"><option value="beginner">Débutant</option><option value="intermediate">Intermédiaire</option><option value="advanced">Avancé</option></Select></Field>
          <Field label="Durée estimée (heures)"><Input name="durationHours" required inputMode="decimal" defaultValue="6" /></Field>
          <div className="sm:col-span-2"><Button type="submit" variant="accent">Créer en « bientôt disponible »</Button></div>
        </form>
      </Panel>
    </>
  );
}
