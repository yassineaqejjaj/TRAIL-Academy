"use client";
import { useEffect, useId, useState, useSyncExternalStore } from "react";

/**
 * Renders a Mermaid diagram (flowchart, sequence, quadrant, pie, timeline…) written as text in a lesson.
 * Loaded on demand, rendered in the browser with Mermaid's strict security level (no scripts, no HTML labels), and
 * re-rendered when the theme changes. If rendering fails, the source is shown as code instead of an empty box.
 * Authors give each diagram `accTitle:` and `accDescr:` lines: Mermaid exposes them to screen readers.
 */
function isDark(): boolean {
  const attr = document.documentElement.dataset.theme;
  return attr === "dark" || (attr !== "light" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}
function subscribeTheme(notify: () => void): () => void {
  const media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  media?.addEventListener("change", notify);
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => { media?.removeEventListener("change", notify); observer.disconnect(); };
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = "mmd" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const dark = useSyncExternalStore(subscribeTheme, isDark, () => true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "neutral", fontFamily: "inherit",
          flowchart: { htmlLabels: false, useMaxWidth: true }, themeVariables: { background: "transparent" },
        });
        const out = await mermaid.render(id, chart);
        if (!cancelled) { setSvg(out.svg); setFailed(false); }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [chart, dark, id]);

  if (failed) return <pre className="overflow-x-auto rounded-lg bg-surface-2 p-4 text-sm"><code>{chart}</code></pre>;
  if (!svg) return <div className="h-40 animate-pulse rounded-xl bg-surface-2" role="status" aria-label="Chargement du schéma" />;
  return <div className="overflow-x-auto glass rounded-2xl p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
