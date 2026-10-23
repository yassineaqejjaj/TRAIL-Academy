import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXPECTED_MIGRATION, envChecks, worst } from "@/lib/readiness";

const good = {
  NEXT_PUBLIC_SITE_URL: "https://academy.example.com", NEXT_PUBLIC_CONTACT_EMAIL: "hello@example.com", LEADS_TO_EMAIL: "me@example.com",
  DATABASE_URL: "postgres://u:p@h/db", BETTER_AUTH_SECRET: "k3Jd9sLq0Zx8Vn2mPq7Rt5Yw1Uc4Bh6Gf3Ea9Dz", SMTP_URL: "smtp://u:p@smtp.example.com:587", EMAIL_FROM: "TRAIL <no-reply@example.com>",
  S3_ENDPOINT: "http://minio.railway.internal:9000", S3_PUBLIC_ENDPOINT: "https://files.example.com", S3_BUCKET: "trail", S3_ACCESS_KEY_ID: "AKIAEXAMPLE1234", S3_SECRET_ACCESS_KEY: "s3-secret-value-9f8e7d6c",
  STREAM_GATEWAY_URL: "https://video.example.com", STREAM_SIGNING_SECRET: "x".repeat(40), STRIPE_SECRET_KEY: "sk_test_abc", STRIPE_WEBHOOK_SECRET: "whsec_abc", CRON_SECRET: "c".repeat(24),
};
const status = (env: Record<string, string | undefined>, id: string) => envChecks(env).find((c) => c.id === id)!.status;

describe("production readiness (configuration)", () => {
  it("passes a complete configuration with no blocking item", () => {
    expect(envChecks(good).filter((c) => c.status === "fail")).toEqual([]);
    expect(worst(envChecks(good))).toBe("ok");
  });
  it("blocks an empty configuration", () => {
    const fails = envChecks({}).filter((c) => c.status === "fail").map((c) => c.id);
    expect(fails).toEqual(expect.arrayContaining(["site_url", "database", "auth_secret", "smtp", "s3", "gateway", "stripe_key", "stripe_webhook", "cron", "leads_email"]));
  });
  it("rejects development shortcuts", () => {
    expect(status({ ...good, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }, "site_url")).toBe("fail");
    expect(status({ ...good, DATABASE_SINGLE_CONNECTION: "true" }, "single_connection")).toBe("fail");
    expect(status({ ...good, AUTH_RATE_LIMIT: "off" }, "auth_rate_limit")).toBe("fail");
    expect(status({ ...good, EMAIL_TRANSPORT: "console" }, "smtp")).toBe("fail");
    expect(status({ ...good, BETTER_AUTH_SECRET: "ci-only-secret-ci-only-secret-ci-only-secret" }, "auth_secret")).toBe("fail");
    expect(status({ ...good, S3_PUBLIC_ENDPOINT: "http://localhost:9000" }, "s3_public")).toBe("fail");
  });
  it("keeps live payments blocked until both flags are set, and says so", () => {
    expect(status({ ...good, STRIPE_SECRET_KEY: "sk_live_abc" }, "stripe_key")).toBe("fail");
    expect(status({ ...good, STRIPE_SECRET_KEY: "sk_live_abc", ALLOW_LIVE_PAYMENTS: "true", LEGAL_REVIEW_COMPLETED: "true" }, "stripe_key")).toBe("ok");
    expect(status({ ...good, ALLOW_LIVE_PAYMENTS: "true" }, "live_flags")).toBe("warn");
  });
  it("never reports a secret value in its details", () => {
    const text = JSON.stringify(envChecks(good));
    for (const secret of [good.BETTER_AUTH_SECRET, good.STREAM_SIGNING_SECRET, good.STRIPE_WEBHOOK_SECRET, good.CRON_SECRET, good.S3_SECRET_ACCESS_KEY, good.SMTP_URL]) expect(text).not.toContain(secret);
  });
  it("expects the newest migration file", () => {
    expect(readdirSync("db/migrations").filter((f) => f.endsWith(".sql")).sort().at(-1)).toBe(EXPECTED_MIGRATION);
  });
});
