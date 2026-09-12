import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every route under an App Router directory, as a policy template.
 *
 * TEST INFRASTRUCTURE. It reads the filesystem, so it has no business in a
 * module that ships to the browser — the runtime matcher lives in
 * `lib/routePolicy.ts` and knows nothing about disk.
 *
 * Route groups are RECURSED INTO but contribute no URL segment, which is the
 * whole point and was a live bug in the seller coverage test: it skipped
 * `(`-prefixed directories outright, so a group added under `dashboard/` would
 * have hidden every page inside it from the very test written to catch an
 * unclassified route. Private folders (`_`-prefixed) are genuinely not routes.
 *
 * `page.draft.tsx` is deliberately ignored: it is a page extension only in
 * development, so it never reaches the production route manifest.
 */
export function routeTemplatesIn(root: string, basePath: string): string[] {
  const found: string[] = [];

  const walk = (dir: string, segments: string[]) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith("_") || entry.name === "__tests__") continue;
        // A route group organises files without naming a URL segment.
        if (entry.name.startsWith("(") && entry.name.endsWith(")")) {
          walk(path, segments);
          continue;
        }
        walk(path, [
          ...segments,
          entry.name.startsWith("[") ? `:${entry.name.slice(1, -1)}` : entry.name,
        ]);
        continue;
      }

      if (entry.name === "page.tsx") {
        found.push(basePath + segments.map((s) => `/${s}`).join(""));
      }
    }
  };

  walk(root, []);
  return found.sort();
}
