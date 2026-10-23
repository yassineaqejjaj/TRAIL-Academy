import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Container } from "@/components/ui";
import { dayKey, nowMs, formatDay, formatRange, isMonth, monthGrid, seatsLeft, shiftMonth, type LiveSession } from "@/lib/sessions";
import { listSessions } from "@/lib/sessions-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sessions en visio", description: "Ateliers et questions-réponses en direct avec le formateur : calendrier, réservation, ajout à votre agenda.", alternates: { canonical: "/sessions" } };

const DAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

function SessionCard({ s }: { s: LiveSession }) {
  const left = seatsLeft(s);
  return (
    <li className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        {s.status === "canceled" ? <Badge tone="warn">Annulée</Badge> : left === 0 ? <Badge tone="warn">Complet · liste d'attente</Badge> : <Badge tone="accent">{left} place{left > 1 ? "s" : ""}</Badge>}
        <Badge>{s.audience === "open" ? "Ouvert à tous les comptes" : s.course_code ? `Apprenants du module ${s.course_code}` : "Apprenants"}</Badge>
      </div>
      <h3 className="mt-3 text-lg font-semibold"><Link href={`/sessions/${s.id}`} className="hover:underline">{s.title}</Link></h3>
      <p className="mt-1 text-sm text-muted"><time dateTime={s.starts_at}>{formatDay(s.starts_at)}</time> · {formatRange(s)} · {s.duration_minutes} min</p>
      {s.course_title && <p className="mt-1 text-sm text-muted">Module : {s.course_code} · {s.course_title}</p>}
      <Link href={`/sessions/${s.id}`} className="mt-3 inline-flex min-h-11 items-center text-[15px] font-semibold text-accent hover:underline">Détails et réservation</Link>
    </li>
  );
}

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const sp = await searchParams;
  const now = new Date(nowMs());
  const ym = isMonth(sp.mois) ? sp.mois : dayKey(now).slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const sessions = await listSessions(new Date(Date.UTC(y, m - 1, -6)), new Date(Date.UTC(y, m, 8)));
  const grid = monthGrid(ym, sessions);
  const upcoming = (await listSessions(now, new Date(now.getTime() + 120 * 86_400_000))).filter((s) => s.status === "published");
  const todayKey = dayKey(now);

  return (
    <Container className="py-12">
      <h1 className="text-4xl font-bold sm:text-5xl">Sessions en visio</h1>
      <p className="mt-3 max-w-2xl text-muted">Ateliers pratiques et questions-réponses en direct avec le formateur. Réservez votre place, ajoutez la session à votre agenda, rejoignez-la depuis votre compte. Les sessions « apprenants » sont réservées aux détenteurs du module concerné.</p>
      <p className="mt-2 text-sm"><a className="font-semibold text-accent hover:underline" href="/sessions/calendar.ics">S'abonner au calendrier (ICS)</a><span className="text-muted"> : titres et horaires seulement.</span></p>

      <section aria-label="Calendrier" className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <Link href={`/sessions?mois=${shiftMonth(ym, -1)}`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold" aria-label="Mois précédent">←</Link>
          <h2 className="text-xl font-semibold capitalize">{grid.label}</h2>
          <Link href={`/sessions?mois=${shiftMonth(ym, 1)}`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold" aria-label="Mois suivant">→</Link>
        </div>
        <div role="grid" aria-label={`Calendrier de ${grid.label}`} className="overflow-hidden rounded-xl border border-border bg-surface text-sm">
          <div role="row" className="grid grid-cols-7 border-b border-border bg-surface-2 text-center font-medium">{DAYS.map((d) => <div role="columnheader" key={d} className="py-2">{d}</div>)}</div>
          {grid.weeks.map((week, wi) => (
            <div role="row" key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
              {week.map((c) => (
                <div role="gridcell" key={c.date} aria-current={c.date === todayKey ? "date" : undefined} className={`min-h-16 border-r border-border p-1 last:border-r-0 sm:min-h-24 sm:p-2 ${c.inMonth ? "" : "bg-bg text-muted"}`}>
                  <span className={`text-xs ${c.date === todayKey ? "rounded-full bg-primary px-1.5 py-0.5 font-semibold text-primary-fg" : ""}`}>{Number(c.date.slice(8))}</span>
                  {c.sessions.map((s) => (
                    <Link key={s.id} href={`/sessions/${s.id}`} className={`mt-1 block truncate rounded px-1 py-0.5 text-xs font-medium ${s.status === "canceled" ? "bg-warn-soft text-warn line-through" : "bg-accent-soft text-accent-ink"}`} title={`${s.title} — ${formatRange(s)}`}>
                      <span className="hidden sm:inline">{new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(new Date(s.starts_at))} </span>{s.title}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Prochaines sessions" className="mt-12">
        <h2 className="text-2xl font-bold">Prochaines sessions</h2>
        {upcoming.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-muted p-6 text-muted">Aucune session n'est programmée pour le moment. Les prochaines dates seront publiées ici ; abonnez-vous au calendrier ou à la <Link className="font-semibold text-accent hover:underline" href="/ressources">lettre d'information</Link> pour être prévenu(e).</p>
        ) : <ul className="mt-4 grid gap-4 md:grid-cols-2">{upcoming.map((s) => <SessionCard key={s.id} s={s} />)}</ul>}
      </section>
    </Container>
  );
}
