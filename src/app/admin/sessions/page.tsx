import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Notice } from "@/components/ui";
import { adminPage } from "@/lib/admin/ctx";
import { formatDay, formatRange } from "@/lib/sessions";
import { Field, Flash, Input, Panel, Select, Table, Textarea } from "../ui";
import { cancelSession, deleteSession, saveSession } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sessions en visio — administration", robots: { index: false } };

interface Row { id: string; title: string; description: string; course_id: string | null; starts_at: string; duration_minutes: number; capacity: number; audience: string; status: string; local_start: string; booked: number; waitlist: number }

export default async function AdminSessions({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; edit?: string; voir?: string }> }) {
  const sp = await searchParams;
  const data = await adminPage(async (q) => ({
    rows: await q<Row>(`select s.id, s.title, s.description, s.course_id, s.starts_at, s.duration_minutes, s.capacity, s.audience, s.status,
        to_char(s.starts_at at time zone 'Europe/Paris', 'YYYY-MM-DD"T"HH24:MI') as local_start,
        (select count(*) from session_bookings b where b.session_id = s.id and b.status = 'booked')::int booked,
        (select count(*) from session_bookings b where b.session_id = s.id and b.status = 'waitlist')::int waitlist
      from live_sessions s order by s.starts_at desc limit 100`),
    courses: await q<{ id: string; code: string; title: string }>("select id, code, title from courses order by position"),
    attendees: sp.voir && /^[0-9a-f-]{36}$/.test(sp.voir) ? await q<{ name: string; email: string; status: string }>("select name, email, status from admin_session_attendees($1)", [sp.voir]) : [],
    editUrl: sp.edit && /^[0-9a-f-]{36}$/.test(sp.edit) ? (await q.one<{ u: string }>("select session_meeting_url($1) as u", [sp.edit]))?.u ?? "" : "",
  }));
  const edit = data.rows.find((r) => r.id === sp.edit);
  const viewed = data.rows.find((r) => r.id === sp.voir);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Sessions en visio</h1>
      <p className="mt-2 max-w-2xl text-muted">Ateliers et questions-réponses en direct. Les horaires se saisissent à l'heure de Paris. Sans lien fourni, une salle privée au nom imprévisible est créée sur le service libre Jitsi Meet ; vous pouvez la remplacer par n'importe quel lien de visio (https).</p>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>
      <Notice tone="info" title="Rappels et e-mails">Les confirmations, annulations et places libérées sont envoyées par e-mail si le service d'envoi est configuré. Aucun rappel automatique n'est programmé.</Notice>

      <Panel title={edit ? `Modifier : ${edit.title}` : "Nouvelle session"} actions={edit ? <Link href="/admin/sessions" className="text-sm font-semibold text-accent hover:underline">Annuler la modification</Link> : undefined}>
        <form action={saveSession} className="grid gap-4 sm:grid-cols-2" key={edit?.id ?? "new"}>
          <input type="hidden" name="id" value={edit?.id ?? ""} />
          <div className="sm:col-span-2"><Field label="Titre"><Input name="title" required minLength={3} maxLength={140} defaultValue={edit?.title} /></Field></div>
          <div className="sm:col-span-2"><Field label="Description (ce qu'on y fait, prérequis)"><Textarea name="description" rows={4} defaultValue={edit?.description} /></Field></div>
          <Field label="Date et heure (heure de Paris)"><Input name="start" type="datetime-local" required defaultValue={edit?.local_start} /></Field>
          <Field label="Durée (minutes)"><Input name="duration" type="number" min={15} max={480} step={5} required defaultValue={edit?.duration_minutes ?? 60} /></Field>
          <Field label="Places"><Input name="capacity" type="number" min={1} max={500} required defaultValue={edit?.capacity ?? 12} /></Field>
          <Field label="Module concerné (facultatif)"><Select name="courseId" defaultValue={edit?.course_id ?? ""}><option value="">Aucun</option>{data.courses.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}</Select></Field>
          <Field label="Qui peut réserver ?" hint="« Apprenants » exige un accès actif au module (ou à n'importe quel module si aucun module n'est choisi)."><Select name="audience" defaultValue={edit?.audience ?? "learners"}><option value="learners">Apprenants (accès actif)</option><option value="open">Tous les comptes</option></Select></Field>
          <Field label="Lien de visio" hint="Laissez vide pour une salle Jitsi Meet automatique."><Input name="meetingUrl" type="url" placeholder="https://…" defaultValue={edit ? data.editUrl : ""} /></Field>
          <Field label="Statut"><Select name="status" defaultValue={edit?.status === "published" ? "published" : "draft"}><option value="draft">Brouillon (invisible)</option><option value="published">Publiée (réservable)</option></Select></Field>
          <div className="sm:col-span-2"><Button type="submit" variant="accent">{edit ? "Enregistrer" : "Créer la session"}</Button></div>
        </form>
      </Panel>

      {viewed && (
        <Panel title={`Inscrits : ${viewed.title}`} actions={<Link href="/admin/sessions" className="text-sm font-semibold text-accent hover:underline">Fermer</Link>}>
          {data.attendees.length === 0 ? <p className="text-sm text-muted">Aucun inscrit.</p> : (
            <Table head={["Nom", "E-mail", "Statut"]}>{data.attendees.map((a) => <tr key={a.email}><td className="p-3">{a.name}</td><td className="p-3">{a.email}</td><td className="p-3">{a.status === "booked" ? <Badge tone="accent">Inscrit</Badge> : <Badge tone="warn">Liste d'attente</Badge>}</td></tr>)}</Table>
          )}
        </Panel>
      )}

      <Panel title="Toutes les sessions">
        <Table head={["Session", "Date", "Places", "Statut", "Actions"]}>
          {data.rows.map((r) => (
            <tr key={r.id}>
              <td className="p-3 font-medium">{r.title}</td>
              <td className="p-3">{formatDay(r.starts_at)}<br /><span className="text-muted">{formatRange({ starts_at: r.starts_at, duration_minutes: r.duration_minutes })}</span></td>
              <td className="p-3">{r.booked} / {r.capacity}{r.waitlist ? <span className="text-muted"> (+{r.waitlist} en attente)</span> : null}</td>
              <td className="p-3">{r.status === "published" ? <Badge tone="accent">Publiée</Badge> : r.status === "canceled" ? <Badge tone="warn">Annulée</Badge> : <Badge>Brouillon</Badge>}</td>
              <td className="p-3"><div className="flex flex-wrap gap-2">
                <Link href={`/admin/sessions?edit=${r.id}`} className="inline-flex min-h-11 items-center px-2 font-semibold text-accent hover:underline">Modifier</Link>
                <Link href={`/admin/sessions?voir=${r.id}`} className="inline-flex min-h-11 items-center px-2 font-semibold text-accent hover:underline">Inscrits</Link>
                {r.status === "published" && <form action={cancelSession}><input type="hidden" name="id" value={r.id} /><Button type="submit" variant="ghost" className="px-2 py-1">Annuler la session</Button></form>}
                {r.booked + r.waitlist === 0 && <form action={deleteSession}><input type="hidden" name="id" value={r.id} /><Button type="submit" variant="ghost" className="px-2 py-1">Supprimer</Button></form>}
              </div></td>
            </tr>
          ))}
          {data.rows.length === 0 && <tr><td className="p-3 text-muted" colSpan={5}>Aucune session.</td></tr>}
        </Table>
      </Panel>
    </>
  );
}
