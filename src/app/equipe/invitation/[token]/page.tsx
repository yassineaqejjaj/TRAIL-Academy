import type { Metadata } from "next";
import Link from "next/link";
import { Button, Container, Notice } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { asService } from "@/lib/db";
import { dbConfigured } from "@/lib/db/pool";
import { acceptInvitation } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invitation d'une organisation", robots: { index: false, follow: false } };

export default async function InvitationPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ token }, sp, user] = await Promise.all([params, searchParams, getUser()]);
  const info = dbConfigured() && /^[0-9a-f]{36}$/.test(token)
    ? await asService((q) => q.one<{ organization_name: string; role: string }>("select * from org_invitation_info($1)", [token])).catch(() => null)
    : null;
  return (
    <Container className="max-w-2xl py-12">
      <h1 className="text-3xl font-bold">Invitation à rejoindre une organisation</h1>
      {!info ? (
        <div className="mt-6"><Notice title="Lien indisponible">Ce lien a déjà été utilisé, a expiré ou n'est pas valide. Demandez-en un nouveau à la personne qui vous a invité(e).</Notice></div>
      ) : (
        <>
          <p className="mt-3 text-muted"><strong className="text-fg">{info.organization_name}</strong> vous invite comme {info.role === "manager" ? "responsable du suivi de l'équipe" : "apprenant"} sur TRAIL Academy.</p>
          {sp.error && <p role="alert" className="mt-4 rounded-lg border border-warn bg-warn-soft p-3 text-sm">{sp.error}</p>}
          {!user ? (
            <div className="mt-6 flex flex-col gap-3"><Notice tone="info" title="Connexion requise">Connectez-vous ou créez votre compte avec votre adresse professionnelle, puis revenez sur ce lien.</Notice>
              <div className="flex gap-3"><Link href="/connexion" className="font-semibold text-accent underline">Se connecter</Link><Link href="/inscription" className="font-semibold text-accent underline">Créer un compte</Link></div></div>
          ) : (
            <form action={acceptInvitation} className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
              <input type="hidden" name="token" value={token} />
              <p className="text-[15px]">Ce que votre organisation pourra voir : votre <strong>progression par module</strong> (pourcentage), si vous avez <strong>réussi les quiz</strong> et votre <strong>date de dernière activité</strong>. Elle ne verra jamais vos réponses, vos notes, vos livrables ni les retours du formateur.</p>
              <label className="flex items-start gap-3 text-[15px]"><input type="checkbox" name="consent" className="mt-1 h-5 w-5" required />J'accepte de partager ces informations avec {info.organization_name}. Je peux arrêter ce partage à tout moment depuis mon espace.</label>
              <Button type="submit">Accepter l'invitation</Button>
            </form>
          )}
        </>
      )}
    </Container>
  );
}
