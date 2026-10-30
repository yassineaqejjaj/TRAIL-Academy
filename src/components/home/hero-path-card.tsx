"use client";
import { useState } from "react";

export interface HeroPath { slug: string; short: string; title: string; tagline: string; steps: { code: string; name: string; deliverable: string }[]; more: number; price: string; months: number }

/** Glass card on the hero: pick a function, see the first modules of its path with their deliverables. Real catalogue data. */
export function HeroPathCard({ paths }: { paths: HeroPath[] }) {
  const [i, setI] = useState(0);
  const p = paths[i];
  return (
    <div className="glass-strong relative rounded-[30px] p-7 sm:p-8">
      <div className="flex flex-col gap-5">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Un parcours pour votre fonction</span>
        <div role="tablist" aria-label="Choisir votre métier" className="flex flex-wrap gap-1 rounded-[18px] border border-white/10 bg-black/25 p-1">
          {paths.map((t, k) => (
            <button key={t.slug} role="tab" id={`hp-tab-${k}`} aria-selected={k === i} aria-controls="hp-panel" onClick={() => setI(k)}
              className={`min-h-11 rounded-[14px] px-3.5 text-[13px] font-semibold transition-colors ${k === i ? "bg-fg text-bg" : "text-muted hover:bg-white/10 hover:text-fg"}`}>{t.short}</button>
          ))}
        </div>
        <div role="tabpanel" id="hp-panel" aria-labelledby={`hp-tab-${i}`} className="flex flex-col gap-5">
          <div>
            <div className="font-display text-2xl font-semibold leading-tight">{p.title}</div>
            <div className="mt-1 text-sm text-muted">{p.tagline}</div>
          </div>
          <ol className="flex flex-col">
            {p.steps.map((s, k) => (
              <li key={s.code} className="flex items-stretch gap-4">
                <div className="flex w-[34px] flex-col items-center">
                  <span className={`flex size-[34px] items-center justify-center rounded-full text-[11px] font-bold ${k === 0 ? "bg-accent text-on-accent shadow-[0_0_0_5px_rgba(60,207,192,0.15)]" : "border border-white/20 bg-white/10"}`}>{s.code}</span>
                  {k < p.steps.length - 1 && <span aria-hidden className="w-0.5 flex-1 bg-white/15" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-4 pt-1">
                  <span className="text-[15px] font-semibold">{s.name}</span>
                  <span className="text-xs text-muted">Livrable : {s.deliverable}</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <span className="text-[13px] text-muted">{p.more > 0 ? `+ ${p.more} autres modules` : "Parcours complet"}</span>
            <span className="font-display text-lg font-bold">{p.price} <span className="font-sans text-xs font-medium text-muted">TTC · {p.months} mois</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
