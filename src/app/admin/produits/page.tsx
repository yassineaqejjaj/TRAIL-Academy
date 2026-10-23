import type { Metadata } from "next";
import { Badge, Button, Notice } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { formatEuro } from "@/lib/catalog";
import { Flash, Input, Select, Table } from "../ui";
import { setPrice, setProductActive } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Produits — administration", robots: { index: false } };

const kindLabel = { course: "Module", path: "Parcours", bundle: "Accès complet", enterprise_pack: "Entreprise" } as const;

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await adminDb();
  const { data: products } = await db.from("products").select("id, slug, kind, title, active, note, price_from, prices(amount_cents, tax_inclusive, active, created_at)").order("kind").order("title");

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Produits et prix</h1>
      <p className="mt-2 text-sm text-muted">Les prix sont l'affichage et la base de la session de paiement ; Stripe reste la source de vérité du paiement, des taxes et des factures.</p>
      <div className="mt-4"><Notice title="Règle de vente">Une offre ne peut être ouverte que si tous ses modules sont publiés et qu'un prix est défini. Changer un prix conserve l'historique ; les commandes passées gardent leur prix.</Notice></div>
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>
      <Table head={["Offre", "Type", "Prix actuel", "Modifier le prix", "État"]}>
        {(products ?? []).map((p) => {
          const price = (p.prices as { amount_cents: number | null; tax_inclusive: boolean; active: boolean; created_at: string }[]).find((x) => x.active);
          const online = p.kind !== "enterprise_pack";
          return (
            <tr key={p.id} className="align-top">
              <td className="p-3 font-medium">{p.title}</td><td className="p-3">{kindLabel[p.kind as keyof typeof kindLabel]}</td>
              <td className="p-3">{price?.amount_cents == null ? "Sur devis" : <>{formatEuro(price.amount_cents)} <span className="text-muted">{price.tax_inclusive ? "TTC" : "HT"}</span></>}</td>
              <td className="p-3"><form action={setPrice.bind(null, p.id)} className="flex flex-wrap gap-2"><Input name="amount" aria-label={`Nouveau prix ${p.title}`} placeholder={online ? "149" : "vide = sur devis"} className="!mt-0 w-28" /><Select name="tax" defaultValue={price?.tax_inclusive === false ? "ht" : "ttc"} aria-label="Taxes" className="!mt-0 w-24"><option value="ttc">TTC</option><option value="ht">HT</option></Select><Input name="note" defaultValue={p.note ?? ""} aria-label={`Précision d'affichage ${p.title}`} placeholder="Précision affichée (facultatif)" className="!mt-0 w-64" /><label className="flex items-center gap-1 text-xs"><input type="checkbox" name="priceFrom" defaultChecked={p.price_from} /> « dès »</label><Button type="submit" variant="secondary" className="px-3 py-1.5">Enregistrer</Button></form></td>
              <td className="p-3">{online ? (<form action={setProductActive.bind(null, p.id, !p.active)} className="flex items-center gap-2"><Badge tone={p.active ? "accent" : "neutral"}>{p.active ? "Ouverte" : "Fermée"}</Badge><Button type="submit" variant="ghost" className="px-2 py-1">{p.active ? "Fermer" : "Ouvrir à l'achat"}</Button></form>) : <Badge>Hors ligne (devis)</Badge>}</td>
            </tr>);
        })}
      </Table>
    </>
  );
}
