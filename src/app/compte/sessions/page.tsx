import type { Metadata } from "next";
import Link from "next/link";
import { Badge, ButtonLink, Container, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDay, formatRange } from "@/lib/sessions";
import { myBookings } from "@/lib/sessions-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes sessions", robots: { index: false } };

export default async function MySessionsPage() {
  const user = await requireUser();
  const list = await myBookings(user.id);
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-3xl font-bold">Mes sessions en visio</h1>
      {list.length === 0 ? <div className="mt-6"><EmptyState title="Aucune session réservée">Réservez une place dans un atelier ou une séance de questions-réponses.<div className="mt-4"><ButtonLink href="/sessions">Voir le calendrier</ButtonLink></div></EmptyState></div> : (
        <ul className="mt-6 space-y-3">{list.map((s) => (
          <li key={s.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2">{s.booking === "booked" ? <Badge tone="accent">Inscrit(e)</Badge> : <Badge tone="warn">Liste d'attente</Badge>}{s.status === "canceled" && <Badge tone="warn">Annulée</Badge>}</div>
            <p className="mt-2 font-semibold"><Link href={`/sessions/${s.id}`} className="hover:underline">{s.title}</Link></p>
            <p className="text-sm text-muted">{formatDay(s.starts_at)} · {formatRange(s)}</p>
          </li>))}</ul>
      )}
    </Container>
  );
}
