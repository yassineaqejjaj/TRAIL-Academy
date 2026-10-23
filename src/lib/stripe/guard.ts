export type StripeMode = { ok: true; mode: "test" | "live" } | { ok: false; reason: "not_configured" | "live_blocked" | "invalid_key" };

/**
 * Live payments stay blocked unless the operator explicitly sets BOTH ALLOW_LIVE_PAYMENTS=true and
 * LEGAL_REVIEW_COMPLETED=true. This is a technical safeguard, not a legal determination.
 */
export function stripeMode(env: Record<string, string | undefined>): StripeMode {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, reason: "not_configured" };
  if (/^(sk|rk)_test_/.test(key)) return { ok: true, mode: "test" };
  if (/^(sk|rk)_live_/.test(key)) {
    return env.ALLOW_LIVE_PAYMENTS === "true" && env.LEGAL_REVIEW_COMPLETED === "true" ? { ok: true, mode: "live" } : { ok: false, reason: "live_blocked" };
  }
  return { ok: false, reason: "invalid_key" };
}
