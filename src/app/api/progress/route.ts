import { NextResponse } from "next/server";
import { progressSchema } from "@/lib/learning/schemas";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { supabaseConfigured } from "@/lib/env";

export async function POST(request: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!rateLimit(`progress:${user.id}`, 60, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = progressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  // Authorization and all state changes happen inside the database function.
  const { data, error } = await supabase.rpc("record_lesson_progress", { p_lesson: parsed.data.lessonId, p_position: parsed.data.position, p_completed: parsed.data.completed });
  if (error) return NextResponse.json({ error: "denied" }, { status: error.message.includes("access denied") ? 403 : 400 });
  return NextResponse.json(data);
}
