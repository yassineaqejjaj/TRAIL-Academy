"use client";
import { Pause, Play, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { collectSpeechBlocks, splitForSpeech } from "@/lib/read-aloud";

const RATES = [0.8, 1, 1.2, 1.5];
const noop = () => () => undefined;
const supported = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

/**
 * Reads the text of an article aloud with the browser's built-in speech synthesis (Web Speech API): free, no account,
 * works offline with local voices. Some browsers use cloud voices, in which case the browser itself sends the text to its
 * vendor; this component does not send anything anywhere. Code is skipped and diagrams are announced by their title.
 * The block being read is highlighted. Playback stops when the page is left.
 */
export function ReadAloud({ targetId, label = "Écouter cette leçon" }: { targetId: string; label?: string }) {
  const canSpeak = useSyncExternalStore(noop, supported, () => false);
  const [status, setStatus] = useState<"idle" | "playing" | "paused">("idle");
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const queue = useRef<{ text: string; element: Element }[]>([]);
  const index = useRef(0);
  const highlighted = useRef<Element | null>(null);
  const session = useRef(0); // invalidates callbacks of a cancelled run
  const next = useRef<(run: number, rate: number, uri: string) => void>(() => undefined);

  useEffect(() => {
    if (!canSpeak) return;
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("fr")));
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [canSpeak]);

  const clearHighlight = useCallback(() => {
    highlighted.current?.classList.remove("read-aloud-current");
    highlighted.current = null;
  }, []);

  const stop = useCallback(() => {
    session.current++;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    clearHighlight();
    setStatus("idle");
  }, [clearHighlight]);

  useEffect(() => stop, [stop]); // leaving the page stops the voice

  const speakNext = useCallback((run: number, currentRate: number, uri: string) => {
    if (run !== session.current) return;
    const item = queue.current[index.current];
    if (!item) { clearHighlight(); setStatus("idle"); return; }
    if (highlighted.current !== item.element) {
      clearHighlight();
      item.element.classList.add("read-aloud-current");
      item.element.scrollIntoView({ block: "center", behavior: "smooth" });
      highlighted.current = item.element;
    }
    const u = new SpeechSynthesisUtterance(item.text);
    u.lang = "fr-FR";
    u.rate = currentRate;
    const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === uri);
    if (voice) u.voice = voice;
    u.onend = () => { index.current++; next.current(run, currentRate, uri); };
    u.onerror = (e) => { if (e.error !== "interrupted" && e.error !== "canceled") { clearHighlight(); setStatus("idle"); } };
    window.speechSynthesis.speak(u);
  }, [clearHighlight]);
  useEffect(() => { next.current = speakNext; }, [speakNext]);

  const start = useCallback((from = 0, currentRate = rate, uri = voiceURI) => {
    const root = document.getElementById(targetId);
    if (!root) return;
    window.speechSynthesis.cancel();
    session.current++;
    queue.current = collectSpeechBlocks(root).flatMap((b) => splitForSpeech(b.text).map((text) => ({ text, element: b.element })));
    index.current = from;
    setStatus("playing");
    speakNext(session.current, currentRate, uri);
  }, [rate, voiceURI, speakNext, targetId]);

  // Changing speed or voice restarts the current sentence with the new setting.
  const restartWith = (r: number, uri: string) => { if (status !== "idle") { window.speechSynthesis.cancel(); session.current++; setStatus("playing"); speakNext(session.current, r, uri); } };

  const options = useMemo(() => voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>), [voices]);
  if (!canSpeak) return null;

  return (
    <div role="group" aria-label="Lecture audio du texte" className="flex flex-wrap items-center gap-2 glass rounded-2xl-2 px-3 py-2 text-sm">
      {status === "idle" && <button type="button" onClick={() => start(0)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-fg"><Play size={16} aria-hidden="true" />{label}</button>}
      {status === "playing" && <button type="button" onClick={() => { window.speechSynthesis.pause(); setStatus("paused"); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-fg"><Pause size={16} aria-hidden="true" />Pause</button>}
      {status === "paused" && <button type="button" onClick={() => { window.speechSynthesis.resume(); setStatus("playing"); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-fg"><Play size={16} aria-hidden="true" />Reprendre</button>}
      {status !== "idle" && <button type="button" onClick={stop} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 font-semibold"><Square size={14} aria-hidden="true" />Arrêter</button>}
      <label className="ml-auto flex items-center gap-2"><span className="text-muted">Vitesse</span>
        <select value={rate} onChange={(e) => { const r = Number(e.target.value); setRate(r); restartWith(r, voiceURI); }} className="min-h-11 rounded-lg border border-border bg-surface px-2">{RATES.map((r) => <option key={r} value={r}>{r}×</option>)}</select></label>
      {voices.length > 1 && <label className="flex items-center gap-2"><span className="text-muted">Voix</span>
        <select value={voiceURI} onChange={(e) => { setVoiceURI(e.target.value); restartWith(rate, e.target.value); }} className="min-h-11 max-w-48 rounded-lg border border-border bg-surface px-2"><option value="">Par défaut</option>{options}</select></label>}
      <span className="sr-only" role="status" aria-live="polite">{status === "playing" ? "Lecture en cours" : status === "paused" ? "Lecture en pause" : ""}</span>
    </div>
  );
}
