import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { dbConfigured } from "@/lib/db/pool";
import { presignDownload, storageConfigured } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured() || !storageConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // RLS only returns the row if the user may view the lesson (entitlement, free preview or admin).
  const resource = await asUser(user.id, (q) => q.one<{ storage_path: string; title: string }>("select storage_path, title from lesson_resources where id = $1", [id.data]));
  if (!resource) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = await presignDownload({ key: resource.storage_path, filename: resource.title, ttlSeconds: 60 });
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
}
