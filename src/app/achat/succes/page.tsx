import type { Metadata } from "next";
import { ButtonLink, Container, Notice } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirmation", robots: { index: false } };

// Display only. This page NEVER grants access: only the verified Stripe webhook does.
export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const user = await requireUser();
  const { session_id } = await searchParams;
  const supabase = await createClient();
  const { data: order } = session_id && /^cs_[A-Za-z0-9_]+$/.test(session_id)
    ? await supabase.from("orders").select("status").eq("stripe_checkout_session_id", session_id).eq("user_id", user.id).maybeSingle()
    : { data: null };

  return (
    <Container className="max-w-xl py-16">
      {order?.status === "paid" ? (
        <><h1 className="text-3xl font-semibold">Paiement confirmé</h1><p className="mt-3 text-muted">Votre accès est activé.</p><div className="mt-6"><ButtonLink href="/compte" variant="accent">Accéder à mon espace</ButtonLink></div></>
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
