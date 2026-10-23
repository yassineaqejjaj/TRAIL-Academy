import type { Metadata } from "next";
import { Badge, Card } from "@/components/ui";
import { adminPage } from "@/lib/admin/ctx";
import { envChecks, worst, type Check, type Status } from "@/lib/readiness";
import { liveChecks } from "@/lib/readiness-live";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mise en production", robots: { index: false } };

const label: Record<Status, string> = { ok: "OK", warn: "À vérifier", fail: "Bloquant", info: "Info" };
const tone = { ok: "accent", warn: "warn", fail: "warn", info: "neutral" } as const;
const mark: Record<Status, string> = { ok: "✓", warn: "!", fail: "✕", info: "i" };

export default async function ProductionPage() {
  await adminPage(async () => null);
  const checks: Check[] = [...envChecks(process.env), ...(await liveChecks())];
  const groups = [...new Set(checks.map((c) => c.group))];
  const status = worst(checks);
  const blocking = checks.filter((c) => c.status === "fail").length;

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Mise en production</h1>
      <p className="mt-2 max-w-2xl text-muted">État de la configuration de cette instance. Ces contrôles lisent les variables d'environnement et interrogent la base, le stockage et la passerelle vidéo ; ils ne prouvent pas qu'un paiement ou un e-mail réel fonctionne : suivez pour cela la checklist <code>docs/GO_LIVE.md</code>.</p>
      <Card className="mt-6">
        <p className="text-lg font-semibold" role="status">{status === "ok" ? "Aucun point bloquant détecté." : status === "warn" ? "Prêt, avec des points à vérifier." : `${blocking} point(s) bloquant(s) avant la mise en production.`}</p>
      </Card>
      {groups.map((g) => (
        <section key={g} className="mt-8" aria-label={g}>
          <h2 className="mb-3 text-xl font-semibold">{g}</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {checks.filter((c) => c.group === g).map((c) => (
              <li key={c.id} className="flex flex-wrap items-start gap-3 p-4">
                <span className="w-24 shrink-0"><Badge tone={tone[c.status]}><span aria-hidden="true">{mark[c.status]} </span>{label[c.status]}</Badge></span>
                <div className="min-w-0 flex-1"><p className="font-medium">{c.label}</p><p className="text-sm text-muted [overflow-wrap:anywhere]">{c.detail}</p></div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
