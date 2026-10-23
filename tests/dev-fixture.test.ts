// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createTestDb } from "./helpers/db";

it("dev fixture applies cleanly on top of migrations and seed, and stays out of the seed", { timeout: 30_000 }, async () => {
  const db = await createTestDb();
  expect((await db.query<{ n: number }>("select count(*)::int n from lessons")).rows[0].n).toBe(0); // seed has no lessons
  await db.exec(readFileSync("db/dev-fixture.sql", "utf8"));
  expect((await db.query<{ n: number }>("select count(*)::int n from lessons")).rows[0].n).toBe(5);
  expect((await db.query<{ n: number }>("select count(*)::int n from lessons where body_md not like '[CONTENU DE TEST]%'")).rows[0].n).toBe(0);
});
