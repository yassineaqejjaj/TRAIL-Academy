import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth/config";
import { asUser } from "./db";
import { dbConfigured } from "./db/pool";

export interface SessionUser { id: string; email: string; name: string; emailVerified: boolean }

/** The signed-in user, validated against the database session (not just the cookie), or null. */
export async function getUser(): Promise<SessionUser | null> {
  if (!dbConfigured()) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user ? { id: session.user.id, email: session.user.email, name: session.user.name, emailVerified: session.user.emailVerified } : null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/connexion");
  return user;
}

/** Server-side role check. The database enforces the same rule independently (is_admin() in RLS and functions). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  const row = await asUser(user.id, (q) => q.one("select 1 as ok from user_roles where user_id = $1 and role = 'admin'", [user.id]));
  if (!row) redirect("/");
  return user;
}
