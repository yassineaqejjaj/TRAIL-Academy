import type { Metadata } from "next";
import Link from "next/link";
import { Container, Notice } from "@/components/ui";
import { dbConfigured } from "@/lib/db/pool";
import { AuthForm } from "../connexion/auth-form";
import { signUp } from "../connexion/actions";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-3xl font-bold">Créer un compte</h1>
      {!dbConfigured() && <div className="mt-4"><Notice title="Authentification non configurée">Aucune base de données n'est renseignée dans cet environnement.</Notice></div>}
      <div className="mt-6"><AuthForm action={signUp} submitLabel="Créer mon compte" mode="signup" /></div>
      <p className="mt-6 text-sm text-muted">Un e-mail de confirmation vous sera envoyé. Déjà inscrit ? <Link className="font-semibold text-accent hover:underline" href="/connexion">Se connecter</Link></p>
    </Container>
  );
}
