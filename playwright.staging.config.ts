/**
 * The SAME workflows as the local suite, run against a deployed environment.
 *
 *     pnpm test:local:staging
 *
 * This is the point of separating the two: the buyer journeys — public pages,
 * shop discovery, cart, signup/sign-in/forgot-password, and the seller flows
 * that mock their own endpoints — are written once and verified on both a dev
 * server and a real deployment, with no duplicated spec bodies.
 *
 * What is NOT here:
 *   - storefront.spec.ts. It asserts the fixture data the stub serves, which
 *     exists nowhere on staging. That journey needs a real staging store and
 *     belongs in tests/qa/core.
 *   - the stub API. Nothing here binds a port, so this run cannot collide with a
 *     local backend and can run while the dev server is up.
 *
 * Overridable with QA_WEB_URL / QA_ADMIN_URL / QA_API_URL. Pointed at
 * production it refuses, same as `pnpm qa`, unless QA_ALLOW_PRODUCTION=1.
 */
import { smokewebConfig } from "./tests/qa/local.shared";

export default smokewebConfig("staging");
