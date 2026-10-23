import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { asService } from "@/lib/db";

// Scheduled (see vercel.json). Authorised by CRON_SECRET; flags lapsed entitlements as expired.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok = Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const row = await asService((q) => q.one<{ n: number }>("select expire_entitlements() as n"));
    return NextResponse.json({ expired: row?.n ?? 0 });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
