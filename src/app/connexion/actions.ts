"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export interface FormState { error?: string; message?: string }

const credentials = z.object({ email: z.string().trim().email("E-mail invalide"), password: z.string().min(8, "8 caractères minimum").max(200) });

async function guard(): Promise<string | null> {
  if (!supabaseConfigured()) return "L'authentification n'est pas encore configurée.";
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`auth:${ip}`, 10, 10 * 60 * 1000)) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return null;
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const blocked = await guard();
  if (blocked) return { error: blocked };
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Identifiants incorrects ou e-mail non vérifié." };
  redirect("/compte");
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const blocked = await guard();
  if (blocked) return { error: blocked };
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (form.get("terms") !== "on") return { error: "Veuillez accepter les conditions d'utilisation." };
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ ...parsed.data, options: { emailRedirectTo: `${origin}/auth/callback` } });
  if (error) return { error: "Inscription impossible. Vérifiez vos informations." };
  return { message: "Vérifiez votre boîte mail pour confirmer votre adresse." };
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const blocked = await guard();
  if (blocked) return { error: blocked };
  const email = z.string().trim().email().safeParse(form.get("email"));
  if (!email.success) return { error: "E-mail invalide" };
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${origin}/auth/callback?next=/compte` });
  // Same answer whether or not the account exists (no user enumeration).
  return { message: "Si un compte existe, un e-mail de réinitialisation vient d'être envoyé." };
}

export async function signOut() {
  if (supabaseConfigured()) await (await createClient()).auth.signOut();
  redirect("/");
}
