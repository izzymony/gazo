import { defineConfig, devices } from "@playwright/test";
import { resolveTargets } from "./env.cjs";

// Resolved at config load so a production target fails the run immediately,
// before a browser starts or a single test touches anything.
const targets = resolveTargets();
console.log(`[qa] target: ${targets.label}  web=${targets.web}  api=${targets.api}`);

export default defineConfig({
  testDir: ".",
  // These run against a DEPLOYED environment — there is no local server to start.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"]],
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: targets.web,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Staging sits behind Cloudflare; a cold worker can be slow on first hit.
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "smoke",
      testMatch: /smoke\/.*\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // 85% of traffic is mobile, so the pages that matter get a phone viewport
      // too. Smoke only — the core journeys stay on one viewport to keep the
      // suite fast.
      name: "smoke-mobile",
      testMatch: /smoke\/web\.spec\.ts$/,
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "core",
      testMatch: /core\/.*\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
