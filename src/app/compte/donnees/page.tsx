import type { Metadata } from "next";
import { ButtonLink, Card, Container } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { DeleteForm } from "./delete-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes données", robots: { index: false } };

export default async function DataPage() {
  const user = await requireUser();
  return (
    <Container className="flex max-w-3xl flex-col gap-8 py-12">
      <div>
        <h1 className="text-3xl font-bold">Mes données</h1>
        <p className="mt-2 text-muted">Vous pouvez à tout moment récupérer vos données ou supprimer votre compte.</p>
      </div>
      <Card>
        <h2 className="text-xl font-semibold">Télécharger mes données</h2>
        <p className="mt-2 text-muted">Un fichier JSON avec votre profil, vos commandes, vos accès, votre progression, vos réponses aux quiz, vos livrables (texte), vos notes et vos consentements.</p>
        <div className="mt-4"><ButtonLink href="/compte/export" variant="secondary" download>Télécharger (JSON)</ButtonLink></div>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold">Supprimer mon compte</h2>
        <p className="mt-2 text-muted">Votre progression, vos notes, vos livrables et vos attestations sont supprimés, ainsi que vos identifiants et sessions. Les commandes et paiements déjà effectués sont conservés sans lien avec votre identité, pour répondre à nos obligations comptables. Cette action est irréversible.</p>
        <DeleteForm email={user.email} />
      </Card>
    </Container>
  );
}
