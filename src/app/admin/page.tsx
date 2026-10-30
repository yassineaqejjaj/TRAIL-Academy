import type { Metadata } from "next";
import Link from "next/link";
import { Card, ProgressBar } from "@/components/ui";
import { adminPage } from "@/lib/admin/ctx";
import { formatEuro } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration", robots: { index: false } };

interface Metrics {
  gross_cents: number; refunded_cents: number; net_cents: number; purchases: number; pending_orders: number; failed_orders: number;
  refunded_orders: number; disputed_orders: number; new_registrations: number; active_learners: number; enrollments: number;
  completions: number; pending_reviews: number; orders_created: number; orders_paid: number; top_products: { title: string; purchases: number }[];
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: d } = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(d)) ? Number(d) : 30;
  const m = await adminPage(async (q) => (await q.one<{ r: Metrics }>("select admin_metrics($1) as r", [days]))?.r ?? null).catch(() => null);
  const conversion = m && m.orders_created > 0 ? Math.round((100 * m.orders_paid) / m.orders_created) : 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Tableau de bord</h1>
        <nav aria-label="Période" className="flex gap-1 text-sm">{[7, 30, 90, 365].map((x) => <Link key={x} href={`/admin?days=${x}`} aria-current={x === days ? "page" : undefined} className={`rounded-md px-3 py-1.5 ${x === days ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface-2"}`}>{x === 365 ? "1 an" : `${x} j`}</Link>)}</nav>
      </div>
      {!m ? <p className="mt-6 text-danger" role="alert">Indicateurs indisponibles.</p> : (
        <>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["Revenu net", formatEuro(m.net_cents), `${formatEuro(m.gross_cents)} brut`],
              ["Achats", String(m.purchases), `${m.pending_orders} en attente`],
              ["Remboursements", String(m.refunded_orders), `${formatEuro(m.refunded_cents)} remboursés`],
              ["Litiges ouverts", String(m.disputed_orders), "toutes périodes"],
              ["Nouvelles inscriptions", String(m.new_registrations), ""],
              ["Apprenants actifs", String(m.active_learners), "ayant progressé"],
              ["Inscriptions aux cours", String(m.enrollments), ""],
              ["Modules terminés", String(m.completions), ""],
            ] as const).map(([label, value, sub]) => <Card key={label}><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 text-3xl font-semibold">{value}</dd>{sub && <dd className="mt-1 text-xs text-muted">{sub}</dd>}</Card>)}
          </dl>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card><h2 className="font-semibold">Entonnoir de commande</h2><p className="mt-1 text-sm text-muted">{m.orders_created} commandes créées → {m.orders_paid} payées ({conversion} %)</p><div className="mt-3"><ProgressBar value={conversion} label="Taux de paiement des commandes" /></div>
              <p className="mt-3 text-xs text-muted">Seules les étapes mesurées côté serveur sont affichées ; les vues de pages ne sont pas suivies (analytics non activé).</p></Card>
            <Card><h2 className="font-semibold">Produits les plus achetés</h2>{m.top_products.length === 0 ? <p className="mt-2 text-sm text-muted">Aucun achat sur la période.</p> : <ol className="mt-2 space-y-1 text-sm">{m.top_products.map((p) => <li key={p.title} className="flex justify-between"><span>{p.title}</span><span className="text-muted">{p.purchases}</span></li>)}</ol>}</Card>
          </div>
          <Link href="/admin/devoirs" className="mt-6 block glass rounded-2xl p-5 hover:border-accent"><span className="text-sm text-muted">Devoirs à relire</span><span className="ml-3 text-2xl font-semibold">{m.pending_reviews}</span></Link>
        </>
      )}
    </>
  );
}
