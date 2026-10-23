"use client";
import { useActionState } from "react";
import { Button, Notice } from "@/components/ui";
import { requestPasswordReset, resetPassword } from "./actions";

const field = "mt-1 w-full min-h-12 rounded-lg border border-border bg-surface px-4 text-base";

export function ResetForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {});
  return (
    <form action={formAction} className="grid gap-3">
      <label className="text-sm font-medium">E-mail<input name="email" type="email" required autoComplete="email" className={field} /></label>
      <Button type="submit" variant="secondary" disabled={pending}>Envoyer le lien</Button>
      <div aria-live="polite">{state.error && <Notice title="Erreur">{state.error}</Notice>}{state.message && <Notice tone="info" title="Information">{state.message}</Notice>}</div>
    </form>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, {});
  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="text-sm font-medium">Nouveau mot de passe <span className="font-normal text-muted">(10 caractères minimum)</span><input name="newPassword" type="password" required minLength={10} autoComplete="new-password" className={field} /></label>
      <Button type="submit" disabled={pending}>Modifier le mot de passe</Button>
      <div aria-live="polite">{state.error && <Notice title="Erreur">{state.error}</Notice>}{state.message && <Notice tone="info" title="Information">{state.message}</Notice>}</div>
    </form>
  );
}
