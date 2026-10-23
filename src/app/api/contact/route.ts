import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/contact";
import { rateLimit } from "@/lib/rate-limit";
import { deliverLead } from "@/lib/email";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000)) return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });

  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Veuillez vérifier les champs du formulaire." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true }); // silently drop bots

  const result = await deliverLead(parsed.data);
  if (!result.ok) return NextResponse.json({ error: "Le service d'envoi n'est pas encore configuré. Merci de réessayer plus tard." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
