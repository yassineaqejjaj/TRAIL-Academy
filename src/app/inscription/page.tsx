import type { Metadata } from "next";
import Link from "next/link";
import { Container, Notice } from "@/components/ui";
import { supabaseConfigured } from "@/lib/env";
import { AuthForm } from "../connexion/auth-form";
import { signUp } from "../connexion/actions";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

export default function SignUpPage() {
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Créer un compte</h1>
      {!supabaseConfigured() && <div className="mt-4"><Notice title="Authentification non configurée">Les identifiants Supabase ne sont pas renseignés dans cet environnement.</Notice></div>}
      <div className="mt-6"><AuthForm action={signUp} submitLabel="Créer mon compte" withTerms /></div>
      <p className="mt-6 text-sm text-muted">Déjà inscrit ? <Link className="font-semibold text-accent hover:underline" href="/connexion">Se connecter</Link></p>
    </Container>
  );
}
