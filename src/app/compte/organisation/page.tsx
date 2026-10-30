import type { Metadata } from "next";
import { Flash } from "@/app/admin/ui";
import { Button, Container, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { leaveOrganization } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon organisation", robots: { index: false } };

export default async function MyOrganizations({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const rows = await asUser(user.id, (q) => q<{ organization_id: string; name: string; role: string; accepted_at: string }>(
    "select m.organization_id, o.name, m.role, m.accepted_at from organization_members m join organizations o on o.id = m.organization_id where m.user_id = $1 and m.accepted_at is not null order by o.name", [user.id]));
  return (
    <Container className="max-w-2xl py-12">
      <h1 className="text-3xl font-bold">Mon organisation</h1>
      <div className="mt-4"><Flash ok={sp.ok} error={sp.error} /></div>
      {rows.length === 0 ? <div className="mt-6"><EmptyState title="Aucune organisation">Vous n'êtes rattaché(e) à aucune organisation : personne ne voit votre progression.</EmptyState></div> : (
        <ul className="mt-6 flex flex-col gap-4">{rows.map((r) => (
          <li key={r.organization_id} className="glass rounded-2xl p-5">
            <p className="font-semibold">{r.name}</p>
            <p className="text-sm text-muted">{r.role === "manager" ? "Responsable du suivi" : "Apprenant"} depuis le {new Date(r.accepted_at).toLocaleDateString("fr-FR")}. Cette organisation voit votre progression par module, vos quiz réussis et votre dernière activité, jamais vos réponses ni vos livrables.</p>
            <form action={leaveOrganization} className="mt-4"><input type="hidden" name="org" value={r.organization_id} /><Button type="submit" variant="secondary">Arrêter le partage et quitter</Button></form>
            <p className="mt-2 text-xs text-muted">Les licences attribuées par cette organisation seront retirées. Vos achats personnels ne changent pas.</p>
          </li>
        ))}</ul>
      )}
    </Container>
  );
}
