"use server";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth, googleEnabled } from "@/lib/auth/config";
import { dbConfigured } from "@/lib/db/pool";
import { rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";

export interface FormState { error?: string; message?: string }

const email = z.string().trim().toLowerCase().email("E-mail invalide").max(254);
const password = z.string().min(10, "10 caractères minimum").max(128);

async function guard(): Promise<string | null> {
  if (!dbConfigured()) return "L'authentification n'est pas encore configurée.";
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Second line of defence next to the database-backed limits inside the auth library.
  if (!rateLimit(`auth:${ip}`, Number(process.env.AUTH_ACTION_LIMIT ?? 20), 10 * 60 * 1000)) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return null;
}

const codeOf = (e: unknown): string | undefined => (e instanceof APIError ? (e.body as { code?: string } | undefined)?.code : undefined);

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const blocked = await guard();
  if (blocked) return { error: blocked };
  const parsed = z.object({ email, password: z.string().min(1).max(128) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await getAuth().api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (e) {
    // Same message for a wrong password and an unknown account (no account enumeration).
    if (codeOf(e) === "EMAIL_NOT_VERIFIED") return { error: "Adresse e-mail non confirmée. Un nouveau lien de confirmation vient de vous être envoyé." };
    if (e instanceof APIError && e.statusCode === 429) return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
    return { error: "Identifiants incorrects." };
  }
  redirect("/compte");
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const blocked = await guard();
  if (blocked) return { error: blocked };
  const parsed = z.object({ name: z.string().trim().min(2, "Nom trop court").max(120), email, password }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (form.get("terms") !== "on") return { error: "Veuillez accepter les conditions d'utilisation." };
  try {
    await getAuth().api.signUpEmail({ body: { ...parsed.data, callbackURL: "/compte" }, headers: await headers() });
  } catch (e) {
    if (e instanceof APIError && e.statusCode === 429) return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
    return { error: "Inscription impossible. Vérifiez vos informations." };
  }
  // Identical answer whether or not the address already has an account.
  return { message: "Vérifiez votre boîte mail pour confirmer votre adresse." };
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const blocked = await guard();
  if (blocked) return { error: blocked };
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: "E-mail invalide" };
  try { await getAuth().api.requestPasswordReset({ body: { email: parsed.data, redirectTo: `${site.url}/reinitialiser` } }); } catch { /* never reveal whether the account exists */ }
  return { message: "Si un compte existe, un e-mail de réinitialisation vient d'être envoyé." };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const blocked = await guard();
  if (blocked) return { error: blocked };
  const parsed = z.object({ token: z.string().min(10).max(512), newPassword: password }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try { await getAuth().api.resetPassword({ body: parsed.data }); }
  catch { return { error: "Ce lien est invalide ou expiré. Demandez-en un nouveau." }; }
  return { message: "Mot de passe modifié. Vous pouvez vous connecter." };
}

export async function signInWithGoogle() {
  if (!dbConfigured() || !googleEnabled()) redirect("/connexion");
  const res = await getAuth().api.signInSocial({ body: { provider: "google", callbackURL: "/compte" }, headers: await headers() });
  redirect(res.url ?? "/connexion");
}

export async function signOut() {
  if (dbConfigured()) { try { await getAuth().api.signOut({ headers: await headers() }); } catch { /* already signed out */ } }
  redirect("/");
}
