import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { dbConfigured } from "@/lib/db/pool";
import { progressSchema } from "@/lib/learning/schemas";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!dbConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!(await rateLimit(`progress:${user.id}`, 60, 60_000))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = progressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  // Authorization and all state changes happen inside the database function.
  try {
    const row = await asUser(user.id, (q) => q.one<{ r: unknown }>("select record_lesson_progress($1, $2, $3) as r", [parsed.data.lessonId, parsed.data.position, parsed.data.completed]));
    return NextResponse.json(row?.r);
  } catch (e) {
    return NextResponse.json({ error: "denied" }, { status: (e as Error).message.includes("access denied") ? 403 : 400 });
  }
}
