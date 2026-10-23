import type { Metadata } from "next";
import { Badge, Button } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { Field, Flash, Panel, Select, Textarea } from "../ui";
import { reviewSubmission } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Devoirs — administration", robots: { index: false } };

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await adminDb();
  const { data: subs } = await db.from("assignment_submissions").select("id, assignment_id, user_id, body, storage_path, status, instructor_feedback, submitted_at, assignments(title, courses(code, title))").in("status", ["submitted", "in_review", "revision_requested"]).order("submitted_at");
  const ids = Array.from(new Set((subs ?? []).map((s) => s.user_id)));
  const { data: profiles } = ids.length ? await db.from("profiles").select("id, email, full_name").in("id", ids) : { data: [] };

  const files = new Map<string, string>();
  for (const s of subs ?? []) {
    if (!s.storage_path) continue;
    const { data } = await db.storage.from("submissions").createSignedUrl(s.storage_path, 300);
    if (data) files.set(s.id, data.signedUrl);
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Relecture des livrables</h1>
      <p className="mt-2 text-sm text-muted">La relecture est humaine. Accepter un livrable réévalue la complétion du module et peut délivrer l'attestation.</p>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>
      {(subs ?? []).map((s) => {
        const who = profiles?.find((p) => p.id === s.user_id);
        const a = s.assignments as unknown as { title: string; courses: { code: string; title: string } | null } | null;
        return (
          <Panel key={s.id} title={`${a?.courses?.code ?? ""} · ${a?.title ?? "Livrable"}`} actions={<Badge tone={s.status === "submitted" ? "warn" : "neutral"}>{s.status === "submitted" ? "À relire" : s.status === "in_review" ? "En relecture" : "Révision demandée"}</Badge>}>
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
      {!subs?.length && <p className="mt-6 text-muted">Aucun livrable en attente.</p>}
    </>
  );
}
