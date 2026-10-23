"use client";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, ButtonLink, Card } from "@/components/ui";
import { recommendFromText, type TextRecommendation } from "@/lib/advisor/text";
import { formatEuro, isPathPurchasable, getPath, type Catalog } from "@/lib/catalog";

const EXAMPLES = [
  "Je suis Product Owner dans une banque, je débute avec l'IA et je veux l'intégrer à mes fonctionnalités. J'ai 3h par semaine.",
  "UX designer en agence : je veux concevoir l'expérience d'assistants et d'agents IA pour mes clients.",
  "Développeur full stack, je veux construire un assistant qui répond à partir de nos documents internes, et le sécuriser.",
  "Consultante en transformation : je dois cadrer des projets IA et conduire l'adoption dans les équipes.",
];

export function TextAdvisor({ catalog, llmEnabled }: { catalog: Catalog; llmEnabled: boolean }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<TextRecommendation | null>(null);
  const [submitted, setSubmitted] = useState("");
  const [summary, setSummary] = useState<{ text: string; model: string } | { error: string } | "loading" | null>(null);

  function analyse(value = text) {
    setSubmitted(value);
    setResult(recommendFromText(value, catalog));
    setSummary(null);
  }
  async function askModel() {
    setSummary("loading");
    try {
      const res = await fetch("/api/advisor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: submitted }) });
      const json = (await res.json()) as { summary?: string | null; model?: string | null; error?: string };
      if (!res.ok) return setSummary({ error: json.error ?? "Synthèse indisponible." });
      setSummary(json.summary ? { text: json.summary, model: json.model ?? "" } : { error: "Le modèle n'a pas pu rédiger de synthèse fiable : la recommandation ci-dessus reste valable." });
    } catch { setSummary({ error: "Connexion impossible." }); }
  }

  const path = result ? getPath(result.base.pathSlug, catalog) : undefined;
  const offer = path ? catalog.offers.find((o) => o.slug === path.slug) : undefined;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <form onSubmit={(e) => { e.preventDefault(); analyse(); }} className="grid content-start gap-4">
        <label htmlFor="need" className="text-sm font-semibold">Décrivez votre métier et ce que vous voulez accomplir avec l'IA</label>
        <textarea id="need" value={text} onChange={(e) => setText(e.target.value)} rows={7} maxLength={1500} required placeholder="Ex. : Je suis Product Owner dans une assurance, je débute avec l'IA et je veux l'intégrer à mes fonctionnalités. J'ai 3 h par semaine."
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-[15px]" aria-describedby="need-help" />
        <p id="need-help" className="-mt-2 text-sm text-muted">Plus vous précisez (métier, niveau, sujets, temps disponible), plus la recommandation est juste. Votre texte est analysé dans votre navigateur et n'est envoyé nulle part{llmEnabled ? ", sauf si vous demandez ensuite la synthèse du modèle IA" : ""}.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Exemples">
          {EXAMPLES.map((e, i) => <button key={i} type="button" onClick={() => { setText(e); analyse(e); }} className="min-h-11 rounded-full border border-border px-3 text-left text-sm hover:bg-surface-2">{e.split(/[.:,]/)[0]}</button>)}
        </div>
        <Button type="submit" variant="accent" disabled={text.trim().length < 5}>Me proposer un parcours</Button>
      </form>

      <div aria-live="polite">
        {result && !result.enough && (
          <Card><h2 className="text-xl font-semibold">J'ai besoin d'un peu plus de précisions</h2>
            <p className="mt-2 text-sm text-muted">Pour vous proposer un parcours utile, dites-moi :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{result.missing.map((m) => <li key={m}>{m}</li>)}</ul>
            <p className="mt-4 text-sm text-muted">Vous pouvez aussi <Link className="font-semibold text-accent hover:underline" href="/conseiller?mode=questionnaire">répondre au questionnaire en six questions</Link>.</p></Card>
        )}
        {result?.enough && (
          <Card>
            <p className="text-sm text-muted">Ce que j'ai compris</p>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {result.detected.role && <li><Badge tone="accent">Métier : {result.detected.role.evidence[0]}</Badge></li>}
              {result.detected.objective && <li><Badge>Objectif : {result.detected.objective.evidence[0]}</Badge></li>}
              {result.detected.familiarity && <li><Badge>Niveau : {result.detected.familiarity.evidence[0]}</Badge></li>}
              <li><Badge>{result.input.hoursPerWeek} h par semaine{result.detected.hoursPerWeek == null ? " (estimé)" : ""}</Badge></li>
            </ul>

            <h2 className="mt-6 text-2xl font-semibold">{result.base.pathTitle}</h2>
            <p className="mt-1 text-sm text-muted">Environ {result.base.totalHours} h de formation, soit {result.base.weeks} semaine{result.base.weeks > 1 ? "s" : ""} à {result.input.hoursPerWeek} h par semaine (durées indicatives).{offer?.amountCents != null ? ` ${formatEuro(offer.amountCents)} TTC.` : ""}</p>

            {result.startWith && <p className="mt-4 rounded-lg bg-accent-soft p-3 text-sm"><strong>Commencez par :</strong> <Link className="font-semibold text-accent-ink hover:underline" href={`/formations/${result.startWith.slug}`}>{result.startWith.code} · {result.startWith.title}</Link></p>}

            <h3 className="mt-6 font-semibold">Pourquoi cette recommandation</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{result.reasons.map((r) => <li key={r}>{r}</li>)}</ul>

            <h3 className="mt-6 font-semibold">Séquence suggérée</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{result.base.courses.map((c) => <li key={c.code}><Link className="hover:underline" href={`/formations/${c.slug}`}>{c.title}</Link> <span className="text-muted">({c.code}, ~{c.durationHours} h)</span></li>)}</ol>

            {result.extras.length > 0 && (<><h3 className="mt-6 font-semibold">À ajouter selon vos sujets</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{result.extras.map((m) => <li key={m.course.code}><Link className="hover:underline" href={`/formations/${m.course.slug}`}>{m.course.code} · {m.course.title}</Link></li>)}</ul></>)}

            {llmEnabled && (
              <div className="mt-6 border-t border-border pt-4">
                {summary === null && <><Button type="button" variant="secondary" onClick={askModel}>Obtenir une synthèse rédigée par l'IA</Button><p className="mt-2 text-xs text-muted">Envoie votre texte au modèle de langage configuré par TRAIL Academy pour rédiger une explication. La recommandation ci-dessus ne change pas.</p></>}
                {summary === "loading" && <p className="text-sm text-muted" role="status">Rédaction en cours…</p>}
                {summary && typeof summary === "object" && "text" in summary && <><h3 className="font-semibold">Synthèse de l'IA</h3><p className="mt-2 text-sm">{summary.text}</p><p className="mt-1 text-xs text-muted">Rédigée par le modèle {summary.model}, à partir de la recommandation calculée. Peut contenir des imprécisions.</p></>}
                {summary && typeof summary === "object" && "error" in summary && <p className="text-sm text-muted" role="alert">{summary.error}</p>}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {path && isPathPurchasable(path, catalog) ? <ButtonLink href={`/achat/${path.slug}`}>Acheter ce parcours</ButtonLink> : <ButtonLink href="/tarifs" variant="secondary">Voir les tarifs</ButtonLink>}
              <ButtonLink href="/sessions" variant="secondary">Voir les sessions en visio</ButtonLink>
            </div>
            {result.missing.length > 0 && <p className="mt-4 text-xs text-muted">Pour affiner : précisez {result.missing.join(" ; ")}.</p>}
            <p className="mt-4 text-xs text-muted">Recommandation établie par des règles et une comparaison de texte avec le catalogue, sans IA générative. Les modules ne sont achetables qu'une fois publiés.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
