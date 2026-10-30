import type { Metadata } from "next";
import { Badge, Button, Notice } from "@/components/ui";
import { adminPage } from "@/lib/admin/ctx";
import { MIN_PUBLISHED_REVIEWS } from "@/lib/reviews";
import { Field, Flash, Input, Panel, Table } from "../ui";
import { approveReview, createInvitation, rejectReview } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Avis — administration", robots: { index: false } };

interface Submission { id: string; author_name: string; author_role: string | null; linkedin_url: string | null; quote: string; status: string; created_at: string }
interface Invitation { id: string; label: string; expires_at: string; used_at: string | null }

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { submissions, invitations, published } = await adminPage(async (q) => ({
    submissions: await q<Submission>("select id, author_name, author_role, linkedin_url, quote, status, created_at from review_submissions order by (status = 'pending') desc, created_at desc"),
    invitations: await q<Invitation>("select id, label, expires_at, used_at from review_invitations order by created_at desc limit 50"),
    published: (await q.one<{ n: number }>("select count(*)::int n from testimonials where status = 'published'"))?.n ?? 0,
  }));
  const pending = submissions.filter((s) => s.status === "pending");
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Avis</h1>
      <p className="mt-2 max-w-2xl text-muted">Seuls de vrais avis sont publiés : vous invitez une personne réelle avec un lien privé à usage unique, elle écrit avec ses mots et consent à la publication, puis vous vérifiez avant de publier. Rien n'est jamais généré.</p>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>
      <Notice tone="info" title="Affichage sur le site">La section « Témoignages » de l'accueil apparaît quand au moins {MIN_PUBLISHED_REVIEWS} avis sont publiés (actuellement {published}).</Notice>

      <Panel title="Inviter une personne">
        <form action={createInvitation} className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <Field label="Qui invitez-vous ? (note interne)"><Input name="label" required placeholder="Camille, Product Owner" maxLength={120} /></Field>
          <Field label="Valable (jours)"><Input name="days" type="number" min={1} max={180} defaultValue={30} /></Field>
          <Button type="submit" variant="accent">Créer le lien</Button>
        </form>
        <p className="mt-2 text-xs text-muted">Le lien s'affiche une seule fois dans le message de confirmation : copiez-le et envoyez-le à la personne. Pensez à lui offrir l'accès au module (Apprenants → accorder un accès).</p>
      </Panel>

      <Panel title={`Avis à relire (${pending.length})`}>
        {pending.length === 0 ? <p className="text-sm text-muted">Aucun avis en attente.</p> : (
          <ul className="space-y-6">{pending.map((s) => (
            <li key={s.id} className="glass rounded-2xl p-4">
              <p className="font-semibold">{s.author_name}{s.author_role ? <span className="font-normal text-muted"> · {s.author_role}</span> : null}</p>
              {s.linkedin_url && <p className="text-sm"><a className="text-accent underline" href={s.linkedin_url} target="_blank" rel="noopener noreferrer nofollow">Profil LinkedIn</a></p>}
              <blockquote className="mt-3 whitespace-pre-wrap border-l-4 border-border pl-4 text-[15px]">{s.quote}</blockquote>
              <form action={approveReview} className="mt-4 grid gap-3">
                <input type="hidden" name="id" value={s.id} />
                <Field label="Comment avez-vous vérifié que cet avis est réel ?" hint="Ex. « Camille a suivi M4 avec accès offert le 12/11, échange par e-mail »"><Input name="reference" required minLength={5} maxLength={300} /></Field>
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="verified" required className="mt-1" />Je confirme que cette personne existe, a utilisé la formation et a consenti à la publication.</label>
                <div className="flex flex-wrap gap-3"><Button type="submit" variant="accent">Publier</Button></div>
              </form>
              <form action={rejectReview} className="mt-2"><input type="hidden" name="id" value={s.id} /><Button type="submit" variant="ghost" className="px-2 py-1">Écarter</Button></form>
            </li>))}</ul>
        )}
      </Panel>

      <Panel title="Invitations">
        <Table head={["Invité", "Expire le", "État"]}>
          {invitations.map((i) => (
            <tr key={i.id}><td className="p-3">{i.label}</td><td className="p-3">{new Date(i.expires_at).toLocaleDateString("fr-FR")}</td>
              <td className="p-3">{i.used_at ? <Badge tone="accent">Avis reçu</Badge> : new Date(i.expires_at) < new Date() ? <Badge tone="warn">Expirée</Badge> : <Badge>En attente</Badge>}</td></tr>
          ))}
          {invitations.length === 0 && <tr><td className="p-3 text-muted" colSpan={3}>Aucune invitation.</td></tr>}
        </Table>
      </Panel>
    </>
  );
}
