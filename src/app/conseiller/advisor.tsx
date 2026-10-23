"use client";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { recommend, type Recommendation } from "@/lib/advisor/engine";
import type { Catalog } from "@/lib/catalog";
import { experienceLevels, familiarityLevels, objectives, roles, technicalLevels, type AdvisorInput } from "@/lib/advisor/rules";

const initial: AdvisorInput = { role: "product", experience: "mid", familiarity: "user", objective: "use", technical: "medium", hoursPerWeek: 3 };

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="text-sm font-medium">{label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Advisor({ catalog }: { catalog: Catalog }) {
  const [input, setInput] = useState<AdvisorInput>(initial);
  const [result, setResult] = useState<Recommendation | null>(null);
  const set = <K extends keyof AdvisorInput>(k: K, v: AdvisorInput[K]) => setInput((i) => ({ ...i, [k]: v }));

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setResult(recommend(input, catalog)); }}>
        <Select label="Votre rôle actuel" value={input.role} options={roles} onChange={(v) => set("role", v)} />
        <Select label="Expérience professionnelle" value={input.experience} options={experienceLevels} onChange={(v) => set("experience", v)} />
        <Select label="Familiarité avec l'IA" value={input.familiarity} options={familiarityLevels} onChange={(v) => set("familiarity", v)} />
        <Select label="Objectif principal" value={input.objective} options={objectives} onChange={(v) => set("objective", v)} />
        <Select label="Aisance technique" value={input.technical} options={technicalLevels} onChange={(v) => set("technical", v)} />
        <label className="text-sm font-medium">Temps disponible par semaine (heures)
          <input type="number" min={1} max={40} value={input.hoursPerWeek} onChange={(e) => set("hoursPerWeek", Math.min(40, Math.max(1, Number(e.target.value) || 1)))} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <Button type="submit" variant="accent">Obtenir ma recommandation</Button>
      </form>

      <div aria-live="polite">
        {result && (
          <Card>
            <p className="text-sm text-muted">Parcours recommandé</p>
            <h2 className="text-2xl font-semibold">{result.pathTitle}</h2>
            <p className="mt-2 text-sm text-muted">~{result.totalHours} h de formation, soit environ {result.weeks} semaine{result.weeks > 1 ? "s" : ""} à {input.hoursPerWeek} h/semaine (durées indicatives).</p>
            <h3 className="mt-6 font-semibold">Pourquoi ce parcours</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{result.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            <h3 className="mt-6 font-semibold">Séquence suggérée</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{result.courses.map((c) => <li key={c.code}>{c.title} <span className="text-muted">({c.code}, ~{c.durationHours} h)</span></li>)}</ol>
            <h3 className="mt-6 font-semibold">Compétences visées</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{result.skills.slice(0, 5).map((s) => <li key={s}>{s}</li>)}</ul>
            {result.alternative && <p className="mt-6 text-sm text-muted">Alternative : {result.alternative.pathTitle}.</p>}
            <p className="mt-4 text-xs text-muted">Les modules sont proposés à l'achat uniquement une fois publiés.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
