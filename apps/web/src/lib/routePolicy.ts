/**
 * Route → policy resolution, shared by the seller and buyer shells.
 *
 * Both sides answer the same shape of question — "what chrome does this route
 * carry?" — against a table of route templates. The algorithm is the part worth
 * sharing, because getting it wrong is silent: the wrong answer renders a
 * plausible page with the wrong navigation on it.
 *
 * STATIC BEFORE DYNAMIC, and that is load-bearing rather than an optimisation.
 * A template's segment count does not identify it. `/dashboard/catalog/product/create`
 * and `/dashboard/catalog/product/:productId` are both five segments, as are
 * `/shop` and the buyer's root-level `/:handle` — which shares a length with
 * every single-segment literal in the buyer group. A wildcard-first scan reads
 * the create flow as a product, and seven buyer routes as storefronts. Resolving
 * literals from a Map first makes that impossible by construction: there is no
 * comparator to get wrong and no tie to break.
 */

/** A template segment beginning with ":" matches any single non-empty segment. */
const isParam = (segment: string) => segment.startsWith(":");

/** Tolerate a trailing slash; Next does not emit one, but a hand-typed URL can. */
function normalise(pathName: string): string {
  return pathName.length > 1 && pathName.endsWith("/") ? pathName.slice(0, -1) : pathName;
}

export interface RoutePolicy<Mode> {
  /** The mode for this path, or undefined when no template claims it. */
  resolve(pathName: string | null | undefined): Mode | undefined;
  /**
   * Whether a template claims this path at all.
   *
   * Distinct from `resolve` returning a falsy mode: a policy may deliberately
   * classify a route as "no chrome", and a coverage test has to tell that apart
   * from a route nobody has classified. `resolve` alone cannot.
   */
  has(pathName: string | null | undefined): boolean;
  /** Every template in the table, for coverage tests to compare against disk. */
  readonly templates: readonly string[];
}

export function createRoutePolicy<Mode>(
  entries: ReadonlyArray<readonly [template: string, mode: Mode]>
): RoutePolicy<Mode> {
  const statics = new Map<string, Mode>(
    entries.filter(([template]) => !template.includes(":"))
  );
  const dynamics = entries
    .filter(([template]) => template.includes(":"))
    .map(([template, mode]) => [template.split("/"), mode] as const);

  const matchDynamic = (path: string): Mode | undefined => {
    const actual = path.split("/");
    for (const [expected, mode] of dynamics) {
      if (expected.length !== actual.length) continue;
      const hit = expected.every((segment, index) =>
        isParam(segment) ? actual[index].length > 0 : segment === actual[index]
      );
      if (hit) return mode;
    }
    return undefined;
  };

  const lookup = (pathName: string | null | undefined): Mode | undefined => {
    if (!pathName) return undefined;
    const path = normalise(pathName);
    const exact = statics.get(path);
    // `has` cannot use `?? matchDynamic(...)` alone — a mode may legitimately be
    // undefined-ish — so membership is checked explicitly.
    return exact !== undefined || statics.has(path) ? exact : matchDynamic(path);
  };

  return {
    resolve: lookup,
    has: (pathName) => {
      if (!pathName) return false;
      const path = normalise(pathName);
      return statics.has(path) || matchDynamic(path) !== undefined;
    },
    templates: entries.map(([template]) => template),
  };
}
