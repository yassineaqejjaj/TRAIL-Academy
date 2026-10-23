import "server-only";
import type { PoolClient } from "pg";
import { appTypes, getPool } from "./pool";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

/** Parameterised query bound to one transaction. Never concatenate user input into `text`. */
export interface Q {
  <T extends Row = Row>(text: string, params?: unknown[]): Promise<T[]>;
  /** First row or null. */
  one: <T extends Row = Row>(text: string, params?: unknown[]) => Promise<T | null>;
}

function makeQ(client: PoolClient): Q {
  const run = (text: string, params?: unknown[]) => client.query({ text, values: params as unknown[], types: appTypes });
  const q = (async (text: string, params?: unknown[]) => (await run(text, params)).rows) as Q;
  q.one = async (text, params) => (await run(text, params)).rows[0] ?? null;
  return q;
}

type Role = "anon" | "authenticated" | "service_role";

async function run<T>(role: Role, uid: string | null, fn: (q: Q) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  let broken = false;
  try {
    await client.query("begin");
    // `set local` ends with the transaction, so a pooled connection never keeps another user's privileges.
    await client.query(`set local role ${role}`);
    if (uid) await client.query("select set_config('app.uid', $1, true)", [uid]);
    const result = await fn(makeQ(client));
    await client.query("commit");
    return result;
  } catch (e) {
    try { await client.query("rollback"); } catch { broken = true; }
    throw e;
  } finally {
    client.release(broken);
  }
}

/** Public, unauthenticated reads. Row Level Security applies. */
export const asAnon = <T>(fn: (q: Q) => Promise<T>) => run("anon", null, fn);

/** On behalf of a signed-in user: RLS sees auth.uid() = uid. Use for everything a user (or admin) does. */
export const asUser = <T>(uid: string, fn: (q: Q) => Promise<T>) => run("authenticated", uid, fn);

/** Trusted server code only (webhooks, jobs, notifications): bypasses RLS. Never reachable from a user-controlled path. */
export const asService = <T>(fn: (q: Q) => Promise<T>) => run("service_role", null, fn);
