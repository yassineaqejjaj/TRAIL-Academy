import { type Page, expect } from "@playwright/test";
import pg from "pg";

export const PASSWORD = "correct horse battery staple";

/** Direct database access for arranging state the UI cannot (verifying an e-mail, simulating a webhook-provisioned purchase). */
export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/postgres" });
  await client.connect();
  try { return (await client.query<T>(text, params)).rows; } finally { await client.end(); }
}

export const uniqueEmail = (tag: string) => `${tag}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.test`;

export async function signUp(page: Page, name: string, email: string) {
  await page.goto("/inscription");
  await page.getByLabel("Nom complet").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/Mot de passe/).fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByText("Vérifiez votre boîte mail")).toBeVisible();
}

/** The confirmation link itself is covered by the auth integration tests; here we mark the address verified. */
export async function verifyEmail(email: string) {
  await sql("update auth.users set email_verified = true where email = $1", [email]);
}

export async function signIn(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("E-mail").first().fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/compte/);
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
}

export const userId = async (email: string) => (await sql<{ id: string }>("select id from auth.users where email = $1", [email]))[0].id;

export async function grantCourse(email: string, code: string, months = 12) {
  await sql(
    "insert into entitlements (user_id, course_id, expires_at) select u.id, c.id, now() + make_interval(months => $3) from auth.users u, courses c where u.email = $1 and c.code = $2 on conflict (user_id, course_id) do update set expires_at = excluded.expires_at, status = 'active'",
    [email, code, months]);
}
