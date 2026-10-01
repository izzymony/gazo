import { defineConfig, devices } from "@playwright/test";

// The staging/production target resolution and its refusal-to-hit-production
// guard live in tests/qa/env.cjs, which documents itself as the single source of
// truth for that check. Imported rather than reimplemented so this suite cannot
// drift from `pnpm qa` and start writing to production.
//
// Required rather than `import`ed because that file is CommonJS with no
// declarations. The type is asserted here instead of shipping a .d.ts for four
// functions, so the contract is visible where it is used.
const { resolveTargets } = require("../tests/qa/env.cjs") as {
  resolveTargets: (env?: Record<string, string | undefined>) => {
    web: string;
    admin: string;
    api: string;
    isProduction: boolean;
    label: string;
  };
};

/**
 * One config body, two entry points: `playwright.config.ts` (local) and
 * `playwright.staging.config.ts` (staging).
 *
 * The target is a PARAMETER rather than an env var on purpose. An env var would
 * need `cross-env` or a second config, because pnpm runs scripts through
 * cmd.exe on Windows where `VAR=value cmd` is not valid syntax — so the script
 * would work on a colleague's Mac and fail on yours. Two config files need no
 * shell trickery and no new dependency.
 *
 * The local suite is deliberately SEPARATE from tests/qa/playwright.config.mjs,
 * which owns the deployed release gate. The two have opposite requirements:
 *
 *   local    — `next dev` pays a cold compile on first visit (measured 23s for
 *              the homepage), so timeouts are generous; data comes from a stub
 *              that OWNS port 8088, so the real backend must be stopped.
 *   staging  — deployed, so the stub is never started and nothing binds a port.
 *
 * `testDir` is scoped to test-local on purpose. It used to be "." with a glob
 * matching every spec file, which ALSO collected tests/qa — so a bare
 * `playwright test` would start the local stub and then run the staging specs
 * against localhost with fixture data, failing on missing credentials rather
 * than saying anything was misconfigured.
 */
export type SmokewebTarget = "local" | "staging";

export function smokewebConfig(target: SmokewebTarget) {
  const isStaging = target === "staging";

  // Throws against production unless QA_ALLOW_PRODUCTION=1, same as `pnpm qa`.
  const staging = isStaging ? resolveTargets() : null;

  const webURL = isStaging
    ? (staging as { web: string }).web
    : process.env.QA_WEB_URL || "http://localhost:3000";

  console.log(
    `[smokeweb] target=${target} web=${webURL}` +
      (isStaging ? ` api=${(staging as { api: string }).api}` : " (stub API on :8088)")
  );

  return defineConfig({
    testDir: "test-local",
    testMatch: /.*\.spec\.ts$/,

    // Only meaningful against a deployed target: storefront.spec.ts asserts the
    // FIXTURE data the stub serves (a vendor and product that exist nowhere
    // else), so on staging it would fail on content that is correct for its
    // target. Those flows need a real staging store and belong in
    // tests/qa/core.
    testIgnore: isStaging ? "**/storefront.spec.ts" : [],

    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,

    // One worker. The stub serves every spec from one process on one port, and
    // the suite mutates persisted client state (cart, business store), so
    // parallel workers would interleave that state.
    workers: 1,

    reporter: [["list"], ["html", { open: "never" }]],
    timeout: 120_000,

    // Keeps this suite's traces/screenshots out of the staging release-gate
    // suite's output directory. The two still cannot run at once against
    // localhost, but a stale test-results/ from the other suite is a confusing
    // thing to triage.
    outputDir: "test-results/local",

    // Starts the stub backend the Next SERVER reads from. See
    // test-local/smokeweb/globalSetup.ts for why `page.route` cannot cover it.
    // Never set for staging: nothing there should bind a port.
    //
    // Resolved relative to THIS file, not the config entry point, which is why
    // the path is `smokeweb/...` and not `test-local/smokeweb/...`.
    globalSetup: isStaging
      ? undefined
      : require.resolve("./smokeweb/globalSetup.ts"),

    expect: { timeout: 15_000 },
    use: {
      baseURL: webURL,
      trace: "retain-on-failure",
      screenshot: "only-on-failure",
      // MUST stay well under `timeout`. EQUAL to it, the two race and a slow
      // first-visit compile surfaces as a bare "Test timeout exceeded" with only
      // a click log — hiding the navigation that stalled. They were both 60_000;
      // that exact collision is what made an early `addproduct` failure
      // undiagnosable.
      //
      // 60s is not slack, it is the measured cold-compile ceiling against
      // `next dev`: the homepage takes ~23s to compile on first visit, the
      // marketing and legal routes 9-12s each.
      navigationTimeout: 60_000,
    },
    projects: [
      {
        name: "chromium",
        use: { ...devices["Desktop Chrome"] },
      },
    ],
  });
}
