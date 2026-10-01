/**
 * LOCAL smoke suite — dev server on localhost:3000 plus the in-memory stub
 * backend on :8088.
 *
 *     pnpm test:local
 *
 * For staging, use playwright.staging.config.ts (`pnpm test:local:staging`).
 * Both share one config body — see test-local/playwright.shared.ts.
 */
import { smokewebConfig } from "./test-local/playwright.shared";

export default smokewebConfig("local");
