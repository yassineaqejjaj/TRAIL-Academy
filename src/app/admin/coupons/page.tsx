import type { Metadata } from "next";
import { Badge, Button } from "@/components/ui";
import { adminPage } from "@/lib/admin/ctx";
import { formatEuro } from "@/lib/catalog";
import { stripeMode } from "@/lib/stripe/guard";
import { Field, Flash, Input, Panel, Select, Table } from "../ui";
import { createCoupon, setCouponActive } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Codes promo — administration", robots: { index: false } };

export default async function AdminCoupons({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const coupons = await adminPage((q) => q<{ id: string; code: string; percent_off: string | null; amount_off_cents: number | null; valid_until: string | null; max_redemptions: number | null; stripe_promotion_code_id: string | null; active: boolean }>("select * from coupons order by code"));
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Codes promo</h1>
      {!stripeMode(process.env).ok && <p className="mt-2 text-sm text-warn">Stripe n'est pas configuré : les codes sont enregistrés mais inutilisables au paiement.</p>}
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>
      <Table head={["Code", "Remise", "Validité", "Limite", "Stripe", "État"]}>
        {coupons.map((c) => (
          <tr key={c.id}><td className="p-3 font-mono">{c.code}</td><td className="p-3">{c.percent_off ? `${Number(c.percent_off)} %` : formatEuro(c.amount_off_cents ?? 0)}</td>
            <td className="p-3">{c.valid_until ? new Date(c.valid_until).toLocaleDateString("fr-FR") : "—"}</td><td className="p-3">{c.max_redemptions ?? "—"}</td>
            <td className="p-3">{c.stripe_promotion_code_id ? <Badge tone="accent">Synchronisé</Badge> : <Badge tone="warn">Non synchronisé</Badge>}</td>
            <td className="p-3"><form action={setCouponActive.bind(null, c.id, !c.active)} className="flex items-center gap-2"><Badge tone={c.active ? "accent" : "neutral"}>{c.active ? "Actif" : "Inactif"}</Badge><Button type="submit" variant="ghost" className="px-2 py-1">{c.active ? "Désactiver" : "Activer"}</Button></form></td></tr>))}
      </Table>
      <Panel title="Nouveau code">
        <form action={createCoupon} className="grid gap-3 sm:grid-cols-5">
          <Field label="Code"><Input name="code" required /></Field>
          <Field label="Type"><Select name="kind"><option value="percent">Pourcentage</option><option value="amount">Montant (€)</option></Select></Field>
          <Field label="Valeur"><Input name="value" required inputMode="decimal" /></Field>
          <Field label="Valable jusqu'au"><Input name="validUntil" type="date" /></Field>
          <Field label="Utilisations max."><Input name="maxRedemptions" type="number" min={1} /></Field>
          <div className="sm:col-span-5"><Button type="submit" variant="accent">Créer</Button></div>
        </form>
      </Panel>
    </>
  );
}
