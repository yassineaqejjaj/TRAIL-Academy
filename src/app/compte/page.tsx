import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, EmptyState, ProgressBar, kickerCls } from "@/components/ui";
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
    <div className="flex flex-col gap-8 px-1 pb-16 pt-2 sm:px-3">
      <div className="flex flex-col gap-1"><span className="text-sm text-muted">{path ? `Parcours ${path.title}` : user.email}</span><h1 className="display-light text-3xl sm:text-4xl">Bonjour <b>{name}</b>{resume ? ", reprenons où vous en étiez." : "."}</h1></div>

      {summaries.length === 0 && (
        <EmptyState title="Aucune formation pour le moment">Vos formations apparaîtront ici après votre achat ou votre invitation par un responsable d'équipe.<div className="mt-4"><ButtonLink href="/formations">Découvrir les formations</ButtonLink></div></EmptyState>
      )}

      {resume && (
        <section aria-label="Reprendre" className="glass-strong relative flex flex-wrap items-center gap-7 overflow-hidden rounded-[30px] p-7 sm:p-8">
          <svg aria-hidden viewBox="0 0 700 260" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full opacity-70"><defs><filter id="rs-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" /></filter></defs><path d="M-20 230 C 160 210, 260 90, 420 120 S 620 220, 720 40" fill="none" stroke="#3ccfc0" strokeWidth="8" filter="url(#rs-blur)" opacity=".5" /></svg>
          <div className="relative size-[120px] flex-none">
            <svg viewBox="0 0 110 110" role="img" aria-label={`Module ${resume.course.code} terminé à ${resume.percent} %`} className="size-[120px] -rotate-90">
              <circle cx="55" cy="55" r="48" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="8" />
              <circle cx="55" cy="55" r="48" fill="none" stroke="#3ccfc0" strokeWidth="8" strokeLinecap="round" strokeDasharray="302" strokeDashoffset={Math.round(302 * (1 - resume.percent / 100))} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display text-[26px] font-bold">{resume.percent} %</span>
          </div>
          <div className="relative flex min-w-[220px] flex-1 flex-col gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">Reprendre</span>
            <span className="font-display text-2xl font-semibold leading-tight">{resumeTitle ?? resume.course.title}</span>
            <span className="text-sm text-muted">{resume.course.code} · {resume.course.title}</span>
            <Link href={`/apprendre/${resume.course.slug}/${resume.resumeLessonId}`} className="cta-glow mt-1 inline-flex min-h-12 items-center gap-2.5 self-start rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-fg"><svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 21 12 6 21" /></svg>Continuer la leçon</Link>
          </div>
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
            <section aria-label="Parcours actif" className="glass min-w-0 flex-[1_1_420px] rounded-3xl p-7">
              <h2 className="mb-1 font-display text-xl font-semibold">Mon parcours</h2>
              <div className="mb-5 text-sm text-muted">{path.title} · {pathDone} module{pathDone > 1 ? "s" : ""} sur {path.courseCodes.length} terminé{pathDone > 1 ? "s" : ""}</div>
              <ol className="flex flex-wrap gap-x-5 gap-y-4">
                {path.courseCodes.map((code) => {
                  const done = doneCodes.has(code), open = owned.has(code);
                  const c = catalog.courses.find((x) => x.code === code);
                  return (
                    <li key={code} className="flex w-[84px] flex-col items-center gap-1.5 text-center">
                      <span aria-hidden className={`flex size-11 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-blue text-on-accent" : open ? "bg-accent text-on-accent shadow-[0_0_0_5px_rgba(60,207,192,0.18)]" : "border-2 border-white/25 bg-[#0a1a33]"}`}>{done ? "✓" : ""}</span>
                      <span className="font-display text-[13px] font-bold">{code}</span>
                      <span className="text-[11px] leading-tight text-muted">{c?.title}<span className="sr-only"> : {done ? "terminé" : open ? "accessible" : "à venir"}</span></span>
                    </li>
                  );
                })}
              </ol>
              {nextCourse && <div className="mt-5 text-sm text-muted">Prochain module recommandé : {nextCourse.code} · {nextCourse.title}</div>}
            </section>
          )}
          {(pending.length > 0 || attestations.length > 0) && (
            <section aria-label="Livrables et attestations" className="min-w-0 flex-[1_1_420px] glass rounded-3xl p-7">
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
    </div>
  );
}
