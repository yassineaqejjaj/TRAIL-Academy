import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** GDPR art. 15/20: everything the platform holds about the signed-in user, as a JSON download. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await rateLimit(`export:${user.id}`, 5, 60 * 60_000))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const row = await asUser(user.id, (q) => q.one<{ data: unknown }>("select export_my_data() as data"));
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(row?.data ?? {}, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="trail-academy-mes-donnees-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
