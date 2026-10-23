/** Live sessions: types, ICS calendar files and the month grid. Pure functions, no I/O. */

export interface LiveSession {
  id: string; title: string; description: string; course_code: string | null; course_slug: string | null; course_title: string | null;
  starts_at: string; duration_minutes: number; capacity: number; audience: "learners" | "open"; status: "published" | "canceled" | "draft";
  booked: number; waitlist: number;
}

/** Current time, behind a function so server components stay free of impure calls in their render body. */
export const nowMs = (): number => Date.now();
export const TIME_ZONE = "Europe/Paris";
export const seatsLeft = (s: Pick<LiveSession, "capacity" | "booked">): number => Math.max(0, s.capacity - s.booked);
export const endsAt = (s: Pick<LiveSession, "starts_at" | "duration_minutes">): Date => new Date(new Date(s.starts_at).getTime() + s.duration_minutes * 60_000);

const fmt = (opts: Intl.DateTimeFormatOptions, d: Date | string) => new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, ...opts }).format(typeof d === "string" ? new Date(d) : d);
export const formatDay = (d: Date | string) => fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }, d);
export const formatTime = (d: Date | string) => fmt({ hour: "2-digit", minute: "2-digit" }, d);
export const formatRange = (s: Pick<LiveSession, "starts_at" | "duration_minutes">) => `${formatTime(s.starts_at)} – ${formatTime(endsAt(s))} (heure de Paris)`;
/** Year-month-day in Paris, to group sessions by calendar day whatever the server's time zone. */
export const dayKey = (d: Date | string): string => new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE }).format(typeof d === "string" ? new Date(d) : d);

/* ───────── ICS (RFC 5545) ───────── */
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines are limited to 75 octets and continued with a leading space. */
function fold(line: string): string {
  const out: string[] = []; let cur = ""; let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export interface IcsEvent { uid: string; title: string; description: string; startsAt: string; durationMinutes: number; location?: string; url?: string; canceled?: boolean }

export function buildIcs(events: IcsEvent[], opts: { name: string; domain: string; now?: Date }): string {
  const stamp = icsDate(opts.now ?? new Date());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TRAIL Academy//Sessions//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${escapeText(opts.name)}`];
  for (const e of events) {
    const start = new Date(e.startsAt);
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@${opts.domain}`, `DTSTAMP:${stamp}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(new Date(start.getTime() + e.durationMinutes * 60_000))}`,
      `SUMMARY:${escapeText(e.title)}`, `DESCRIPTION:${escapeText(e.description)}`, ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []), ...(e.url ? [`URL:${e.url}`] : []),
      `STATUS:${e.canceled ? "CANCELLED" : "CONFIRMED"}`, "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(e.title)}`, "TRIGGER:-PT15M", "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/* ───────── Month grid ───────── */
export interface MonthCell { date: string; inMonth: boolean; sessions: LiveSession[] }

/** Weeks (Monday first) of a month; each day holds its sessions. `ym` is "YYYY-MM". */
export function monthGrid(ym: string, sessions: LiveSession[]): { label: string; weeks: MonthCell[][] } {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(y, m - 1, 1 - offset));
  const byDay = new Map<string, LiveSession[]>();
  for (const s of sessions) byDay.set(dayKey(s.starts_at), [...(byDay.get(dayKey(s.starts_at)) ?? []), s]);
  const weeks: MonthCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: MonthCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start.getTime() + (w * 7 + d) * 86_400_000);
      const key = cell.toISOString().slice(0, 10);
      row.push({ date: key, inMonth: cell.getUTCMonth() === m - 1, sessions: byDay.get(key) ?? [] });
    }
    if (w >= 4 && !row.some((c) => c.inMonth)) break;
    weeks.push(row);
  }
  return { label: new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "long", year: "numeric" }).format(first), weeks };
}

export const shiftMonth = (ym: string, delta: number): string => { const [y, m] = ym.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + delta, 1)); return d.toISOString().slice(0, 7); };
export const isMonth = (v: string | undefined): v is string => Boolean(v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v));
