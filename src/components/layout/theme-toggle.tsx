"use client";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const read = (): Theme => (document.documentElement.dataset.theme as Theme | undefined) ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* storage unavailable */ }
    listeners.forEach((l) => l());
  };
  return (
    <button onClick={toggle} aria-label={theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg">
      {theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
