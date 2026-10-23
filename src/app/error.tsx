"use client";

import { ButtonLink, Container } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-24 text-center">
      <p className="text-sm font-semibold text-accent">Erreur</p>
      <h1 className="mt-2 text-3xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-3 text-muted">Le problème a été enregistré. Vous pouvez réessayer ou revenir à l'accueil.</p>
      {error.digest && <p className="mt-2 text-xs text-muted">Référence : {error.digest}</p>}
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-12 items-center rounded-lg border border-border px-6 font-semibold">Réessayer</button>
        <ButtonLink href="/">Retour à l'accueil</ButtonLink>
      </div>
    </Container>
  );
}
