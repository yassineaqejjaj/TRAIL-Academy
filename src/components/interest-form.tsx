"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Notice } from "@/components/ui";

export function InterestForm({ kind, courseSlug, label, submitLabel }: { kind: "course_launch" | "newsletter"; courseSlug?: string; label: string; submitLabel: string }) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | string>("idle");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    setState("sending");
    try {
      const res = await fetch("/api/interest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: d.get("email"), kind, courseSlug, consent: d.get("consent") === "on", website: d.get("website") || undefined }) });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) return setState(json.error ?? "Une erreur est survenue.");
      form.reset();
      setState("ok");
    } catch { setState("Connexion impossible. Réessayez."); }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <div>
        <label htmlFor={`mail-${kind}`} className="mb-2 block text-sm font-semibold">{label}</label>
        <input id={`mail-${kind}`} name="email" type="email" required autoComplete="email" placeholder="vous@exemple.fr" className="min-h-12 w-full rounded-lg border border-border bg-bg px-4 text-base" />
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="flex items-start gap-2 text-sm text-muted"><input type="checkbox" name="consent" required className="mt-1" /> J'accepte de recevoir cet e-mail. Désinscription à tout moment ; voir la <Link className="underline" href="/legal/confidentialite">politique de confidentialité</Link>.</label>
      <Button type="submit" disabled={state === "sending"}>{state === "sending" ? "Envoi…" : submitLabel}</Button>
      <div aria-live="polite">
        {state === "ok" && <Notice tone="info" title="C'est noté">Merci, vous serez prévenu·e.</Notice>}
        {state !== "idle" && state !== "ok" && state !== "sending" && <Notice title="Inscription impossible">{state}</Notice>}
      </div>
    </form>
  );
}
