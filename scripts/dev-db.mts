/**
 * Local PostgreSQL without Docker: PGlite (real PostgreSQL compiled to WASM) persisted in .data/pglite and exposed over TCP,
 * so the app, Better Auth and the migration runner talk to it with the normal `pg` driver.
 *   npm run db:dev     → postgres://postgres:postgres@127.0.0.1:54329/postgres
 * For production-like development use `docker compose up` (PostgreSQL 17 + MinIO + Mailpit) instead.
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.DEV_DB_PORT ?? 54329);
const dataDir = process.env.DEV_DB_DIR ?? ".data/pglite";
mkdirSync(dirname(dataDir), { recursive: true });
const db = await PGlite.create({ dataDir, extensions: { pgcrypto } });
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 10 });
await server.start();
console.info(`dev database ready: postgres://postgres:postgres@127.0.0.1:${port}/postgres`);
const stop = async () => { await server.stop(); await db.close(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
