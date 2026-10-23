import { NextResponse } from "next/server";
import { buildIcs } from "@/lib/sessions";
import { listSessions } from "@/lib/sessions-data";
import { site } from "@/lib/site";

export const revalidate = 300;

/** Public calendar feed (subscribe from any calendar app): titles and times only, never the meeting links. */
export async function GET() {
  const sessions = await listSessions(new Date(Date.now() - 86_400_000), new Date(Date.now() + 365 * 86_400_000));
  const ics = buildIcs(sessions.map((s) => ({ uid: s.id, title: s.title, description: `${s.description}\n\nInscription et détails : ${site.url}/sessions/${s.id}`.trim(), startsAt: s.starts_at, durationMinutes: s.duration_minutes, url: `${site.url}/sessions/${s.id}`, location: `${site.url}/sessions/${s.id}`, canceled: s.status === "canceled" })), { name: `${site.name} — sessions en visio`, domain: new URL(site.url).hostname });
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
