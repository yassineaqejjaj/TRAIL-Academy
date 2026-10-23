import type { Metadata } from "next";
import { Badge, Button, Container, EmptyState, Notice } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatEuro } from "@/lib/catalog";
import { asUser } from "@/lib/db";
import { openBillingPortal, openInvoice } from "../../achat/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes commandes", robots: { index: false } };

const label: Record<string, string> = { pending: "En attente", paid: "Payée", failed: "Échouée", refunded: "Remboursée", partially_refunded: "Remboursée partiellement", disputed: "Litige en cours", canceled: "Annulée" };
const errors: Record<string, string> = { invoice: "Facture indisponible pour le moment.", portal: "Le portail de facturation est indisponible." };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { error } = await searchParams;
  const { orders, profile } = await asUser(user.id, async (q) => ({
    orders: await q<{ id: string; status: string; total_cents: number; discount_cents: number; created_at: string; stripe_invoice_id: string | null; titles: string | null }>(
      `select o.id, o.status, o.total_cents, o.discount_cents, o.created_at, o.stripe_invoice_id,
              (select string_agg(p.title, ', ') from order_items oi join products p on p.id = oi.product_id where oi.order_id = o.id) as titles
       from orders o where o.user_id = $1 order by o.created_at desc`, [user.id]),
    profile: await q.one<{ stripe_customer_id: string | null }>("select stripe_customer_id from profiles where id = $1", [user.id]),
  }));

  return (
    <Container className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Mes commandes</h1>
      {error && <div className="mt-4"><Notice title="Erreur">{errors[error] ?? "Une erreur est survenue."}</Notice></div>}
      {!orders.length ? <div className="mt-6"><EmptyState title="Aucune commande" /></div> : (
        <ul className="mt-6 space-y-3">{orders.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4 text-sm">
            <Badge tone={o.status === "paid" ? "accent" : "neutral"}>{label[o.status] ?? o.status}</Badge>
            <span className="font-medium">{o.titles}</span>
            <span className="text-muted">{formatEuro(o.total_cents)} · {new Date(o.created_at).toLocaleDateString("fr-FR")}{o.discount_cents ? ` · remise ${formatEuro(o.discount_cents)}` : ""}</span>
            {o.stripe_invoice_id && <form action={openInvoice} className="ml-auto"><input type="hidden" name="orderId" value={o.id} /><Button type="submit" variant="secondary">Facture</Button></form>}
          </li>))}</ul>
      )}
      {profile?.stripe_customer_id && <form action={openBillingPortal} className="mt-8"><Button type="submit" variant="secondary">Gérer mes informations de facturation</Button></form>}
    </Container>
  );
}
