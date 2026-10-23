import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Badge, Button } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { formatEuro } from "@/lib/catalog";
import { Field, Flash, Input, Panel, Select, Table } from "../../ui";
import { grantAccess, revokeAccess } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Apprenant — administration", robots: { index: false } };

export default async function AdminLearner({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const { db } = await adminDb();
  const { data: p } = await db.from("profiles").select("id, email, full_name, created_at, deletion_requested_at, export_requested_at").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: ents }, { data: progress }, { data: orders }, { data: courses }, { data: atts }] = await Promise.all([
    db.from("entitlements").select("course_id, status, expires_at, order_item_id").eq("user_id", id),
    db.from("learner_progress").select("course_id, percent").eq("user_id", id),
    db.from("orders").select("id, status, total_cents, created_at").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("courses").select("id, code, title").order("position"),
    db.from("attestations").select("course_id, verification_code").eq("user_id", id),
  ]);
  const title = (cid: string) => { const c = courses?.find((x) => x.id === cid); return c ? `${c.code} — ${c.title}` : cid; };

  return (
    <>
      <p className="text-sm text-muted"><Link href="/admin/apprenants" className="hover:text-fg">Apprenants</Link> / {p.email}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{p.full_name ?? p.email}</h1>
      <p className="text-sm text-muted">{p.email} · inscrit le {new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
      {(p.deletion_requested_at || p.export_requested_at) && <p className="mt-2 text-sm text-warn" role="status">{p.deletion_requested_at && "Suppression de compte demandée. "}{p.export_requested_at && "Export de données demandé."}</p>}
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      <Panel title="Accès">
        <Table head={["Module", "État", "Expire le", "Progression", "Retirer l'accès"]}>
          {(ents ?? []).map((e) => (
            <tr key={e.course_id} className="align-top"><td className="p-3">{title(e.course_id)}</td>
              <td className="p-3"><Badge tone={e.status === "active" && new Date(e.expires_at) > new Date() ? "accent" : "warn"}>{e.status === "active" && new Date(e.expires_at) <= new Date() ? "Expiré" : e.status === "active" ? "Actif" : e.status === "revoked" ? "Retiré" : "Expiré"}</Badge>{!e.order_item_id && <span className="ml-2 text-xs text-muted">manuel</span>}</td>
              <td className="p-3">{new Date(e.expires_at).toLocaleDateString("fr-FR")}</td><td className="p-3">{progress?.find((x) => x.course_id === e.course_id)?.percent ?? 0} %</td>
              <td className="p-3">{e.status === "active" && <form action={revokeAccess.bind(null, id, e.course_id)} className="flex gap-2"><Input name="reason" placeholder="Motif (obligatoire)" aria-label="Motif" className="!mt-0" required minLength={3} /><Button type="submit" variant="secondary" className="px-3 py-1.5">Retirer</Button></form>}</td></tr>))}
          {!ents?.length && <tr><td colSpan={5} className="p-6 text-center text-muted">Aucun accès.</td></tr>}
        </Table>
        <form action={grantAccess.bind(null, id)} className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><Field label="Accorder l'accès à"><Select name="courseId">{(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}</Select></Field></div>
          <Field label="Durée (mois)"><Input name="months" type="number" min={1} max={36} defaultValue={12} required /></Field>
          <Field label="Motif (journalisé)"><Input name="reason" required minLength={3} /></Field>
          <div className="sm:col-span-4"><Button type="submit" variant="accent">Accorder</Button></div>
        </form>
      </Panel>

      <Panel title="Commandes">
        <ul className="space-y-2 text-sm">{(orders ?? []).map((o) => <li key={o.id}>{new Date(o.created_at).toLocaleDateString("fr-FR")} · {formatEuro(o.total_cents)} · {o.status}</li>)}{!orders?.length && <li className="text-muted">Aucune commande.</li>}</ul>
      </Panel>
      <Panel title="Attestations">
        <ul className="space-y-2 text-sm">{(atts ?? []).map((a) => <li key={a.verification_code}>{title(a.course_id)} — <Link className="text-accent hover:underline" href={`/verification/${a.verification_code}`}>vérifier</Link></li>)}{!atts?.length && <li className="text-muted">Aucune attestation.</li>}</ul>
      </Panel>
    </>
  );
}
