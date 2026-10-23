"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button, Notice } from "@/components/ui";
import type { FormState } from "./actions";

const field = "mt-1 w-full min-h-12 rounded-lg border border-border bg-surface px-4 text-base";

export function AuthForm({ action, submitLabel, mode }: { action: (s: FormState, f: FormData) => Promise<FormState>; submitLabel: string; mode: "signin" | "signup" }) {
  const [state, formAction, pending] = useActionState(action, {});
  const signup = mode === "signup";
  return (
    <form action={formAction} className="grid gap-4">
      {signup && <label className="text-sm font-medium">Nom complet<input name="name" required minLength={2} autoComplete="name" className={field} /></label>}
      <label className="text-sm font-medium">E-mail<input name="email" type="email" required autoComplete="email" className={field} /></label>
      <label className="text-sm font-medium">Mot de passe{signup && <span className="font-normal text-muted"> (10 caractères minimum)</span>}<input name="password" type="password" required minLength={signup ? 10 : 1} autoComplete={signup ? "new-password" : "current-password"} className={field} /></label>
      {signup && <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" className="mt-1" required /> <span>J'accepte les <Link className="underline" href="/legal/conditions-utilisation">conditions d'utilisation</Link> et la <Link className="underline" href="/legal/confidentialite">politique de confidentialité</Link>.</span></label>}
      <Button type="submit" disabled={pending}>{pending ? "…" : submitLabel}</Button>
      <div aria-live="polite">
        {state.error && <Notice title="Erreur">{state.error}</Notice>}
        {state.message && <Notice tone="info" title="Information">{state.message}</Notice>}
      </div>
    </form>
  );
}
