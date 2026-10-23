import type { Metadata } from "next";
import { Badge, Button } from "@/components/ui";
import { adminPage } from "@/lib/admin/ctx";
import { formatEuro } from "@/lib/catalog";
import { Flash, Table } from "../ui";
import { refundOrder } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commandes — administration", robots: { index: false } };

const label: Record<string, string> = { pending: "En attente", paid: "Payée", failed: "Échouée", refunded: "Remboursée", partially_refunded: "Remboursée partiellement", disputed: "Litige", canceled: "Annulée" };
const statuses = Object.keys(label);

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; status?: string }> }) {
  const sp = await searchParams;
  const filter = sp.status && statuses.includes(sp.status) ? sp.status : null;
  const { orders, profiles } = await adminPage(async (q) => {
    const orders = await q<{ id: string; user_id: string; status: string; total_cents: number; tax_cents: number; discount_cents: number; created_at: string; paid_at: string | null; stripe_payment_intent_id: string | null; titles: string | null; refunded: number }>(
      `select o.id, o.user_id, o.status, o.total_cents, o.tax_cents, o.discount_cents, o.created_at, o.paid_at, o.stripe_payment_intent_id,
              (select string_agg(p.title, ', ') from order_items oi join products p on p.id = oi.product_id where oi.order_id = o.id) as titles,
              coalesce((select sum(refunded_cents) from payments where order_id = o.id), 0)::int as refunded
       from orders o where ($1::text is null or o.status::text = $1) order by o.created_at desc limit 100`, [filter]);
    const ids = Array.from(new Set(orders.map((o) => o.user_id)));
    const profiles = ids.length ? await q<{ id: string; email: string }>("select id, email from profiles where id = any($1::uuid[])", [ids]) : [];
    return { orders, profiles };
  });
  const email = (id: string) => profiles.find((p) => p.id === id)?.email ?? "—";

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
        {orders.map((o) => {
          const refunded = o.refunded;
          return (
            <tr key={o.id}>
              <td className="p-3 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString("fr-FR")}</td><td className="p-3">{email(o.user_id)}</td>
              <td className="p-3">{o.titles}</td>
              <td className="p-3 whitespace-nowrap">{formatEuro(o.total_cents)}{o.discount_cents ? <span className="block text-xs text-muted">remise {formatEuro(o.discount_cents)}</span> : null}{refunded ? <span className="block text-xs text-muted">remboursé {formatEuro(refunded)}</span> : null}</td>
              <td className="p-3"><Badge tone={o.status === "paid" ? "accent" : o.status === "pending" ? "neutral" : "warn"}>{label[o.status]}</Badge></td>
              <td className="p-3 text-right">{["paid", "partially_refunded"].includes(o.status) && o.stripe_payment_intent_id && <form action={refundOrder.bind(null, o.id)}><Button type="submit" variant="secondary" className="px-3 py-1.5">Rembourser</Button></form>}</td>
            </tr>);
        })}
        {!orders.length && <tr><td colSpan={6} className="p-6 text-center text-muted">Aucune commande.</td></tr>}
      </Table>
      <p className="mt-3 text-xs text-muted">« Rembourser » demande un remboursement total à Stripe ; l'état et l'accès changent à la réception de l'événement vérifié.</p>
    </>
  );
}
