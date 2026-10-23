// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, serveOverTcp } from "./helpers/db";

const sent: { to: string; subject: string; text: string }[] = [];
vi.mock("@/lib/email", () => ({ sendEmail: async (m: { to: string; subject: string; text: string }) => { sent.push(m); return { ok: true }; }, deliverLead: async () => ({ ok: true }) }));

let db: PGlite;
let stop: () => Promise<void>;
let auth: ReturnType<typeof import("@/lib/auth/config").getAuth>;
const lastLink = () => sent[sent.length - 1].text.match(/https?:\/\/\S+/)![0];
const tokenOf = (url: string) => new URL(url).searchParams.get("token") ?? url.split("/").pop()!.split("?")[0];
const PASSWORD = "correct horse battery";

beforeAll(async () => {
  db = await createTestDb();
  const served = await serveOverTcp(db, 54412);
  stop = served.stop;
  Object.assign(process.env, { DATABASE_URL: served.url, DATABASE_AUTH_POOL_MAX: "1", DATABASE_POOL_MAX: "1", BETTER_AUTH_SECRET: "test-secret-".padEnd(48, "x"), BETTER_AUTH_URL: "http://localhost:3000", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" });
  auth = (await import("@/lib/auth/config")).getAuth();
}, 60_000);

afterAll(async () => {
  const { getPool } = await import("@/lib/db/pool");
  await getPool("auth").end(); await getPool("app").end().catch(() => undefined);
  await stop();
});

describe("authentication (Better Auth on PostgreSQL)", () => {
  it("signs up, creating the profile and the learner role through the database trigger", async () => {
    await auth.api.signUpEmail({ body: { name: "Alice Martin", email: "alice@example.fr", password: PASSWORD } });
    const profile = (await db.query<{ email: string; full_name: string }>("select email, full_name from profiles where email = 'alice@example.fr'")).rows[0];
    expect(profile).toEqual({ email: "alice@example.fr", full_name: "Alice Martin" });
    expect((await db.query("select role from user_roles where user_id = (select id from auth.users where email = 'alice@example.fr')")).rows).toEqual([{ role: "learner" }]);
  });

  it("stores an Argon2id hash, never the password", async () => {
    const { password } = (await db.query<{ password: string }>("select password from auth.accounts limit 1")).rows[0];
    expect(password).toMatch(/^\$argon2id\$/);
    expect(password).not.toContain(PASSWORD);
  });

  it("sends a verification e-mail and refuses sign-in until the address is verified", async () => {
    expect(sent.at(-1)).toMatchObject({ to: "alice@example.fr", subject: expect.stringContaining("Confirmez") });
    await expect(auth.api.signInEmail({ body: { email: "alice@example.fr", password: PASSWORD } })).rejects.toThrow();
  });

  it("verifies the address from the e-mailed link and then signs in with a database session", async () => {
    await auth.api.verifyEmail({ query: { token: tokenOf(lastLink()) } });
    const res = await auth.api.signInEmail({ body: { email: "alice@example.fr", password: PASSWORD }, returnHeaders: true });
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/better-auth\.session_token=/i);
    expect(cookie).toMatch(/HttpOnly/i);
    const session = await auth.api.getSession({ headers: new Headers({ cookie: cookie.split(";")[0] }) });
    expect(session?.user.email).toBe("alice@example.fr");
    expect((await db.query("select 1 from auth.sessions")).rows.length).toBeGreaterThan(0);
  });

  it("rejects a wrong password and an unknown account the same way", async () => {
    const wrong = await auth.api.signInEmail({ body: { email: "alice@example.fr", password: "not the password!" } }).catch((e) => e);
    const unknown = await auth.api.signInEmail({ body: { email: "nobody@example.fr", password: PASSWORD } }).catch((e) => e);
    expect(wrong.status).toBe(unknown.status);
    expect(wrong.body?.message).toBe(unknown.body?.message);
  });

  it("enforces the minimum password length", async () => {
    await expect(auth.api.signUpEmail({ body: { name: "Bob", email: "bob@example.fr", password: "short" } })).rejects.toThrow();
  });

  it("resets a password from the e-mailed link and revokes existing sessions", async () => {
    await auth.api.requestPasswordReset({ body: { email: "alice@example.fr", redirectTo: "/reinitialiser" } });
    expect(sent.at(-1)!.subject).toContain("Réinitialisation");
    await auth.api.resetPassword({ body: { newPassword: "a brand new passphrase", token: tokenOf(lastLink()) } });
    expect((await db.query("select 1 from auth.sessions")).rows).toHaveLength(0);
    await expect(auth.api.signInEmail({ body: { email: "alice@example.fr", password: PASSWORD } })).rejects.toThrow();
    await expect(auth.api.signInEmail({ body: { email: "alice@example.fr", password: "a brand new passphrase" } })).resolves.toBeTruthy();
  });

  it("keeps the auth tables out of reach of application roles", async () => {
    await db.exec("set role authenticated");
    await expect(db.query("select * from auth.accounts")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });
});
