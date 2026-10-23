import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: sends visitors without a session cookie to the login page before any private page renders.
// It does NOT validate the session. Real authorization happens again in server code (requireUser / requireAdmin)
// and in PostgreSQL (Row Level Security).
export function proxy(request: NextRequest) {
  if (!process.env.DATABASE_URL) return NextResponse.next();
  if (!getSessionCookie(request)) return NextResponse.redirect(new URL("/connexion", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/compte/:path*", "/admin/:path*", "/apprendre/:path*"] };
