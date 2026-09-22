/**
 * One place that decides what the API URL is.
 *
 * There were two, and they disagreed. `config.ts` read `NEXT_PUBLIC_API_URL`
 * and appended `/api/v1` itself; `api-client.ts` read
 * `NEXT_PUBLIC_API_BASE_URL` and expected it to be versioned already. Both
 * names look interchangeable, the docs said to set them to the same value, and
 * the result was a login posting to
 *
 *   https://api-staging.vibaar.com/api/v1/api/v1/admin/auth/login
 *
 * which 404s. The mirror-image mistake — setting the versioned var to a bare
 * origin — silently drops the prefix instead, and every admin request 404s.
 *
 * Neither variable's spelling tells you which contract it carries, so these
 * functions accept EITHER form and normalise. That is what makes the doubled
 * prefix impossible rather than merely documented: getting the env var wrong
 * is now survivable, so the class of bug cannot come back through a dashboard
 * text field.
 */

/** The API version this client speaks. */
export const API_VERSION = 'v1'

const VERSION_SUFFIX = /\/api\/v\d+\/*$/i

/**
 * The bare origin, with any `/api/vN` suffix and trailing slashes removed.
 *
 * Accepts `https://api.example.com`, `https://api.example.com/`,
 * `https://api.example.com/api/v1` and `https://api.example.com/api/v1/`.
 */
export function apiOrigin(raw: string | undefined, fallback = 'http://localhost:8088'): string {
  const value = (raw ?? '').trim()
  if (!value) return fallback

  // Strip REPEATEDLY, not once. A single strip leaves the already-doubled
  // `https://host/api/v1/api/v1` as `https://host/api/v1`, and appending the
  // version then reproduces the exact bug this exists to prevent — which is a
  // realistic input, because it is what an operator ends up with after pasting
  // the broken URL they saw in the network tab.
  let out = value.replace(/\/+$/, '')
  while (VERSION_SUFFIX.test(out)) {
    out = out.replace(VERSION_SUFFIX, '').replace(/\/+$/, '')
  }
  return out
}

/**
 * The versioned base every request is built on — origin + `/api/vN`, exactly
 * once, whichever form the environment supplied.
 */
export function apiBase(raw: string | undefined, fallback = 'http://localhost:8088'): string {
  return `${apiOrigin(raw, fallback)}/api/${API_VERSION}`
}
