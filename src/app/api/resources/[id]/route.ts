import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/env";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // RLS only returns the row if the user may view the lesson (entitlement, preview or admin).
  const supabase = await createClient();
  const { data: resource } = await supabase.from("lesson_resources").select("storage_path, title").eq("id", id.data).maybeSingle();
  if (!resource) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: signed, error } = await createServiceClient().storage.from("lesson-resources").createSignedUrl(resource.storage_path, 60, { download: resource.title });
  if (error || !signed) return NextResponse.json({ error: "unavailable" }, { status: 502 });
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { "Cache-Control": "no-store" } });
}
