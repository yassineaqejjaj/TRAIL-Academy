import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { reportCsv, type Report } from "@/lib/orgs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return new NextResponse("Non connecté", { status: 401 });
  const org = z.string().uuid().safeParse(new URL(request.url).searchParams.get("org"));
  if (!org.success) return new NextResponse("Organisation invalide", { status: 400 });
  try {
    const report = (await asUser(user.id, (q) => q.one<{ r: Report }>("select org_progress_report($1) as r", [org.data])))?.r;
    if (!report) return new NextResponse("Introuvable", { status: 404 });
    return new NextResponse(reportCsv(report), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="progression-equipe.csv"', "cache-control": "no-store" } });
  } catch {
    return new NextResponse("Accès refusé", { status: 403 });
  }
}
