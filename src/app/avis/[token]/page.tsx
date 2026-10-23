import type { Metadata } from "next";
import { Container, Notice } from "@/components/ui";
import { asService } from "@/lib/db";
import { dbConfigured } from "@/lib/db/pool";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Donner votre avis", robots: { index: false, follow: false } };

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const open = dbConfigured() && /^[0-9a-f]{36}$/.test(token)
    ? Boolean((await asService((q) => q.one<{ ok: boolean }>("select review_invitation_open($1) as ok", [token])).catch(() => null))?.ok)
    : false;
  return (
    <Container className="max-w-2xl py-12">
      <h1 className="text-3xl font-bold">Votre avis sur TRAIL Academy</h1>
      {open ? (
        <>
          <p className="mt-3 text-muted">Merci d'avoir testé la formation. Votre retour aide d'autres professionnels à décider, et nous aide à l'améliorer. Ce lien est personnel et ne fonctionne qu'une fois.</p>
          <div className="mt-8"><ReviewForm token={token} /></div>
        </>
      ) : (
        <div className="mt-6"><Notice title="Lien indisponible">Ce lien a déjà été utilisé, a expiré ou n'est pas valide. Demandez-en un nouveau au formateur.</Notice></div>
      )}
    </Container>
  );
}
