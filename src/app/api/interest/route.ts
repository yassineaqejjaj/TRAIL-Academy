import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/env";
import { CONSENT_POLICY_VERSION, interestSchema } from "@/lib/interest";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Service non configuré." }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`interest:${ip}`, 5, 10 * 60_000)) return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });

  const parsed = interestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Formulaire invalide." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true }); // bot: pretend success

  const db = createServiceClient();
  const { email, kind, courseSlug } = parsed.data;
  const { error } = await db.from("interest_signups").insert({ email, kind, course_slug: courseSlug ?? null, consent_policy_version: CONSENT_POLICY_VERSION });
  // A duplicate sign-up is fine and answered identically (no enumeration of who is subscribed).
  if (error && error.code !== "23505") return NextResponse.json({ error: "Inscription impossible pour le moment." }, { status: 500 });
  if (!error) await db.from("consent_records").insert({ anonymous_id: email, purpose: kind === "newsletter" ? "newsletter" : "course_launch", granted: true, policy_version: CONSENT_POLICY_VERSION });
  return NextResponse.json({ ok: true });
}
