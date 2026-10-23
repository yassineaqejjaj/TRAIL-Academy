"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Notice } from "@/components/ui";
import { Field, Input } from "@/app/admin/ui";
import { registerLessonUpload, requestLessonUpload } from "../../../actions";

/** Direct browser → bucket upload: the server signs a size-limited form and verifies the object afterwards. */
export function LessonUploader({ lessonId, kind }: { lessonId: string; kind: "resource" | "subtitle" }) {
  const router = useRouter();
  const [state, setState] = useState<{ error?: string; ok?: boolean }>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return setState({ error: "Choisissez un fichier." });
    setBusy(true);
    setState({});
    try {
      const lang = String(fd.get("lang") ?? "");
      const slot = await requestLessonUpload({ lessonId, kind, lang, fileName: file.name, size: file.size, type: file.type });
      if ("error" in slot) return setState({ error: slot.error });
      const up = new FormData();
      for (const [k, v] of Object.entries(slot.post.fields)) up.append(k, v);
      up.append("file", file); // must be the last field
      const res = await fetch(slot.post.url, { method: "POST", body: up });
      if (!res.ok) return setState({ error: "Téléversement refusé par le stockage (type ou taille)." });
      const done = await registerLessonUpload({ lessonId, kind, key: slot.key, title: String(fd.get("title") ?? ""), lang, label: String(fd.get("label") ?? "") });
      if (done.error) return setState({ error: done.error });
      form.reset();
      setState({ ok: true });
      router.refresh();
    } catch {
      setState({ error: "Envoi impossible. Réessayez." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`mt-4 grid gap-3 ${kind === "subtitle" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {kind === "resource" ? <Field label="Titre"><Input name="title" required /></Field> : (<>
        <Field label="Langue (fr, en…)"><Input name="lang" required pattern="[a-z]{2}(-[A-Z]{2})?" defaultValue="fr" /></Field>
        <Field label="Libellé"><Input name="label" required defaultValue="Français" /></Field></>)}
      <Field label={kind === "resource" ? "Fichier (50 Mo max.)" : "Fichier .vtt"}><Input name="file" type="file" required accept={kind === "resource" ? ".pdf,.docx,.pptx,.xlsx,.csv,.json,.txt,.md,.png,.jpg,.jpeg,.zip" : ".vtt"} /></Field>
      <div className={kind === "subtitle" ? "sm:col-span-3" : "sm:col-span-2"}><Button type="submit" variant="secondary" disabled={busy}>{busy ? "Envoi…" : kind === "resource" ? "Téléverser" : "Ajouter la piste"}</Button></div>
      <div className={`${kind === "subtitle" ? "sm:col-span-3" : "sm:col-span-2"}`} aria-live="polite">
        {state.error && <Notice title="Échec">{state.error}</Notice>}{state.ok && <Notice tone="info" title="Ajouté">Le fichier est enregistré.</Notice>}
      </div>
    </form>
  );
}
