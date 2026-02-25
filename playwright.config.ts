import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  baseURL: "http://localhost:5173",
  use: {
    browserName: "chromium",
    screenshot: "only-on-failure",
  },
  retries: 0,
  webServer: {
    command: "pnpm dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
