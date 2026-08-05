import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// স্যান্ডবক্সে প্রি-ইনস্টল করা ক্রোমিয়াম থাকলে সেটিই ব্যবহার করা হয়
const LOCAL_CHROME = "/opt/ms-playwright/chromium-1194/chrome-linux/chrome";
const executablePath =
  process.env["E2E_CHROME_PATH"] ?? (existsSync(LOCAL_CHROME) ? LOCAL_CHROME : undefined);

/** ঔষধওয়ালা — মূল ইউজার ফ্লোর অটোমেটেড E2E টেস্ট */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env["CI"] ? 1 : 0,
  workers: 2,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/test-results.json" }]
  ],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:8080",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
});
