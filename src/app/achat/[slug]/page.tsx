import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, ButtonLink, Container, Notice } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { formatEuro } from "@/lib/catalog";
import { stripeMode } from "@/lib/stripe/guard";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import { startCheckout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Acheter", robots: { index: false } };

const messages: Record<string, string> = {
  unavailable: "Cette offre n'est pas disponible à l'achat.",
  not_published: "Cette offre contient des modules dont le contenu n'est pas encore publié : l'achat est fermé.",
  already_owned: "Vous avez déjà accès à tout le contenu de cette offre : aucun nouveau paiement n'est nécessaire.",
  quotation: "Cette offre est proposée sur devis.",
  payments_unavailable: "Le paiement n'est pas disponible dans cet environnement.",
  rate_limited: "Trop de tentatives. Réessayez dans quelques minutes.",
  failed: "Impossible de démarrer le paiement. Réessayez.",
};

export default async function PurchasePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; canceled?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  if (!supabaseConfigured()) return <Container className="py-16"><Notice title="Indisponible">La base de données n'est pas configurée dans cet environnement.</Notice></Container>;

  const supabase = await createClient();
  // Course pages link with the course slug; products are stored as "module-<slug>".
  const { data: products } = await supabase.from("products").select("id, slug, title, kind, active, access_months, prices(amount_cents, tax_inclusive, active)").in("slug", [`module-${slug}`, slug]).eq("active", true);
  const product = products?.[0];
  if (!product) notFound();
  const price = (product.prices as { amount_cents: number | null; tax_inclusive: boolean; active: boolean }[]).find((p) => p.active);
  const { data: access } = await supabase.from("product_course_access").select("courses(status, title)").eq("product_id", product.id);
  const unpublished = (access ?? []).some((a) => (a.courses as unknown as { status: string } | null)?.status !== "published");
  const user = await getUser();
  const mode = stripeMode(process.env);
  const canBuy = !unpublished && price?.amount_cents != null && mode.ok;

  return (
    <Container className="max-w-xl py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{product.title}</h1>
      {price?.amount_cents != null && <p className="mt-3 text-3xl font-semibold">{formatEuro(price.amount_cents)}<span className="ml-1 text-sm font-normal text-muted">{price.tax_inclusive ? "TTC" : "HT"}</span></p>}
      <p className="mt-1 text-sm text-muted">Accès {product.access_months} mois · {(access ?? []).length} module{(access ?? []).length > 1 ? "s" : ""}</p>
      {mode.ok && mode.mode === "test" && <div className="mt-4"><Badge tone="warn">Mode test — aucun débit réel</Badge></div>}
      {sp.canceled && <div className="mt-4"><Notice title="Paiement annulé">Aucun montant n'a été débité.</Notice></div>}
      {sp.error && <div className="mt-4"><Notice title="Achat impossible">{messages[sp.error] ?? messages.failed}</Notice></div>}
      <div className="mt-8">
        {unpublished ? <Notice title="Achat fermé">Les modules de cette offre ne sont pas encore publiés.</Notice>
          : !mode.ok ? <Notice title="Paiement indisponible">Le paiement n'est pas configuré dans cet environnement.</Notice>
          : !user ? <ButtonLink href="/connexion" variant="accent">Se connecter pour acheter</ButtonLink>
          : <form action={startCheckout}><input type="hidden" name="product" value={product.slug} /><Button type="submit" variant="accent" disabled={!canBuy}>Payer avec Stripe</Button></form>}
      </div>
      <p className="mt-6 text-xs text-muted">Les conditions de vente et les informations relatives au droit de rétractation sont disponibles dans les <Link className="underline" href="/legal/conditions-de-vente">conditions générales de vente</Link>.</p>
    </Container>
  );
}
