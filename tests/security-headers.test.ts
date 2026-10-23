import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "../config/security-headers";

const env = { NEXT_PUBLIC_SITE_URL: "https://academy.example.com", S3_PUBLIC_ENDPOINT: "https://files.example.com/", S3_ENDPOINT: "http://10.0.0.5:9000", STREAM_GATEWAY_URL: "https://video.example.com/hls" };

describe("security headers", () => {
  const csp = contentSecurityPolicy(env);
  it("locks down framing, plugins and base URI", () => {
    for (const d of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "default-src 'self'"]) expect(csp).toContain(d);
  });
  it("allows only the configured storage and gateway origins for media and connections", () => {
    expect(csp).toMatch(/media-src 'self' blob: https:\/\/files\.example\.com http:\/\/10\.0\.0\.5:9000 https:\/\/video\.example\.com;/);
    expect(csp).toMatch(/connect-src 'self' https:\/\/files\.example\.com .*https:\/\/video\.example\.com;/);
    expect(csp).not.toContain("*");
  });
  it("permits Stripe Checkout and Google sign-in as form targets only", () => {
    expect(csp).toContain("form-action 'self' https://checkout.stripe.com https://accounts.google.com");
    expect(csp).not.toMatch(/script-src[^;]*stripe/);
  });
  it("adds HSTS and upgrade-insecure-requests only over https in production", () => {
    expect(securityHeaders(env).some((h) => h.key === "Strict-Transport-Security")).toBe(true);
    expect(csp).toContain("upgrade-insecure-requests");
    expect(securityHeaders({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }).some((h) => h.key === "Strict-Transport-Security")).toBe(false);
    expect(securityHeaders(env, true).some((h) => h.key === "Strict-Transport-Security")).toBe(false);
  });
  it("allows eval and websockets only in development", () => {
    expect(csp).not.toContain("'unsafe-eval'");
    expect(contentSecurityPolicy(env, true)).toContain("'unsafe-eval'");
  });
  it("ignores malformed origins", () => {
    expect(contentSecurityPolicy({ S3_ENDPOINT: "not a url" })).toContain("img-src 'self' data: blob:;");
  });
});
