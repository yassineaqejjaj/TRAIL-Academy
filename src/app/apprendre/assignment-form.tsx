"use client";
import { useState } from "react";
import { Button, Notice } from "@/components/ui";
import { requestSubmissionUpload, submitAssignment, type ActionState } from "./actions";

const field = "mt-1 w-full rounded-lg border border-border bg-surface px-4 py-3 text-base";

export function AssignmentForm({ assignmentId, slug }: { assignmentId: string; slug: string }) {
  const [state, setState] = useState<ActionState>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    setBusy(true);
    setState({});
    try {
      let key = "";
      if (file instanceof File && file.size > 0) {
        // The file goes straight from the browser to the bucket; the server only issues the signed form and verifies the result.
        const slot = await requestSubmissionUpload({ assignmentId, fileName: file.name, size: file.size, type: file.type });
        if ("error" in slot) return setState({ error: slot.error });
        const up = new FormData();
        for (const [k, v] of Object.entries(slot.post.fields)) up.append(k, v);
        up.append("file", file); // must be the last field
        const res = await fetch(slot.post.url, { method: "POST", body: up });
        if (!res.ok) return setState({ error: "Téléversement refusé (type ou taille non conformes)." });
        key = slot.key;
      }
      fd.delete("file");
      fd.set("key", key);
      const out = await submitAssignment(slug, {}, fd);
      setState(out);
      if (out.ok) form.reset();
    } catch {
      setState({ error: "Envoi impossible. Réessayez." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-4">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <label className="text-sm font-medium">Réponse écrite<textarea name="body" rows={8} maxLength={10000} className={field} /></label>
      <label className="text-sm font-medium">Fichier (PDF, DOCX, TXT, MD, PNG, JPG, ZIP — 10 Mo max)
        <input name="file" type="file" accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.zip" className={field} /></label>
      <Button type="submit" variant="accent" disabled={busy}>{busy ? "Envoi…" : "Envoyer mon livrable"}</Button>
      <div aria-live="polite">{state.error && <Notice title="Envoi impossible">{state.error}</Notice>}{state.ok && <Notice tone="info" title="Envoyé">{state.message}</Notice>}</div>
    </form>
  );
}
