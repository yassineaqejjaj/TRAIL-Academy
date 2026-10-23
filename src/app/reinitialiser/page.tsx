import type { Metadata } from "next";
import Link from "next/link";
import { Container, Notice } from "@/components/ui";
import { NewPasswordForm } from "../connexion/reset-form";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-3xl font-bold">Nouveau mot de passe</h1>
      <div className="mt-6">
        {token && !error ? <NewPasswordForm token={token} /> : <Notice title="Lien invalide ou expiré">Demandez un nouveau lien depuis la page de <Link className="underline" href="/connexion">connexion</Link>.</Notice>}
      </div>
    </Container>
  );
}
