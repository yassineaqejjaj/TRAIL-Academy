"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Notice } from "@/components/ui";
import { Field, Input } from "@/app/admin/ui";
import { registerVideo, requestVideoUpload } from "../../../video-actions";

/** Direct browser → bucket upload of a source video (up to 4 Go); the worker encodes it afterwards. */
export function VideoUploader({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ error?: string; ok?: boolean }>({});
  const [progress, setProgress] = useState<number | null>(null);

  function send(url: string, body: FormData): Promise<boolean> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((100 * e.loaded) / e.total));
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.send(body);
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || file.size === 0) return setState({ error: "Choisissez une vidéo." });
    setState({}); setProgress(0);
    try {
      const slot = await requestVideoUpload({ lessonId, fileName: file.name, size: file.size });
      if ("error" in slot) return setState({ error: slot.error });
      const up = new FormData();
      for (const [k, v] of Object.entries(slot.post.fields)) up.append(k, v);
      up.append("file", file); // must be the last field
      if (!(await send(slot.post.url, up))) return setState({ error: "Envoi refusé ou interrompu (stockage, CORS, taille). Réessayez." });
      const done = await registerVideo({ lessonId, courseId, key: slot.key });
      if (done.error) return setState({ error: done.error });
      form.reset();
      setState({ ok: true });
      router.refresh();
    } catch {
      setState({ error: "Envoi impossible. Réessayez." });
    } finally {
      setProgress(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3">
      <Field label="Vidéo source (mp4, mov, m4v, webm, mkv — 4 Go max.)"><Input name="file" type="file" required accept=".mp4,.mov,.m4v,.webm,.mkv,video/*" /></Field>
      <div><Button type="submit" variant="secondary" disabled={progress !== null}>{progress !== null ? `Envoi… ${progress} %` : "Envoyer la vidéo"}</Button></div>
      <div aria-live="polite">
        {state.error && <Notice title="Échec">{state.error}</Notice>}
        {state.ok && <Notice tone="info" title="Vidéo reçue">L'encodage démarre ; le statut ci-dessus se met à jour au rechargement de la page.</Notice>}
      </div>
    </form>
  );
}
