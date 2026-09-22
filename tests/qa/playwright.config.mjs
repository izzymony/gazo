import { defineConfig, devices } from "@playwright/test";
import { resolveTargets } from "./env.cjs";

// Resolved at config load so a production target fails the run immediately,
// before a browser starts or a single test touches anything.
const targets = resolveTargets();
console.log(`[qa] target: ${targets.label}  web=${targets.web}  api=${targets.api}`);

export default defineConfig({
  testDir: ".",
  // These run against a DEPLOYED environment — there is no local server to start.
  // Smoke is read-only, so it parallelises freely. Core does NOT — see the
  // core project below, which pins workers to 1.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  // `html` as well as `list`: a CI job that uploads playwright-report/ needs
  // something to have written it. With list alone the artifact would be
  // promised and never produced.
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: targets.web,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Generous on purpose. Staging sits behind Cloudflare and a cold worker is
    // slow on first hit; pointed at a local dev server, the first request to a
    // route also pays for its compile, which 30s did not cover under parallel
    // load.
    navigationTimeout: 60_000,
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
      // ONE worker. Core mutates shared state on a single staging account — one
      // seller, one cart, one product title, one photo fixture. Run in parallel
      // it races itself: the edit test renames the product the cart test is
      // adding, and whichever loses reports a defect that is not there.
      fullyParallel: false,
      workers: 1,
    },
  ],
});
