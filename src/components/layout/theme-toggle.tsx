"use client";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
export const THEME_KEY = "theme";

/** The active theme is the data-theme attribute on <html>, set before first paint by the script in layout.tsx. */
const read = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function setTheme(next: Theme) {
  const root = document.documentElement;
  root.classList.add("theme-switching"); // colors fade for a moment; removed right after
  root.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch { /* storage unavailable: the choice lasts for this page only */ }
  listeners.forEach((l) => l());
  window.setTimeout(() => root.classList.remove("theme-switching"), 260);
}

/** Global theme switch. The label says what the button does, not what the current theme is. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as Theme);
  const toLight = theme === "dark";
  return (
    <button type="button" onClick={() => setTheme(toLight ? "light" : "dark")} aria-label={toLight ? "Activer le thème clair" : "Activer le thème sombre"}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint hover:text-fg ${className}`}>
      {toLight ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
