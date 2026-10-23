"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button, Notice } from "@/components/ui";
import type { FormState } from "./actions";

export function AuthForm({ action, submitLabel, withTerms }: { action: (s: FormState, f: FormData) => Promise<FormState>; submitLabel: string; withTerms?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  const field = "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";
  return (
    <form action={formAction} className="grid gap-4">
      <label className="text-sm font-medium">E-mail<input name="email" type="email" required autoComplete="email" className={field} /></label>
      <label className="text-sm font-medium">Mot de passe<input name="password" type="password" required minLength={8} autoComplete={withTerms ? "new-password" : "current-password"} className={field} /></label>
      {withTerms && <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" className="mt-1" /> J'accepte les <Link className="underline" href="/legal/conditions-utilisation">conditions d'utilisation</Link> et la <Link className="underline" href="/legal/confidentialite">politique de confidentialité</Link>.</label>}
      <Button type="submit" disabled={pending}>{pending ? "…" : submitLabel}</Button>
      <div aria-live="polite">
        {state.error && <Notice title="Erreur">{state.error}</Notice>}
        {state.message && <Notice tone="info" title="Information">{state.message}</Notice>}
      </div>
    </form>
  );
}
