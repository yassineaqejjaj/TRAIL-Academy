import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  webServer: { command: "npm run build && npm run start -- -p 3100", port: 3100, reuseExistingServer: !process.env.CI },
  use: { baseURL: "http://localhost:3100" },
});
