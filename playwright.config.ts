import { defineConfig } from "@playwright/test";

// PW_PORT lets parallel worktrees run e2e against their own server instead of fighting over :3000.
const port = Number(process.env.PW_PORT ?? 3000);

export default defineConfig({
  testDir: "tests/e2e",
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    trace: "retain-on-failure",
    // Locally, PW_CHROME can point at an installed Chrome instead of downloading Playwright's.
    launchOptions: process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : undefined,
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      CONTENT_SOURCE: "local",
    },
  },
});
