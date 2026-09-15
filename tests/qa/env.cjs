/**
 * Where the QA suite points, and the guard that stops it pointing at production
 * by accident.
 *
 * Every target comes from the environment with a staging default, so the same
 * suite serves both the post-staging-deploy check and the post-production-deploy
 * smoke in the release flow. Nothing here reads a secret from an argument —
 * arguments end up in shell history and CI logs.
 *
 * CommonJS on purpose: Playwright compiles the .ts specs to CJS, so an ESM
 * module here fails with "Unexpected token 'export'", while Node's ESM side
 * (the config and the seed script) imports named exports from CJS happily.
 * One source of truth for the production guard, usable from both runtimes.
 */

const STAGING = {
  web: "https://staging.vibaar.com",
  admin: "https://admin-staging.vibaar.com",
  api: "https://api-staging.vibaar.com/api/v1",
};

/**
 * Hosts that are the real thing. Matching one requires QA_ALLOW_PRODUCTION=1.
 *
 * Matched on the parsed hostname, never `includes()`: a substring test would
 * treat `https://vibaar.com.evil.example` as production, and — worse — would
 * miss nothing while giving a false sense that the check is exact.
 */
const PRODUCTION_HOSTS = new Set([
  "vibaar.com",
  "www.vibaar.com",
  "admin.vibaar.com",
  "api.vibaar.com",
]);

const hostOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`QA target is not a valid URL: ${url}`);
  }
};

function resolveTargets(env = process.env) {
  const targets = {
    web: (env.QA_WEB_URL || STAGING.web).replace(/\/$/, ""),
    admin: (env.QA_ADMIN_URL || STAGING.admin).replace(/\/$/, ""),
    api: (env.QA_API_URL || STAGING.api).replace(/\/$/, ""),
  };

  const production = Object.entries(targets).filter(([, url]) =>
    PRODUCTION_HOSTS.has(hostOf(url))
  );

  if (production.length && env.QA_ALLOW_PRODUCTION !== "1") {
    const named = production.map(([k, v]) => `${k}=${v}`).join(", ");
    throw new Error(
      `Refusing to run QA against production (${named}).\n` +
        `These tests create accounts, stores and products. If you really mean to ` +
        `run the read-only smoke against production, set QA_ALLOW_PRODUCTION=1 — ` +
        `and do NOT run the seed script or the core E2E specs there.`
    );
  }

  return {
    ...targets,
    isProduction: production.length > 0,
    label: production.length ? "PRODUCTION" : "staging/custom",
  };
}

/** Seller login for the core E2E specs. Absent → those specs skip, not fail. */
function resolveSellerCredentials(env = process.env) {
  const email = env.QA_SELLER_EMAIL;
  const password = env.QA_SELLER_PASSWORD;
  return email && password ? { email, password } : null;
}

module.exports = { resolveTargets, resolveSellerCredentials };
