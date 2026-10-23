import { SignJWT, jwtVerify } from "jose";

const enc = (secret: string) => new TextEncoder().encode(secret);

/** Short-lived playback token bound to one video asset. HS256, shared with the stream gateway. */
export async function signStreamToken(opts: { assetId: string; secret: string; ttlSeconds: number; now?: number }): Promise<string> {
  const iat = Math.floor((opts.now ?? Date.now()) / 1000);
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(opts.assetId).setIssuedAt(iat).setExpirationTime(iat + opts.ttlSeconds).sign(enc(opts.secret));
}

export async function verifyStreamToken(token: string, secret: string, now?: number): Promise<{ assetId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, enc(secret), { algorithms: ["HS256"], currentDate: now ? new Date(now) : undefined });
    return typeof payload.sub === "string" ? { assetId: payload.sub } : null;
  } catch {
    return null;
  }
}
