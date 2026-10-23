/**
 * Pre-deployment configuration check. Reads the environment (load a file with --env-file=...) and exits 1 when something blocks production.
 *   npm run check:env -- --env-file=.env.production
 * It checks configuration only; it does not contact any provider (the admin screen "Mise en production" does that on the running app).
 */
import { envChecks } from "../src/lib/readiness.ts";

const symbols = { ok: "✓", warn: "!", fail: "✕", info: "i" } as const;
const checks = envChecks(process.env);
let group = "";
for (const c of checks) {
  if (c.group !== group) { group = c.group; console.info(`\n${group}`); }
  console.info(`  ${symbols[c.status]} ${c.label} — ${c.detail}`);
}
const fails = checks.filter((c) => c.status === "fail").length;
const warns = checks.filter((c) => c.status === "warn").length;
console.info(`\n${fails} bloquant(s), ${warns} à vérifier.`);
process.exit(fails > 0 ? 1 : 0);
