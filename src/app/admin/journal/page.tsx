import type { Metadata } from "next";
import { adminPage } from "@/lib/admin/ctx";
import { Table } from "../ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Journal d'audit — administration", robots: { index: false } };

const entities = ["courses", "lessons", "products", "prices", "coupons", "orders", "payments", "entitlements", "quiz_questions", "assignment_submissions", "blog_posts", "testimonials", "faq_items", "page_sections", "system_settings"];

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  const { entity } = await searchParams;
  const filter = entity && entities.includes(entity) ? entity : null;
  const { data, actors } = await adminPage(async (q) => {
    const data = await q<{ id: number; actor_id: string | null; action: string; entity: string; entity_id: string | null; details: unknown; created_at: string }>(
      "select id, actor_id, action, entity, entity_id, details, created_at from audit_logs where ($1::text is null or entity = $1) order by id desc limit 200", [filter]);
    const actorIds = Array.from(new Set(data.map((l) => l.actor_id).filter(Boolean))) as string[];
    const actors = actorIds.length ? await q<{ id: string; email: string }>("select id, email from profiles where id = any($1::uuid[])", [actorIds]) : [];
    return { data, actors };
  });

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Journal d'audit</h1>
      <p className="mt-2 text-sm text-muted">Écriture seule : les entrées ne peuvent être ni modifiées ni supprimées. « Système » = traitement automatique (webhooks, tâches planifiées).</p>
      <nav aria-label="Filtrer par table" className="mt-4 flex flex-wrap gap-2 text-sm">
        <a href="/admin/journal" className={`rounded-full border px-3 py-1.5 ${!entity ? "border-primary bg-primary text-primary-fg" : "border-border"}`}>Tout</a>
        {entities.map((e) => <a key={e} href={`/admin/journal?entity=${e}`} className={`rounded-full border px-3 py-1.5 ${entity === e ? "border-primary bg-primary text-primary-fg" : "border-border"}`}>{e}</a>)}
      </nav>
      <div className="mt-6"><Table head={["Date", "Auteur", "Action", "Objet", "Détails"]}>
        {data.map((l) => (
          <tr key={l.id} className="align-top"><td className="p-3 whitespace-nowrap">{new Date(l.created_at).toLocaleString("fr-FR")}</td><td className="p-3">{l.actor_id ? actors.find((a) => a.id === l.actor_id)?.email ?? l.actor_id.slice(0, 8) : "Système"}</td>
            <td className="p-3">{l.action}</td><td className="p-3"><span className="font-mono text-xs">{l.entity}</span><span className="block text-xs text-muted">{String(l.entity_id ?? "").slice(0, 36)}</span></td>
            <td className="p-3"><details><summary className="cursor-pointer text-accent">Voir</summary><pre className="mt-2 max-w-md overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(l.details, null, 2)}</pre></details></td></tr>))}
      </Table></div>
    </>
  );
}
