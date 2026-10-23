import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests run against a RUNNING stack (see TESTING.md): PostgreSQL migrated with db/seed.sql and db/dev-fixture.sql,
 * and the app started with EMAIL_TRANSPORT=console. Locally, `E2E_CHANNEL=chrome` reuses the installed Google Chrome
 * (no browser download); CI installs Chromium with `npx playwright install --with-deps chromium`.
 */
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3105",
    channel: process.env.E2E_CHANNEL || undefined,
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
