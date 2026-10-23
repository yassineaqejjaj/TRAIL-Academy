import type { Metadata } from "next";
import { Badge, Button } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { formatEuro } from "@/lib/catalog";
import { Flash, Table } from "../ui";
import { refundOrder } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commandes — administration", robots: { index: false } };

const label: Record<string, string> = { pending: "En attente", paid: "Payée", failed: "Échouée", refunded: "Remboursée", partially_refunded: "Remboursée partiellement", disputed: "Litige", canceled: "Annulée" };
const statuses = Object.keys(label);

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; status?: string }> }) {
  const sp = await searchParams;
  const { db } = await adminDb();
  let query = db.from("orders").select("id, user_id, status, total_cents, tax_cents, discount_cents, created_at, paid_at, stripe_payment_intent_id, order_items(products(title)), payments(refunded_cents)").order("created_at", { ascending: false }).limit(100);
  if (sp.status && statuses.includes(sp.status)) query = query.eq("status", sp.status);
  const { data: orders } = await query;
  const ids = Array.from(new Set((orders ?? []).map((o) => o.user_id)));
  const { data: profiles } = ids.length ? await db.from("profiles").select("id, email").in("id", ids) : { data: [] };
  const email = (id: string) => profiles?.find((p) => p.id === id)?.email ?? "—";

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Commandes</h1>
      <p className="mt-2 text-sm text-muted">Dossiers financiers : les commandes ne sont jamais supprimées ; chaque changement est inscrit au journal d'audit.</p>
      <nav aria-label="Filtrer par état" className="mt-4 flex flex-wrap gap-2 text-sm">
        <a href="/admin/commandes" className={`rounded-full border px-4 py-2 ${!sp.status ? "border-primary bg-primary text-primary-fg" : "border-border"}`}>Toutes</a>
        {statuses.map((s) => <a key={s} href={`/admin/commandes?status=${s}`} className={`rounded-full border px-4 py-2 ${sp.status === s ? "border-primary bg-primary text-primary-fg" : "border-border"}`}>{label[s]}</a>)}
      </nav>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>
      <Table head={["Date", "Client", "Offre", "Total", "État", ""]}>
        {(orders ?? []).map((o) => {
          const refunded = (o.payments as { refunded_cents: number }[]).reduce((s, p) => s + p.refunded_cents, 0);
          return (
            <tr key={o.id}>
              <td className="p-3 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString("fr-FR")}</td><td className="p-3">{email(o.user_id)}</td>
              <td className="p-3">{(o.order_items as unknown as { products: { title: string } | null }[]).map((i) => i.products?.title).filter(Boolean).join(", ")}</td>
              <td className="p-3 whitespace-nowrap">{formatEuro(o.total_cents)}{o.discount_cents ? <span className="block text-xs text-muted">remise {formatEuro(o.discount_cents)}</span> : null}{refunded ? <span className="block text-xs text-muted">remboursé {formatEuro(refunded)}</span> : null}</td>
              <td className="p-3"><Badge tone={o.status === "paid" ? "accent" : o.status === "pending" ? "neutral" : "warn"}>{label[o.status]}</Badge></td>
              <td className="p-3 text-right">{["paid", "partially_refunded"].includes(o.status) && o.stripe_payment_intent_id && <form action={refundOrder.bind(null, o.id)}><Button type="submit" variant="secondary" className="px-3 py-1.5">Rembourser</Button></form>}</td>
            </tr>);
        })}
        {!orders?.length && <tr><td colSpan={6} className="p-6 text-center text-muted">Aucune commande.</td></tr>}
      </Table>
      <p className="mt-3 text-xs text-muted">« Rembourser » demande un remboursement total à Stripe ; l'état et l'accès changent à la réception de l'événement vérifié.</p>
    </>
  );
}
