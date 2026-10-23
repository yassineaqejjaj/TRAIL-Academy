import "server-only";
import { Pool, types } from "pg";

export class DatabaseNotConfiguredError extends Error {
  constructor() { super("DATABASE_URL is not set"); this.name = "DatabaseNotConfiguredError"; }
}

export const dbConfigured = (): boolean => Boolean(process.env.DATABASE_URL);

function ssl(): Pool["options"]["ssl"] {
  // Railway's public PostgreSQL proxy uses a self-signed certificate. Prefer the private network URL when possible.
  const mode = process.env.DATABASE_SSL;
  if (mode === "verify") return true;
  if (mode === "require") return { rejectUnauthorized: false };
  return undefined;
}

/**
 * Parsers applied to the application's own queries only (see context.ts): timestamps/dates as ISO strings (stable,
 * serialisable) and counts as numbers. Better Auth keeps the driver defaults because it expects Date objects.
 */
const appParsers: Record<number, (v: string) => unknown> = {
  1184: (v) => new Date(v).toISOString(), // timestamptz
  1114: (v) => new Date(`${v}Z`).toISOString(), // timestamp (UTC by convention)
  1082: (v) => v, // date stays "YYYY-MM-DD"
  20: (v) => Number.parseInt(v, 10), // bigint, e.g. count(*)
};
export const appTypes = { getTypeParser: ((oid: number, format?: string) => appParsers[oid] ?? types.getTypeParser(oid, format as "text")) as typeof types.getTypeParser };

const g = globalThis as { __trailPools?: Record<string, Pool> };

/**
 * `DATABASE_SINGLE_CONNECTION=true` is for the embedded development database (PGlite), which has ONE backend: two
 * connections would interleave statements inside each other's transactions. Everything then shares a single pooled
 * connection, which serialises access. Never set it against a real PostgreSQL server.
 */
const singleConnection = () => process.env.DATABASE_SINGLE_CONNECTION === "true";

/** One pool per purpose, reused across hot reloads and warm serverless invocations. */
export function getPool(kind: "app" | "auth" = "app"): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseNotConfiguredError();
  const key = singleConnection() ? "shared" : kind;
  g.__trailPools ??= {};
  if (!g.__trailPools[key]) {
    const pool = new Pool({
      connectionString: url,
      // Serverless functions each hold their own pool: keep it small (put PgBouncer in front for scale).
      max: singleConnection() ? 1 : Number(kind === "auth" ? process.env.DATABASE_AUTH_POOL_MAX ?? 2 : process.env.DATABASE_POOL_MAX ?? 4),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ssl: ssl(),
    });
    // Better Auth addresses its tables unqualified; they live in schema "auth". Application tables are in "public".
    if (key === "auth" || key === "shared") pool.on("connect", (c) => { void c.query("set search_path to auth, public"); });
    pool.on("error", () => { /* idle client errors must not crash the process */ });
    g.__trailPools[key] = pool;
  }
  return g.__trailPools[key];
}
