// In-memory fixed-window limiter. Adequate for a single instance; replace with a shared store
// (e.g. Upstash/Redis) before running multiple instances. See SECURITY.md.
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const entry = hits.get(key);
  if (!entry || entry.reset <= now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
