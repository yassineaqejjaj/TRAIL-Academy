import { endsAt, formatDay, formatRange, type LiveSession } from "@/lib/sessions";
import type { Email } from "./templates";

const when = (s: LiveSession) => `${formatDay(s.starts_at)}, ${formatRange(s)}`;

export function bookingConfirmed(p: { name: string; session: LiveSession; appUrl: string; waitlist: boolean }): Email {
  return {
    subject: `${p.waitlist ? "Liste d'attente" : "Inscription confirmée"} — ${p.session.title}`,
    text: `Bonjour ${p.name},\n\n${p.waitlist ? "La session est complète : vous êtes sur liste d'attente. Nous vous écrivons si une place se libère.\n" : "Votre place est réservée."}\n\n${p.session.title}\n${when(p.session)}\n\nLe lien de connexion est disponible sur la page de la session, une fois connecté(e) :\n${p.appUrl}/sessions/${p.session.id}\n\nPour annuler et libérer votre place, utilisez la même page.\n\nTRAIL Academy`,
  };
}

export function seatFreed(p: { name: string; session: LiveSession; appUrl: string }): Email {
  return { subject: `Une place s'est libérée — ${p.session.title}`, text: `Bonjour ${p.name},\n\nUne place s'est libérée : vous êtes inscrit(e) à « ${p.session.title} ».\n${when(p.session)}\n\nLien de connexion et ajout au calendrier : ${p.appUrl}/sessions/${p.session.id}\n\nVous ne pouvez plus venir ? Annulez sur la même page pour laisser la place.\n\nTRAIL Academy` };
}

export function sessionCanceled(p: { name: string; session: LiveSession; appUrl: string }): Email {
  return { subject: `Session annulée — ${p.session.title}`, text: `Bonjour ${p.name},\n\nLa session « ${p.session.title} » prévue le ${when(p.session)} est annulée. Nous sommes désolés pour la gêne occasionnée.\n\nD'autres dates : ${p.appUrl}/sessions\n\nTRAIL Academy` };
}

export { endsAt };
