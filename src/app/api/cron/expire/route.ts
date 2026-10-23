import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

// Scheduled (see vercel.json). Authorised by CRON_SECRET; flags lapsed entitlements as expired.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await createServiceClient().rpc("expire_entitlements");
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  return NextResponse.json({ expired: data });
}
