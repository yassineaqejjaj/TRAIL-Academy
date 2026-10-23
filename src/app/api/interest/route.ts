import { NextResponse } from "next/server";
import { asService } from "@/lib/db";
import { dbConfigured } from "@/lib/db/pool";
import { CONSENT_POLICY_VERSION, interestSchema } from "@/lib/interest";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!dbConfigured()) return NextResponse.json({ error: "Service non configuré." }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await rateLimit(`interest:${ip}`, 5, 10 * 60_000))) return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });

  const parsed = interestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Formulaire invalide." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true }); // bot: pretend success

  const { email, kind, courseSlug } = parsed.data;
  try {
    await asService(async (q) => {
      const inserted = await q("insert into interest_signups (email, kind, course_slug, consent_policy_version) values ($1, $2, $3, $4) on conflict do nothing returning id", [email, kind, courseSlug ?? null, CONSENT_POLICY_VERSION]);
      // A duplicate sign-up is fine and answered identically (no enumeration of who is subscribed).
      if (inserted.length) await q("insert into consent_records (anonymous_id, purpose, granted, policy_version) values ($1, $2, true, $3)", [email, kind === "newsletter" ? "newsletter" : "course_launch", CONSENT_POLICY_VERSION]);
    });
  } catch {
    return NextResponse.json({ error: "Inscription impossible pour le moment." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
