import "server-only";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "./env";
import { createClient } from "./supabase/server";

export async function getUser() {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser(); // validates the JWT with Supabase Auth
  return data.user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/connexion");
  return user;
}

/** Server-side role check. RLS enforces the same rule in the database (is_admin()). */
export async function requireAdmin() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!data) redirect("/");
  return user;
}
