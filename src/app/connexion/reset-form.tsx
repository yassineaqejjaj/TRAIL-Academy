"use client";
import { useActionState } from "react";
import { Button, Notice } from "@/components/ui";
import { requestPasswordReset } from "./actions";

export function ResetForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {});
  return (
    <form action={formAction} className="grid gap-3">
      <label className="text-sm font-medium">E-mail<input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" /></label>
      <Button type="submit" variant="secondary" disabled={pending}>Envoyer le lien</Button>
      <div aria-live="polite">{state.error && <Notice title="Erreur">{state.error}</Notice>}{state.message && <Notice tone="info" title="Information">{state.message}</Notice>}</div>
    </form>
  );
}
