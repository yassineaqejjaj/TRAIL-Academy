import type { Metadata } from "next";
import Link from "next/link";
import { Flash, Field, Input, Panel, Table } from "@/app/admin/ui";
import { Badge, Button, Container, EmptyState, Notice, ProgressBar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { PRIVACY_NOTICE, average, memberAverage, type Report } from "@/lib/orgs";
import { allocateSeat, inviteLearner, releaseSeat } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon équipe", robots: { index: false } };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ org?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const { orgs, report, paths } = await asUser(user.id, async (q) => {
    const orgs = await q<{ id: string; name: string }>(
      `select o.id, o.name from organizations o
        where exists (select 1 from user_roles r where r.user_id = $1 and r.role = 'admin')
           or exists (select 1 from organization_members m where m.organization_id = o.id and m.user_id = $1 and m.role = 'manager' and m.accepted_at is not null)
        order by o.name`, [user.id]);
    const current = orgs.find((o) => o.id === sp.org) ?? orgs[0];
    const report = current ? (await q.one<{ r: Report }>("select org_progress_report($1) as r", [current.id]))?.r ?? null : null;
    const paths = await q<{ id: string; title: string }>("select id, title from learning_paths order by title");
    return { orgs, report, paths };
  });

  if (!orgs.length || !report) {
    return <Container className="py-12"><h1 className="text-3xl font-bold">Mon équipe</h1><div className="mt-6"><EmptyState title="Aucune organisation">Cet espace est réservé aux responsables d'une organisation cliente. Si vous formez une équipe, <Link href="/entreprise" className="font-semibold text-accent hover:underline">demandez un devis</Link>.</EmptyState></div></Container>;
  }
  const orgId = orgs.find((o) => o.id === sp.org)?.id ?? orgs[0].id;
  const learners = report.members.filter((m) => m.role === "learner" || m.role === "manager");
  const totalSeats = report.packs.reduce((s, p) => s + p.seats, 0), usedSeats = report.packs.reduce((s, p) => s + p.used, 0);

  return (
    <Container className="py-12">
      <h1 className="text-3xl font-bold">{report.organization}</h1>
      <p className="mt-1 text-muted">Suivi de la progression de votre équipe.{orgs.length > 1 && <> Organisation : {orgs.map((o) => <Link key={o.id} href={`/equipe?org=${o.id}`} className={`mr-2 ${o.id === orgId ? "font-semibold" : "text-accent underline"}`}>{o.name}</Link>)}</>}</p>
      <div className="mt-4"><Flash ok={sp.ok} error={sp.error} /></div>
      <Notice tone="info" title="Confidentialité">{PRIVACY_NOTICE}</Notice>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-2xl p-5"><div className="text-3xl font-bold">{learners.length}</div><div className="text-sm text-muted">membres actifs</div></div>
        <div className="glass rounded-2xl p-5"><div className="text-3xl font-bold">{usedSeats} / {totalSeats}</div><div className="text-sm text-muted">licences attribuées</div></div>
        <div className="glass rounded-2xl p-5"><div className="text-3xl font-bold">{average(learners.filter((m) => m.courses.length).map(memberAverage))} %</div><div className="text-sm text-muted">progression moyenne</div></div>
      </div>

      <Panel title="Progression par membre" actions={<a href={`/equipe/export.csv?org=${orgId}`} className="text-sm font-semibold text-accent hover:underline">Exporter en CSV</a>}>
        {learners.length === 0 ? <p className="text-sm text-muted">Personne n'a encore accepté d'invitation.</p> : (
          <Table head={["Membre", "Parcours", "Modules", "Progression", "Quiz réussis", "Dernière activité", ""]}>
            {learners.map((m) => (
              <tr key={m.user_id} className="align-top">
                <td className="p-3"><div className="font-medium">{m.name}</div><div className="text-xs text-muted">{m.email}{m.role === "manager" ? " · responsable" : ""}</div></td>
                <td className="p-3 text-sm">{m.seats.length ? m.seats.map((s) => s.path ?? "—").join(", ") : <span className="text-muted">Aucune licence</span>}</td>
                <td className="p-3 text-sm">{m.courses.length ? <ul className="flex flex-col gap-1">{m.courses.map((c) => <li key={c.code}><span className="font-mono text-xs text-muted">{c.code}</span> {c.percent} %</li>)}</ul> : "—"}</td>
                <td className="w-40 p-3">{m.courses.length ? <><ProgressBar value={memberAverage(m)} label={`Progression de ${m.name}`} /><div className="mt-1 text-xs text-muted">{memberAverage(m)} %</div></> : "—"}</td>
                <td className="p-3 text-sm">{m.courses.length ? `${m.courses.filter((c) => c.quiz_passed).length} / ${m.courses.length}` : "—"}</td>
                <td className="p-3 text-sm">{m.last_activity ? new Date(m.last_activity).toLocaleDateString("fr-FR") : "—"}</td>
                <td className="p-3">{m.seats.map((s) => (
                  <form key={s.allocation_id} action={releaseSeat}><input type="hidden" name="org" value={orgId} /><input type="hidden" name="allocation" value={s.allocation_id} /><Button type="submit" variant="secondary">Retirer la licence</Button></form>
                ))}</td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Panel title="Licences">
        {report.packs.length === 0 ? <p className="text-sm text-muted">Aucun pack de licences. Il est créé par l'équipe TRAIL après votre devis.</p> : (
          <>
            <ul className="mb-5 flex flex-col gap-2 text-sm">{report.packs.map((p) => <li key={p.id}><Badge tone={p.used >= p.seats ? "warn" : "accent"}>{p.used} / {p.seats}</Badge> {p.path ?? "Parcours au choix"} · valable jusqu'au {new Date(p.valid_until).toLocaleDateString("fr-FR")}</li>)}</ul>
            <form action={allocateSeat} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
              <input type="hidden" name="org" value={orgId} />
              <Field label="Membre"><select name="member" required className="mt-1 min-h-12 w-full rounded-lg border border-border bg-bg px-3">{learners.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}</select></Field>
              <Field label="Pack"><select name="pack" required className="mt-1 min-h-12 w-full rounded-lg border border-border bg-bg px-3">{report.packs.map((p) => <option key={p.id} value={p.id}>{p.path ?? "Parcours au choix"} ({p.seats - p.used} restantes)</option>)}</select></Field>
              <Field label="Parcours" hint="Obligatoire si le pack n'impose pas de parcours"><select name="path" className="mt-1 min-h-12 w-full rounded-lg border border-border bg-bg px-3"><option value="">Celui du pack</option>{paths.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
              <Button type="submit" variant="accent">Attribuer</Button>
            </form>
          </>
        )}
      </Panel>

      <Panel title="Inviter un collaborateur">
        <form action={inviteLearner} className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <input type="hidden" name="org" value={orgId} />
          <Field label="Qui invitez-vous ? (note interne)"><Input name="label" required maxLength={120} placeholder="Nom du collaborateur" /></Field>
          <Field label="Valable (jours)"><Input name="days" type="number" min={1} max={60} defaultValue={14} /></Field>
          <Button type="submit" variant="accent">Créer le lien</Button>
        </form>
        <p className="mt-2 text-xs text-muted">Le lien s'affiche une seule fois : envoyez-le à la personne. Elle doit avoir un compte, accepter le partage de sa progression, puis vous pourrez lui attribuer une licence.</p>
        {report.pending_invitations.length > 0 && <ul className="mt-4 text-sm text-muted">{report.pending_invitations.map((i, k) => <li key={k}>En attente : {i.label} ({i.role === "manager" ? "responsable" : "apprenant"}), expire le {new Date(i.expires_at).toLocaleDateString("fr-FR")}</li>)}</ul>}
      </Panel>
    </Container>
  );
}
