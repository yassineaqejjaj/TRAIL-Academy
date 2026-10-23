import type { Metadata } from "next";
import { ButtonLink, Card, Container, Notice } from "@/components/ui";
import Link from "next/link";
import { buyableFirst, nextModules } from "@/lib/catalog/next-steps";
import { formatEuro, isPurchasable } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog/load";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirmation", robots: { index: false } };

// Display only. This page NEVER grants access: only the verified Stripe webhook does.
export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const user = await requireUser();
  const { session_id } = await searchParams;
  const order = session_id && /^cs_[A-Za-z0-9_]+$/.test(session_id)
    ? await asUser(user.id, (q) => q.one<{ status: string }>("select status from orders where stripe_checkout_session_id = $1 and user_id = $2", [session_id, user.id]))
    : null;

  const owned = order?.status === "paid"
    ? (await asUser(user.id, (q) => q<{ code: string }>("select c.code from entitlements e join courses c on c.id = e.course_id where e.user_id = $1 and e.status = 'active'", [user.id]))).map((r) => r.code)
    : [];
  const catalog = await getCatalog();
  const next = order?.status === "paid" ? buyableFirst(nextModules(owned, catalog, 3), catalog) : [];

  return (
    <Container className="max-w-xl py-16">
      {order?.status === "paid" ? (
        <><h1 className="text-3xl font-semibold">Paiement confirmé</h1><p className="mt-3 text-muted">Votre accès est activé.</p><div className="mt-6"><ButtonLink href="/compte" variant="accent">Commencer maintenant</ButtonLink></div>
          {next.length > 0 && (
            <section className="mt-10" aria-label="Pour aller plus loin"><h2 className="text-xl font-semibold">Pour aller plus loin</h2><p className="mt-1 text-sm text-muted">Les modules qui suivent dans votre parcours.</p>
              <ul className="mt-4 grid gap-3">{next.map((c) => <li key={c.code}><Card><Link href={`/formations/${c.slug}`} className="font-semibold hover:underline">{c.code} · {c.title}</Link><p className="mt-1 text-sm text-muted">{c.summary}</p>{isPurchasable(c, catalog) && catalog.coursePrices[c.slug] != null && <p className="mt-1 text-sm text-muted">{formatEuro(catalog.coursePrices[c.slug])} TTC</p>}</Card></li>)}</ul>
              <p className="mt-3 text-sm text-muted">Plusieurs modules à suivre ? Comparez avec les <Link className="font-semibold text-accent hover:underline" href="/tarifs">parcours et AI Mastery</Link>.</p></section>
          )}</>
      ) : order?.status === "failed" || order?.status === "canceled" ? (
        <Notice title="Paiement non abouti">Le paiement n'a pas été confirmé. Aucun accès n'a été ouvert.</Notice>
      ) : order ? (
        <><meta httpEquiv="refresh" content="5" /><h1 className="text-3xl font-semibold">Confirmation en cours…</h1><p className="mt-3 text-muted">Nous attendons la confirmation de votre paiement. Cette page se met à jour automatiquement ; votre accès s'active dès réception.</p></>
      ) : (
        <Notice title="Commande introuvable">Nous ne retrouvons pas cette commande dans votre compte.</Notice>
      )}
    </Container>
  );
}
