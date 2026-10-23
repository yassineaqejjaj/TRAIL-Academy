import "server-only";
import { asService } from "@/lib/db";

/**
 * Fixed-window limiter shared by every instance (state in PostgreSQL, see db/migrations/0006_rate_limit.sql).
 * Resolves true when the call is allowed. If the database is unreachable it allows the call and logs: these limits
 * protect against abuse, and the endpoints they guard need the same database anyway.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const row = await asService((q) => q.one<{ ok: boolean }>("select hit_rate_limit($1, $2, $3) as ok", [key, limit, Math.max(1, Math.round(windowMs / 1000))]));
    return row?.ok ?? true;
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "rate_limit_unavailable", error: e instanceof Error ? e.message : String(e) }));
    return true;
  }
}
