"use client";
import { useActionState } from "react";
import { Button, Notice } from "@/components/ui";
import { submitReview, type ReviewState } from "./actions";

const field = "mt-1 min-h-12 w-full rounded-lg border border-border bg-surface px-3";

export function ReviewForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview.bind(null, token), {});
  if (state.done) return <Notice tone="info" title="Merci !">Votre avis a bien été reçu. Il sera relu avant d'être éventuellement publié, avec les informations que vous avez acceptées de partager.</Notice>;
  return (
    <form action={action} className="grid gap-4">
      <label className="text-sm font-semibold">Votre nom (tel qu'il sera affiché)<input name="name" required maxLength={80} autoComplete="name" className={field} /></label>
      <label className="text-sm font-semibold">Votre métier et votre contexte <span className="font-normal text-muted">(facultatif, ex. « Product Owner, scale-up »)</span><input name="role" maxLength={120} className={field} /></label>
      <label className="text-sm font-semibold">Votre profil LinkedIn <span className="font-normal text-muted">(facultatif, pour que l'avis soit vérifiable)</span><input name="linkedin" type="url" inputMode="url" placeholder="https://www.linkedin.com/in/…" className={field} /></label>
      <label className="text-sm font-semibold">Votre avis, avec vos mots<textarea name="quote" required minLength={40} maxLength={1200} rows={7} className={`${field} py-3`} aria-describedby="hint" /></label>
      <p id="hint" className="-mt-2 text-sm text-muted">Ce qui vous a servi, ce que vous avez changé dans votre travail, ce qui pourrait être mieux. Un avis honnête vaut mieux qu'un avis flatteur.</p>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="consent" required className="mt-1 size-5" /><span>J'accepte que mon nom, mon métier et ce texte soient publiés sur le site TRAIL Academy. Je peux demander leur retrait à tout moment.</span></label>
      {state.error && <p role="alert" className="text-sm font-medium text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">{pending ? "Envoi…" : "Envoyer mon avis"}</Button>
    </form>
  );
}
