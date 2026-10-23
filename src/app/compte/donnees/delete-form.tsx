"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui";
import type { FormState } from "../../connexion/actions";
import { deleteAccount } from "./actions";

export function DeleteForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="mt-4 flex max-w-md flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">Pour confirmer, saisissez votre adresse e-mail ({email})
        <input name="confirmation" type="email" autoComplete="off" required className="min-h-12 rounded-lg border border-border bg-surface px-3" />
      </label>
      {state.error && <p role="alert" className="text-sm font-medium text-[#b42318] dark:text-[#ff9a8f]">{state.error}</p>}
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">{pending ? "Suppression…" : "Supprimer définitivement mon compte"}</Button>
    </form>
  );
}
