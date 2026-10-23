import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Badge, Button, ButtonLink, Container, Notice } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { endsAt, nowMs, formatDay, formatRange, seatsLeft } from "@/lib/sessions";
import { bookingStatus, getSession, meetingUrl } from "@/lib/sessions-data";
import { bookSession, cancelBooking } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = z.string().uuid().safeParse((await params).id);
  const s = id.success ? await getSession(id.data) : null;
  return s ? { title: `${s.title} — session en visio`, description: s.description.slice(0, 160) || "Session en visio avec le formateur." } : {};
}

const MESSAGES: Record<string, string> = {
  access: "Cette session est réservée aux détenteurs du module concerné. Vous pouvez l'obtenir depuis la page du module.",
  started: "Cette session a déjà commencé ou est terminée : les inscriptions sont closes.",
  unavailable: "Cette session n'est plus disponible.",
  rate_limited: "Trop de tentatives. Réessayez dans quelques minutes.",
  failed: "La réservation a échoué. Réessayez.",
};

export default async function SessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const sp = await searchParams;
  const s = await getSession(id.data);
  if (!s || s.status === "draft") notFound();
  const user = await getUser();
  const mine = user ? await bookingStatus(user.id, s.id) : null;
  const booked = mine === "booked";
  const link = booked && user ? await meetingUrl(user.id, s.id) : null;
  const left = seatsLeft(s);
  const past = endsAt(s).getTime() < nowMs();
  const started = new Date(s.starts_at).getTime() <= nowMs();
  const canceled = s.status === "canceled";

  return (
    <Container className="max-w-3xl py-12">
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted"><Link href="/sessions" className="hover:text-fg">Sessions en visio</Link> / <span aria-current="page">{s.title}</span></nav>
      <div className="mt-6 flex flex-wrap gap-2">
        {canceled ? <Badge tone="warn">Annulée</Badge> : past ? <Badge>Terminée</Badge> : left === 0 ? <Badge tone="warn">Complet</Badge> : <Badge tone="accent">{left} place{left > 1 ? "s" : ""} restante{left > 1 ? "s" : ""}</Badge>}
        <Badge>{s.audience === "open" ? "Ouvert à tous les comptes" : s.course_code ? `Réservé aux apprenants du module ${s.course_code}` : "Réservé aux apprenants"}</Badge>
      </div>
      <h1 className="mt-3 text-4xl font-bold">{s.title}</h1>
      <p className="mt-3 text-lg"><time dateTime={s.starts_at}>{formatDay(s.starts_at)}</time><br /><span className="text-muted">{formatRange(s)} · {s.duration_minutes} min · visioconférence</span></p>
      {s.course_title && <p className="mt-2 text-sm text-muted">Module : <Link className="font-semibold text-accent hover:underline" href={`/formations/${s.course_slug}`}>{s.course_code} · {s.course_title}</Link></p>}

      <div className="mt-6 space-y-3" aria-live="polite">
        {sp.ok === "booked" && <Notice tone="info" title="Place réservée">Vous êtes inscrit(e). Le lien de connexion s'affiche ci-dessous.</Notice>}
        {sp.ok === "waitlist" && <Notice tone="info" title="Sur liste d'attente">La session est complète. Si une place se libère, vous serez inscrit(e) automatiquement et prévenu(e) par e-mail.</Notice>}
        {sp.ok === "canceled" && <Notice tone="info" title="Réservation annulée">Votre place est libérée.</Notice>}
        {sp.error && <Notice title="Réservation impossible">{MESSAGES[sp.error] ?? MESSAGES.failed}</Notice>}
        {canceled && <Notice title="Session annulée">Cette session n'aura pas lieu. Consultez les <Link className="font-semibold text-accent hover:underline" href="/sessions">prochaines dates</Link>.</Notice>}
      </div>

      {s.description && <div className="mt-8 whitespace-pre-wrap text-[17px] leading-7 text-muted">{s.description}</div>}

      <section className="mt-10 rounded-2xl border border-border bg-surface p-6" aria-label="Réservation">
        {canceled || past ? <p className="text-muted">Les inscriptions sont closes.</p>
          : !user ? <><p className="mb-4 text-muted">Connectez-vous pour réserver votre place.</p><ButtonLink href="/connexion">Se connecter</ButtonLink></>
          : booked ? (
            <div className="grid gap-4">
              <p className="font-semibold text-success">Vous êtes inscrit(e) à cette session.</p>
              {link ? <div><ButtonLink href={link} target="_blank" rel="noopener noreferrer" variant="accent">{started ? "Rejoindre maintenant" : "Lien de connexion"}</ButtonLink><p className="mt-2 break-all text-sm text-muted">{link}</p><p className="mt-1 text-xs text-muted">Lien personnel : ne le diffusez pas.</p></div> : null}
              <div className="flex flex-wrap gap-3"><ButtonLink href={`/sessions/${s.id}/ics`} variant="secondary" download>Ajouter à mon agenda (.ics)</ButtonLink>
                <form action={cancelBooking}><input type="hidden" name="id" value={s.id} /><Button type="submit" variant="ghost">Annuler ma place</Button></form></div>
            </div>
          ) : mine === "waitlist" ? (
            <div className="grid gap-3"><p className="font-semibold">Vous êtes sur liste d'attente.</p><form action={cancelBooking}><input type="hidden" name="id" value={s.id} /><Button type="submit" variant="ghost">Quitter la liste d'attente</Button></form></div>
          ) : (
            <form action={bookSession} className="grid gap-3"><input type="hidden" name="id" value={s.id} />
              <Button type="submit" variant="accent" className="self-start">{left === 0 ? "Me mettre sur liste d'attente" : "Réserver ma place"}</Button>
              <p className="text-sm text-muted">Gratuit. Vous recevrez une confirmation par e-mail et pourrez ajouter la session à votre agenda.{s.audience === "learners" ? " Réservé aux détenteurs du module." : ""}</p></form>
          )}
      </section>
    </Container>
  );
}
