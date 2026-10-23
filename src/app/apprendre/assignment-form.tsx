"use client";
import { useActionState } from "react";
import { Button, Notice } from "@/components/ui";
import { submitAssignment, type ActionState } from "./actions";

export function AssignmentForm({ assignmentId, slug }: { assignmentId: string; slug: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitAssignment.bind(null, slug), {});
  const field = "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";
  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <label className="text-sm font-medium">Réponse écrite<textarea name="body" rows={8} maxLength={10000} className={field} /></label>
      <label className="text-sm font-medium">Fichier (PDF, DOCX, TXT, MD, PNG, JPG, ZIP — 10 Mo max)
        <input name="file" type="file" accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.zip" className={field} /></label>
      <Button type="submit" variant="accent" disabled={pending}>{pending ? "Envoi…" : "Envoyer mon livrable"}</Button>
      <div aria-live="polite">{state.error && <Notice title="Envoi impossible">{state.error}</Notice>}{state.ok && <Notice tone="info" title="Envoyé">{state.message}</Notice>}</div>
    </form>
  );
}
