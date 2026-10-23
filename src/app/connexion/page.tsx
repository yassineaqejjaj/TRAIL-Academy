import type { Metadata } from "next";
import Link from "next/link";
import { Button, Container, Notice } from "@/components/ui";
import { googleEnabled } from "@/lib/auth/config";
import { dbConfigured } from "@/lib/db/pool";
import { AuthForm } from "./auth-form";
import { signIn, signInWithGoogle } from "./actions";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-3xl font-bold">Connexion</h1>
      {!dbConfigured() && <div className="mt-4"><Notice title="Authentification non configurée">Aucune base de données n'est renseignée dans cet environnement.</Notice></div>}
      <div className="mt-6"><AuthForm action={signIn} submitLabel="Se connecter" mode="signin" /></div>
      {googleEnabled() && <form action={signInWithGoogle} className="mt-4"><Button type="submit" variant="secondary" className="w-full">Continuer avec Google</Button></form>}
      <p className="mt-6 text-sm text-muted">Pas de compte ? <Link className="font-semibold text-accent hover:underline" href="/inscription">Créer un compte</Link></p>
      <details className="mt-6 text-sm"><summary className="min-h-11 cursor-pointer text-muted">Mot de passe oublié</summary><div className="mt-3"><ResetForm /></div></details>
    </Container>
  );
}
