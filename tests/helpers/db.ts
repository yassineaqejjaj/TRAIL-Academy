import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync, readFileSync } from "node:fs";

export const MIGRATIONS_DIR = "db/migrations";

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
}

/** In-process PostgreSQL with the real migrations (and optionally the seed) applied. */
export async function createTestDb(opts: { seed?: boolean; upTo?: string } = {}): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto } });
  for (const f of migrationFiles()) {
    if (opts.upTo && f > opts.upTo) break;
    await db.exec(readFileSync(`${MIGRATIONS_DIR}/${f}`, "utf8"));
  }
  if (opts.seed !== false) await db.exec(readFileSync("db/seed.sql", "utf8"));
  return db;
}

export async function addUsers(db: PGlite, users: [id: string, email: string, name?: string][]): Promise<void> {
  for (const [id, email, name] of users) {
    await db.query(`insert into auth.users (id, email, name, email_verified) values ($1, $2, $3, true)`, [id, email, name ?? email.split("@")[0]]);
  }
}

/** Serves a PGlite database over TCP so the real `pg` driver (and Better Auth) can talk to it. */
export async function serveOverTcp(db: PGlite, port: number) {
  const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");
  const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 8 });
  await server.start();
  return { url: `postgres://postgres:postgres@127.0.0.1:${port}/postgres`, stop: () => server.stop() };
}
