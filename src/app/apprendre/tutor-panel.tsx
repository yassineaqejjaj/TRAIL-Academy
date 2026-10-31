"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface Source { n: number; lessonTitle: string; heading: string; href: string; excerpt: string }
interface Msg { role: "user" | "assistant"; text: string; sources?: Source[]; extractsOnly?: boolean; error?: boolean }
type Mode = "ask" | "simplify" | "example" | "summarize" | "reformulate" | "hint";

const chip = "min-h-11 rounded-full border border-white/15 bg-white/[0.06] px-3.5 text-[13px] font-medium transition-colors hover:bg-white/10 disabled:opacity-50";

/** Text with [n] markers turned into links to the cited sections. */
function Cited({ text, sources }: { text: string; sources: Source[] }) {
  return <>{text.split(/(\[\d{1,2}\])/g).map((part, i) => {
    const m = /^\[(\d{1,2})\]$/.exec(part);
    const s = m && sources.find((x) => x.n === Number(m[1]));
    return s ? <Link key={i} href={s.href} aria-label={`Source ${s.n} : ${s.heading}`} className="mx-0.5 inline-flex min-w-5 items-center justify-center rounded-md bg-accent-soft px-1 text-xs font-bold text-accent no-underline hover:underline">{s.n}</Link> : <span key={i}>{part}</span>;
  })}</>;
}

