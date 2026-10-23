import { NextResponse } from "next/server";
import { z } from "zod";
import { llmConfigured, llmSummary, MAX_TEXT } from "@/lib/advisor/llm";
import { getCatalog } from "@/lib/catalog/load";
import { rateLimit } from "@/lib/rate-limit";

/** Optional AI-written summary. Without ADVISOR_LLM_URL it answers 404: the page then works fully in the browser. */
export async function POST(request: Request) {
  if (!llmConfigured()) return NextResponse.json({ error: "not_enabled" }, { status: 404 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await rateLimit(`advisor:${ip}`, 8, 10 * 60_000))) return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });
  const parsed = z.object({ text: z.string().trim().min(20).max(MAX_TEXT) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Décrivez votre métier et votre objectif en quelques phrases (20 caractères minimum)." }, { status: 400 });
  const out = await llmSummary(parsed.data.text, await getCatalog());
  return NextResponse.json({ summary: out?.summary ?? null, model: out?.model ?? null });
}
