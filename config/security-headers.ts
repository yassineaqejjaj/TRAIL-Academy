/**
 * HTTP security headers, including the Content-Security-Policy. Built from the environment so that the only third-party
 * origins allowed are the ones this deployment actually uses (object storage, video gateway, Stripe Checkout, Google sign-in).
 * Evaluated when the app is built, so the S3_* and STREAM_GATEWAY_URL variables must be present at build time.
 */
type Env = Record<string, string | undefined>;

function origin(value: string | undefined): string | null {
  if (!value) return null;
  try { return new URL(value).origin; } catch { return null; }
}

export function contentSecurityPolicy(env: Env, dev = false): string {
  const storage = [origin(env.S3_PUBLIC_ENDPOINT), origin(env.S3_ENDPOINT)].filter((o): o is string => Boolean(o));
  const gateway = origin(env.STREAM_GATEWAY_URL);
  const external = [...new Set([...storage, ...(gateway ? [gateway] : [])])];
  const https = (env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next.js injects inline bootstrap scripts; a nonce-based policy would force every page to render dynamically.
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...storage],
    "font-src": ["'self'", "data:"],
    "media-src": ["'self'", "blob:", ...external],
    "connect-src": ["'self'", ...external, ...(dev ? ["ws:", "wss:"] : [])],
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    // Form posts that redirect to a payment or identity provider are checked against this list as well.
    "form-action": ["'self'", "https://checkout.stripe.com", "https://accounts.google.com"],
  };
  const policy = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (https && !dev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function securityHeaders(env: Env, dev = false): { key: string; value: string }[] {
  const https = (env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(env, dev) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ...(https && !dev ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
  ];
}
