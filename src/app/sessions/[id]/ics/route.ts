import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { buildIcs } from "@/lib/sessions";
import { bookingStatus, getSession, meetingUrl } from "@/lib/sessions-data";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Calendar file for one session. Includes the private meeting link only for confirmed bookings. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = z.string().uuid().safeParse((await params).id);
  const session = id.success ? await getSession(id.data) : null;
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const user = await getUser();
  const link = user && (await bookingStatus(user.id, session.id)) === "booked" ? await meetingUrl(user.id, session.id) : null;
  const page = `${site.url}/sessions/${session.id}`;
  const ics = buildIcs([{ uid: session.id, title: session.title, description: `${session.description}${link ? `\n\nLien de connexion : ${link}` : `\n\nDétails et lien de connexion : ${page}`}`.trim(), startsAt: session.starts_at, durationMinutes: session.duration_minutes, location: link ?? page, url: page, canceled: session.status === "canceled" }], { name: `${site.name} — ${session.title}`, domain: new URL(site.url).hostname });
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="trail-session-${session.id.slice(0, 8)}.ics"`, "Cache-Control": "private, no-store" } });
}
