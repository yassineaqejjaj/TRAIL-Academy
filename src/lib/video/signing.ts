import { createSign } from "node:crypto";

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

/**
 * Signs a Mux playback JWT (RS256). `privateKeyB64` is the base64-encoded PEM Mux gives you.
 * Format follows Mux's signed-playback documentation; acceptance by Mux is UNVERIFIED without real keys.
 */
export function signMuxToken(opts: { playbackId: string; keyId: string; privateKeyB64: string; ttlSeconds: number; now?: number }): string {
  const exp = Math.floor((opts.now ?? Date.now()) / 1000) + opts.ttlSeconds;
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: opts.keyId }));
  const payload = b64url(JSON.stringify({ sub: opts.playbackId, aud: "v", exp, kid: opts.keyId }));
  const signature = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(Buffer.from(opts.privateKeyB64, "base64").toString("utf8"));
  return `${header}.${payload}.${b64url(signature)}`;
}
