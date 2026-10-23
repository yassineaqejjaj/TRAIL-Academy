import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, Container, EmptyState, ProgressBar, kickerCls } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog/load";
import { asUser } from "@/lib/db";
import { getDashboard } from "@/lib/learning/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon espace", robots: { index: false } };

const pendingLabel = { to_submit: "À rendre", in_review: "En relecture", revision_requested: "Révision demandée" } as const;

export default async function AccountPage() {
  const user = await requireUser();
  const [{ summaries, pending }, catalog] = await Promise.all([getDashboard(user.id), getCatalog()]);
  const date = (d: string) => new Date(d).toLocaleDateString("fr-FR");
  const usable = summaries.filter((s) => !s.expired);
  const active = usable.filter((s) => !s.completedAt);
  const expired = summaries.filter((s) => s.expired);
  const attestations = summaries.filter((s) => s.attestationCode);
  const name = user.name?.split(" ")[0] || user.email.split("@")[0];

  // "Resume" targets the unfinished course with the most progress.
  const resume = [...active].filter((s) => s.resumeLessonId).sort((a, b) => b.percent - a.percent)[0];
  let resumeTitle: string | null = null;
  if (resume?.resumeLessonId) resumeTitle = (await asUser(user.id, (q) => q.one<{ title: string }>("select title from lessons where id = $1", [resume.resumeLessonId])))?.title ?? null;

  // Active path: the learning path (not the bundle) whose modules the learner holds most of.
  const owned = new Set(usable.map((s) => s.course.code));
  const doneCodes = new Set(summaries.filter((s) => s.completedAt).map((s) => s.course.code));
  const path = catalog.learningPaths.filter((p) => p.kind === "path").map((p) => ({ p, held: p.courseCodes.filter((c) => owned.has(c) || doneCodes.has(c)).length })).filter((x) => x.held > 0).sort((a, b) => b.held - a.held)[0]?.p;
  const pathDone = path ? path.courseCodes.filter((c) => doneCodes.has(c)).length : 0;
  const nextCode = path?.courseCodes.find((c) => !doneCodes.has(c));
  const nextCourse = catalog.courses.find((c) => c.code === nextCode);

  return (
    <Container className="flex flex-col gap-12 pb-24 pt-12">
      <div><h1 className="mb-2 text-4xl font-bold">Bonjour {name}</h1><p className="text-sm text-muted">{user.email}</p></div>

      {summaries.length === 0 && (
        <EmptyState title="Aucune formation pour le moment">Vos formations apparaîtront ici après votre achat ou votre invitation par un responsable d'équipe.<div className="mt-4"><ButtonLink href="/formations">Découvrir les formations</ButtonLink></div></EmptyState>
      )}

      {resume && (
        <section aria-label="Reprendre" className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-band p-8 text-band-fg">
          <div className="min-w-0 flex-[1_1_360px]">
            <div className={`${kickerCls} mb-2 text-band-muted`}>Reprendre où vous en étiez</div>
            <div className="font-display text-2xl font-bold">{resume.course.code} · {resumeTitle ?? resume.course.title}</div>
            <div className="text-band-muted">{resume.course.title} · {resume.percent} % terminé</div>
          </div>
          <Link href={`/apprendre/${resume.course.slug}/${resume.resumeLessonId}`} className="inline-flex min-h-12 items-center rounded-lg bg-white px-7 py-3 font-semibold text-[#0b1f3a]">Reprendre la leçon</Link>
        </section>
      )}

      {(active.length > 0 || summaries.some((s) => s.completedAt)) && (
        <section aria-label="Mes formations">
          <h2 className="mb-6 text-2xl font-bold">Mes formations</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {usable.map((s) => (
              <Card key={s.course.id} className="relative flex flex-col gap-3">
                <div className={`flex justify-between gap-2 ${kickerCls} text-muted`}><span>{s.course.code}</span><span>{s.completedAt ? "Terminé" : s.percent > 0 ? "En cours" : "Non commencé"}</span></div>
                <h3 className="text-xl font-bold">{s.resumeLessonId ? <Link href={`/apprendre/${s.course.slug}/${s.resumeLessonId}`} className="after:absolute after:inset-0">{s.course.title}</Link> : s.course.title}</h3>
                <div className="flex flex-col gap-1.5"><ProgressBar value={s.percent} label={`Progression ${s.course.title}`} /><div className="flex justify-between text-sm text-muted"><span>{s.percent} %</span><span>Accès jusqu'au {date(s.expiresAt)}</span></div></div>
                {!s.resumeLessonId && !s.completedAt && <p className="text-sm text-muted">Contenu en préparation.</p>}
              </Card>))}
          </div>
        </section>
      )}

      {(path || pending.length > 0 || attestations.length > 0) && (
        <div className="flex flex-wrap gap-6">
          {path && (
            <section aria-label="Parcours actif" className="min-w-0 flex-[1_1_420px] rounded-2xl border border-border bg-surface p-7">
              <h2 className="mb-1 text-xl font-bold">Parcours actif</h2>
              <div className="mb-4 text-muted">{path.title} · {pathDone} module{pathDone > 1 ? "s" : ""} sur {path.courseCodes.length} terminé{pathDone > 1 ? "s" : ""}</div>
              <ProgressBar value={Math.round((100 * pathDone) / path.courseCodes.length)} label="Progression du parcours" />
              {nextCourse && <div className="mt-4 text-sm text-muted">Prochain module recommandé : {nextCourse.code} · {nextCourse.title}</div>}
            </section>
          )}
          {(pending.length > 0 || attestations.length > 0) && (
            <section aria-label="Livrables et attestations" className="min-w-0 flex-[1_1_420px] rounded-2xl border border-border bg-surface p-7">
              <h2 className="mb-4 text-xl font-bold">Livrables et attestations</h2>
              <ul className="flex flex-col gap-3 text-[15px]">
                {pending.map(({ assignment, state }) => { const c = summaries.find((s) => s.course.id === assignment.course_id)!.course; return (
                  <li key={assignment.id} className="flex justify-between gap-3"><Link className="font-medium hover:underline" href={`/apprendre/${c.slug}/devoir/${assignment.id}`}>{c.code} · {assignment.title}</Link><span className={`rounded-full px-3 py-0.5 text-[13px] font-semibold ${state === "in_review" ? "bg-surface-2 text-muted" : "bg-warn-soft text-warn"}`}>{pendingLabel[state]}</span></li>); })}
                {attestations.map((s) => <li key={s.course.id} className="flex justify-between gap-3"><span>{s.course.code} · Attestation de réussite</span><Link className="font-semibold text-accent hover:underline" href={`/verification/${s.attestationCode}`}>Voir</Link></li>)}
              </ul>
            </section>
          )}
        </div>
      )}

      {expired.length > 0 && (
        <section><h2 className="mb-4 text-xl font-bold">Accès expirés</h2>
          <ul className="space-y-2 text-sm text-muted">{expired.map((s) => <li key={s.course.id}>{s.course.title} — expiré le {date(s.expiresAt)}. Votre progression et vos attestations sont conservées.</li>)}</ul></section>
      )}
    </Container>
  );
}
