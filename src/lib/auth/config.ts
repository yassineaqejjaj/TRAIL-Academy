import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { getPool } from "@/lib/db/pool";
import { sendEmail } from "@/lib/email";
import { resetPassword, verifyEmail } from "@/lib/emails/templates";
import { site } from "@/lib/site";

/** Send without making the HTTP response wait for SMTP (avoids a timing side channel); keeps the task alive on serverless. */
function inBackground(task: Promise<unknown>) {
  try { after(task); } catch { void task; }
}

// OWASP-recommended Argon2id parameters (memory in KiB).
const argon = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32, algorithm: 2 } as const;

function create() {
  const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : undefined;
  const production = process.env.NODE_ENV === "production";
  const secureCookies = (process.env.BETTER_AUTH_URL ?? site.url).startsWith("https://");
  // On by default in production; AUTH_RATE_LIMIT=off exists only for local end-to-end runs against a production build.
  const limited = process.env.AUTH_RATE_LIMIT === "on" || (production && process.env.AUTH_RATE_LIMIT !== "off");

  return betterAuth({
    database: getPool("auth"),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? site.url,
    trustedOrigins: [site.url],
    advanced: { database: { generateId: "uuid" }, useSecureCookies: secureCookies },

    // Table and column names map onto db/migrations/0000_platform.sql (schema "auth").
    user: { modelName: "users", fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at" } },
    session: {
      modelName: "sessions", expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24,
      fields: { userId: "user_id", expiresAt: "expires_at", ipAddress: "ip_address", userAgent: "user_agent", createdAt: "created_at", updatedAt: "updated_at" },
    },
    account: {
      modelName: "accounts",
      fields: {
        userId: "user_id", accountId: "account_id", providerId: "provider_id", accessToken: "access_token", refreshToken: "refresh_token", idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at", refreshTokenExpiresAt: "refresh_token_expires_at", createdAt: "created_at", updatedAt: "updated_at",
      },
    },
    verification: { modelName: "verifications", fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" } },

    // Counters live in PostgreSQL so the limits hold across serverless instances.
    rateLimit: {
      enabled: limited,
      storage: "database", modelName: "rate_limits", fields: { lastRequest: "last_request" },
      window: 60, max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 600, max: 5 },
        "/request-password-reset": { window: 600, max: 5 },
      },
    },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      password: {
        hash: (password) => hash(password, argon),
        verify: ({ password, hash: stored }) => verify(stored, password, argon),
      },
      sendResetPassword: async ({ user, url }) => { inBackground(sendEmail({ to: user.email, ...resetPassword({ name: user.name, url }) })); },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => { inBackground(sendEmail({ to: user.email, ...verifyEmail({ name: user.name, url }) })); },
    },
    socialProviders: google,
    plugins: [nextCookies()], // must stay last: lets server actions set the session cookie
  });
}

type Auth = ReturnType<typeof create>;
const g = globalThis as { __trailAuth?: Auth };

/** Lazily created so `next build` works without a database. */
export function getAuth(): Auth {
  return (g.__trailAuth ??= create());
}

export const googleEnabled = (): boolean => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
