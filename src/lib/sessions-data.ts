import "server-only";
import { asAnon, asService, asUser } from "@/lib/db";
import { dbConfigured } from "@/lib/db/pool";
import type { LiveSession } from "./sessions";

export async function listSessions(from: Date, to: Date): Promise<LiveSession[]> {
  if (!dbConfigured()) return [];
  try { return (await asAnon((q) => q.one<{ l: LiveSession[] }>("select list_sessions($1, $2) as l", [from.toISOString(), to.toISOString()])))?.l ?? []; } catch { return []; }
}

export async function getSession(id: string): Promise<LiveSession | null> {
  if (!dbConfigured()) return null;
  try { return (await asAnon((q) => q.one<{ s: LiveSession | null }>("select get_session($1) as s", [id])))?.s ?? null; } catch { return null; }
}

export interface MyBooking { id: string; title: string; starts_at: string; duration_minutes: number; status: string; booking: "booked" | "waitlist"; course_code: string | null }
export const myBookings = (userId: string): Promise<MyBooking[]> =>
  asUser(userId, async (q) => (await q.one<{ l: MyBooking[] }>("select my_sessions() as l"))?.l ?? []);

export const bookingStatus = (userId: string, id: string): Promise<string | null> =>
  asUser(userId, async (q) => (await q.one<{ status: string }>("select status from session_bookings where session_id = $1 and user_id = $2", [id, userId]))?.status ?? null);

/** The private link, only for administrators and confirmed bookings (enforced in SQL). */
export const meetingUrl = (userId: string, id: string): Promise<string | null> =>
  asUser(userId, async (q) => (await q.one<{ u: string | null }>("select session_meeting_url($1) as u", [id]))?.u ?? null);

export const attendeeContact = (userId: string): Promise<{ email: string; name: string } | null> =>
  asService((q) => q.one<{ email: string; name: string }>("select email, name from user_contact($1)", [userId]));
