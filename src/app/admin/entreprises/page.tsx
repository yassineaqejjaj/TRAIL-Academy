import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui";
import { adminPage } from "@/lib/admin/ctx";
import { Field, Flash, Input, Panel, Table } from "../ui";
import { createOrganization, createPack, inviteManager } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entreprises — administration", robots: { index: false } };

interface Org { id: string; name: string; billing_email: string | null; members: number; managers: number; seats: number; used: number }

export default async function AdminOrganizations({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { orgs, products } = await adminPage(async (q) => ({
    orgs: await q<Org>(`select o.id, o.name, o.billing_email,
        (select count(*)::int from organization_members m where m.organization_id = o.id and m.accepted_at is not null) members,
        (select count(*)::int from organization_members m where m.organization_id = o.id and m.accepted_at is not null and m.role = 'manager') managers,
        coalesce((select sum(seats)::int from license_packs p where p.organization_id = o.id), 0) seats,
        (select count(*)::int from license_allocations a join license_packs p on p.id = a.license_pack_id where p.organization_id = o.id and a.released_at is null) used
      from organizations o order by o.created_at desc`),
    products: await q<{ id: string; title: string }>("select id, title from products where kind in ('path', 'bundle') order by title"),
  }));
  const select = "mt-1 min-h-12 w-full rounded-lg border border-border bg-bg px-3";
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Entreprises</h1>
      <p className="mt-2 max-w-2xl text-muted">Organisations clientes (devis). Vous créez l'organisation, le pack de licences et le lien du responsable ; le responsable invite ensuite ses collaborateurs, attribue les licences et suit la progression sur la page « Mon équipe ». Aucun paiement n'est traité ici : la facturation se fait hors plateforme, sur devis.</p>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      <Panel title="Organisations">
        <Table head={["Organisation", "Contact facturation", "Membres", "Responsables", "Licences"]}>
          {orgs.map((o) => <tr key={o.id}><td className="p-3 font-medium"><Link href={`/equipe?org=${o.id}`} className="text-accent hover:underline">{o.name}</Link></td><td className="p-3">{o.billing_email ?? "—"}</td><td className="p-3">{o.members}</td><td className="p-3">{o.managers}</td><td className="p-3">{o.used} / {o.seats}</td></tr>)}
          {!orgs.length && <tr><td colSpan={5} className="p-6 text-center text-muted">Aucune organisation.</td></tr>}
        </Table>
      </Panel>

      <Panel title="Créer une organisation">
        <form action={createOrganization} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Nom"><Input name="name" required maxLength={120} /></Field>
          <Field label="E-mail de facturation (facultatif)"><Input name="email" type="email" /></Field>
          <Button type="submit" variant="accent">Créer</Button>
        </form>
      </Panel>

      {orgs.length > 0 && (
        <>
          <Panel title="Inviter un responsable">
            <form action={inviteManager} className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end">
              <Field label="Organisation"><select name="org" required className={select}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
              <Field label="Qui invitez-vous ? (note interne)"><Input name="label" required maxLength={120} placeholder="Nom du responsable" /></Field>
              <Field label="Valable (jours)"><Input name="days" type="number" min={1} max={60} defaultValue={14} /></Field>
              <Button type="submit" variant="accent">Créer le lien</Button>
            </form>
            <p className="mt-2 text-xs text-muted">Le lien s'affiche une seule fois dans le message de confirmation. La personne doit avoir un compte et accepter le partage de sa propre progression.</p>
          </Panel>
          <Panel title="Créer un pack de licences">
            <form action={createPack} className="grid gap-3 sm:grid-cols-[1fr_1fr_100px_160px_auto] sm:items-end">
              <Field label="Organisation"><select name="org" required className={select}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
              <Field label="Parcours du pack" hint="Vide : le responsable choisit"><select name="product" className={select}><option value="">Au choix</option>{products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
              <Field label="Licences"><Input name="seats" type="number" min={1} max={5000} defaultValue={5} /></Field>
              <Field label="Valable jusqu'au"><Input name="until" type="date" required /></Field>
              <Button type="submit" variant="accent">Créer</Button>
            </form>
            <p className="mt-2 text-xs text-muted">Les licences donnent accès aux modules du parcours jusqu'à la date de fin. Ne les créez qu'après signature du devis.</p>
          </Panel>
        </>
      )}
    </>
  );
}
