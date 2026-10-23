import type { Metadata } from "next";
import { Badge, Button } from "@/components/ui";
import { adminPage } from "@/lib/admin/ctx";
import { presignDownload, storageConfigured } from "@/lib/storage";
import { Field, Flash, Panel, Select, Textarea } from "../ui";
import { reviewSubmission } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Devoirs — administration", robots: { index: false } };

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { subs, profiles } = await adminPage(async (q) => {
    const subs = await q<{ id: string; assignment_id: string; user_id: string; body: string | null; storage_path: string | null; status: string; instructor_feedback: string | null; submitted_at: string; assignment_title: string | null; course_code: string | null }>(
      `select s.id, s.assignment_id, s.user_id, s.body, s.storage_path, s.status, s.instructor_feedback, s.submitted_at, a.title as assignment_title, c.code as course_code
       from assignment_submissions s join assignments a on a.id = s.assignment_id join courses c on c.id = a.course_id
       where s.status in ('submitted', 'in_review', 'revision_requested') order by s.submitted_at`);
    const ids = Array.from(new Set(subs.map((s) => s.user_id)));
    const profiles = ids.length ? await q<{ id: string; email: string; full_name: string | null }>("select id, email, full_name from profiles where id = any($1::uuid[])", [ids]) : [];
    return { subs, profiles };
  });

  // Short-lived download links for attached files (the bucket stays private).
  const files = new Map<string, string>();
  if (storageConfigured()) for (const s of subs) if (s.storage_path) files.set(s.id, await presignDownload({ key: s.storage_path, filename: s.storage_path.split("/").pop(), ttlSeconds: 300 }));

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Relecture des livrables</h1>
      <p className="mt-2 text-sm text-muted">La relecture est humaine. Accepter un livrable réévalue la complétion du module et peut délivrer l'attestation.</p>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>
      {subs.map((s) => {
        const who = profiles?.find((p) => p.id === s.user_id);
        return (
          <Panel key={s.id} title={`${s.course_code ?? ""} · ${s.assignment_title ?? "Livrable"}`} actions={<Badge tone={s.status === "submitted" ? "warn" : "neutral"}>{s.status === "submitted" ? "À relire" : s.status === "in_review" ? "En relecture" : "Révision demandée"}</Badge>}>
            <p className="text-sm text-muted">{who?.full_name ?? who?.email} · {new Date(s.submitted_at).toLocaleString("fr-FR")}</p>
            {s.body && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-surface-2 p-4 text-sm">{s.body}</p>}
            {files.get(s.id) && <p className="mt-3 text-sm"><a className="font-semibold text-accent hover:underline" href={files.get(s.id)} rel="noopener noreferrer">Télécharger le fichier</a> <span className="text-muted">(lien valable 5 minutes)</span></p>}
            <form action={reviewSubmission.bind(null, s.id)} className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Décision"><Select name="status" defaultValue="accepted"><option value="accepted">Accepter</option><option value="revision_requested">Demander une révision</option><option value="in_review">Marquer en relecture</option></Select></Field>
              <div className="sm:col-span-2"><Field label="Commentaire (obligatoire pour une révision)"><Textarea name="feedback" rows={3} defaultValue={s.instructor_feedback ?? ""} /></Field></div>
              <div className="sm:col-span-3"><Button type="submit" variant="accent">Enregistrer</Button></div>
            </form>
          </Panel>);
      })}
      {!subs.length && <p className="mt-6 text-muted">Aucun livrable en attente.</p>}
    </>
  );
}
