"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Notice } from "@/components/ui";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "ok" } | { kind: "error"; message: string };

export function ContactForm() {
  const [state, setState] = useState<State>({ kind: "idle" });
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ kind: "sending" });
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) return setState({ kind: "error", message: json.error ?? "Une erreur est survenue." });
      form.reset();
      setState({ kind: "ok" });
    } catch {
      setState({ kind: "error", message: "Connexion impossible. Réessayez." });
    }
  }
  const field = "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";
  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-4" noValidate>
      <label className="text-sm font-medium">Nom<input name="name" required autoComplete="name" className={field} /></label>
      <label className="text-sm font-medium">E-mail professionnel<input name="email" type="email" required autoComplete="email" className={field} /></label>
      <label className="text-sm font-medium">Organisation<input name="company" required autoComplete="organization" className={field} /></label>
      <label className="text-sm font-medium">Nombre d'apprenants (estimation)<input name="seats" type="number" min={1} className={field} /></label>
      <label className="text-sm font-medium">Votre besoin<textarea name="message" required rows={5} minLength={10} className={field} /></label>
      {/* Honeypot: hidden from users, bots tend to fill it. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <p className="text-xs text-muted">Vos données sont utilisées uniquement pour répondre à votre demande. Voir la <Link className="underline" href="/legal/confidentialite">politique de confidentialité</Link>.</p>
      <Button type="submit" variant="accent" disabled={state.kind === "sending"}>{state.kind === "sending" ? "Envoi…" : "Envoyer la demande"}</Button>
      <div aria-live="polite">
        {state.kind === "ok" && <Notice tone="info" title="Demande envoyée">Merci, nous revenons vers vous rapidement.</Notice>}
        {state.kind === "error" && <Notice title="Envoi impossible">{state.message}</Notice>}
      </div>
    </form>
  );
}
