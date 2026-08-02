import { defineConfig, devices } from "@playwright/test";

/** ঔষধওয়ালা — মূল ইউজার ফ্লোর অটোমেটেড E2E টেস্ট */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env["CI"] ? 1 : 0,
  workers: 2,
  reporter: [["list"]],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:8080",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
