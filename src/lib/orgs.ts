/** Types and pure helpers for the enterprise progress report (the data itself comes from org_progress_report()). */
export interface ReportCourse { code: string; title: string; percent: number; quiz_passed: boolean }
export interface ReportSeat { allocation_id: string; path: string | null; valid_until: string }
export interface ReportMember { user_id: string; name: string; email: string; role: "manager" | "learner"; joined: string; seats: ReportSeat[]; courses: ReportCourse[]; last_activity: string | null }
export interface ReportPack { id: string; seats: number; used: number; valid_until: string; path_id: string | null; path: string | null }
export interface Report { organization: string; members: ReportMember[]; packs: ReportPack[]; pending_invitations: { label: string; role: string; expires_at: string }[] }

export const average = (values: number[]): number => (values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0);
export const memberAverage = (m: ReportMember): number => average(m.courses.map((c) => c.percent));

/** CSV a manager can open in a spreadsheet. Neutralises formula injection and quotes every text cell. */
const cell = (v: string | number | null): string => {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};
export function reportCsv(report: Report): string {
  const head = ["Nom", "E-mail", "Rôle", "Parcours attribué", "Modules en cours", "Progression moyenne (%)", "Quiz réussis", "Dernière activité"];
  const rows = report.members.map((m) => [
    m.name, m.email, m.role === "manager" ? "Responsable" : "Apprenant", m.seats.map((s) => s.path ?? "—").join(" / "), m.courses.length, memberAverage(m),
    `${m.courses.filter((c) => c.quiz_passed).length}/${m.courses.length}`, m.last_activity ? m.last_activity.slice(0, 10) : "",
  ]);
  return "﻿" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

export const PRIVACY_NOTICE = "Vous voyez la progression de chaque module (pourcentage), si le quiz est réussi et la date de dernière activité. Vous ne voyez jamais les réponses, les notes, les livrables ni les retours du formateur. Chaque membre a accepté ce partage et peut l'arrêter à tout moment.";