/** Tutor drawer of the lesson reader: answers come from the course text and always show their sources. */
export function TutorPanel({ lessonId, kind }: { lessonId: string; kind: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [rewrite, setRewrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(0);
  const [selection, setSelection] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) input.current?.focus(); else if (msgs.length) opener.current?.focus(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [msgs, busy]);
  useEffect(() => {
    const read = () => { const s = window.getSelection()?.toString().trim() ?? ""; if (s.length >= 20) setSelection(s.slice(0, 900)); };
    document.addEventListener("mouseup", read); document.addEventListener("keyup", read);
    return () => { document.removeEventListener("mouseup", read); document.removeEventListener("keyup", read); };
  }, []);

  const send = useCallback(async (mode: Mode, question?: string, opts: { selection?: string; hintLevel?: number } = {}) => {
    if (busy) return;
    const shown = question?.trim() || { ask: "", simplify: "Explique-moi plus simplement.", example: "Donne-moi un exemple.", summarize: "Résume la leçon.", reformulate: "", hint: `Un indice, s'il vous plaît (niveau ${opts.hintLevel ?? 1}/3).` }[mode];
    const history = msgs.filter((m) => !m.error).slice(-4).map((m) => ({ role: m.role, content: m.text.slice(0, 600) }));
    setMsgs((m) => [...m, { role: "user", text: opts.selection ? `${shown} (passage sélectionné)` : shown }]);
    setBusy(true);
    try {
      const res = await fetch("/api/tutor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId, mode, question, selection: opts.selection, hintLevel: opts.hintLevel, history }) });
      const json = (await res.json()) as { answer?: string; sources?: Source[]; mode?: "ai" | "extracts"; error?: string };
      if (!res.ok || !json.answer) setMsgs((m) => [...m, { role: "assistant", text: json.error ?? "Le tuteur est indisponible pour le moment.", error: true }]);
      else setMsgs((m) => [...m, { role: "assistant", text: json.answer!, sources: json.sources ?? [], extractsOnly: json.mode === "extracts" }]);
    } catch { setMsgs((m) => [...m, { role: "assistant", text: "Connexion impossible. Réessayez.", error: true }]); }
    setBusy(false);
  }, [busy, msgs, lessonId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim(); if (!q) return;
    setText("");
    void send(rewrite ? "reformulate" : "ask", q);
    setRewrite(false);
  };

  return (
    <>
      <button ref={opener} type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="tutor-panel"
        className="cta-glow fixed bottom-5 right-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-fg shadow-[0_12px_40px_rgba(60,207,192,0.3)]">
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>
        {open ? "Fermer le tuteur" : "Poser une question"}
      </button>
      {open && (
        <section id="tutor-panel" role="dialog" aria-label="Tuteur"
          className="glass-strong fixed inset-x-3 bottom-20 z-40 flex h-[min(620px,calc(100vh-7rem))] flex-col overflow-hidden rounded-[28px] sm:inset-x-auto sm:right-5 sm:w-[420px]">
          <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div><h2 className="font-display text-lg font-semibold">Tuteur</h2><p className="text-xs text-muted">Réponses tirées de ce cours, avec leurs sources</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le tuteur" className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-white/10 hover:text-fg">✕</button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4" aria-live="polite" aria-relevant="additions">
            {msgs.length === 0 && (
              <div className="flex flex-col gap-3 text-sm leading-[1.6] text-muted">
                <p>Posez une question sur la leçon, demandez une explication plus simple ou un exemple. Je réponds uniquement à partir du cours et je cite mes sources.</p>
                <p className="text-xs">Sur un exercice, je donne des indices, jamais la solution : le livrable est relu par le formateur.</p>
              </div>
            )}
            <ul className="flex flex-col gap-3">
              {msgs.map((m, i) => (
                <li key={i} className={m.role === "user" ? "self-end max-w-[85%] rounded-[18px_18px_4px_18px] bg-white/10 px-4 py-3 text-sm" : `max-w-[95%] rounded-[18px_18px_18px_4px] border px-4 py-3 text-sm leading-[1.6] ${m.error ? "border-danger/40 bg-white/5" : "border-accent/30 bg-accent-soft"}`}>
                  <p className="whitespace-pre-wrap"><Cited text={m.text} sources={m.sources ?? []} /></p>
                  {m.sources && m.sources.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 text-xs">
                      {m.sources.map((s) => (
                        <li key={s.n}>
                          <Link href={s.href} className="font-semibold text-accent hover:underline">[{s.n}] {s.lessonTitle} › {s.heading}</Link>
                          <p className="mt-0.5 text-muted">{m.extractsOnly ? <>« {s.excerpt} »</> : null}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.role === "assistant" && !m.error && <p className="mt-2 text-[11px] text-muted">{m.extractsOnly ? "Passages du cours, sans reformulation." : "Réponse générée par une IA, à vérifier dans la leçon."}</p>}
                </li>
              ))}
              {busy && <li className="text-sm text-muted" role="status">Le tuteur lit le cours…</li>}
            </ul>
            <div ref={end} />
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip} disabled={busy} onClick={() => void send("simplify", undefined, { selection: selection || undefined })}>Explique plus simplement</button>
              <button type="button" className={chip} disabled={busy} onClick={() => void send("example", undefined, { selection: selection || undefined })}>Donne un exemple</button>
              <button type="button" className={chip} disabled={busy} onClick={() => void send("summarize")}>Résume la leçon</button>
              <button type="button" className={`${chip} ${rewrite ? "!border-accent !bg-accent-soft" : ""}`} aria-pressed={rewrite} onClick={() => { setRewrite((v) => !v); input.current?.focus(); }}>Reformuler avec mes mots</button>
              {kind === "exercise" && <button type="button" className={chip} disabled={busy} onClick={() => { const l = Math.min(3, hint + 1); setHint(l); void send("hint", undefined, { hintLevel: l }); }}>{hint === 0 ? "Un indice" : hint < 3 ? `Indice suivant (${hint}/3)` : "Indice 3/3 : reposer"}</button>}
              {selection && <button type="button" className={`${chip} !border-accent/50`} disabled={busy} onClick={() => void send("simplify", undefined, { selection })}>Expliquer le passage sélectionné</button>}
            </div>
            <form onSubmit={submit} className="flex items-end gap-2">
              <label htmlFor="tutor-input" className="sr-only">{rewrite ? "Votre reformulation" : "Votre question"}</label>
              <textarea id="tutor-input" ref={input} value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={600}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                placeholder={rewrite ? "Écrivez la leçon avec vos propres mots…" : "Votre question sur la leçon…"}
                className="min-h-12 flex-1 resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-fg placeholder:text-muted" />
              <button type="submit" disabled={busy || !text.trim()} className="cta-glow min-h-12 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-50">Envoyer</button>
            </form>
            <p className="text-[11px] leading-snug text-muted">Ne saisissez pas de données personnelles ni confidentielles. Votre question est envoyée à un service d'IA pour rédiger la réponse.</p>
          </div>
        </section>
      )}
    </>
  );
}
