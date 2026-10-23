import type { Metadata } from "next";
import Link from "next/link";
import { Container, Notice } from "@/components/ui";
import { supabaseConfigured } from "@/lib/env";
import { AuthForm } from "./auth-form";
import { signIn } from "./actions";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default function LoginPage() {
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Connexion</h1>
      {!supabaseConfigured() && <div className="mt-4"><Notice title="Authentification non configurée">Les identifiants Supabase ne sont pas renseignés dans cet environnement.</Notice></div>}
      <div className="mt-6"><AuthForm action={signIn} submitLabel="Se connecter" /></div>
      <p className="mt-6 text-sm text-muted">Pas de compte ? <Link className="font-semibold text-accent hover:underline" href="/inscription">Créer un compte</Link></p>
      <details className="mt-6 text-sm"><summary className="cursor-pointer text-muted">Mot de passe oublié</summary>
        <div className="mt-3"><ResetForm /></div></details>
    </Container>
  );
}
