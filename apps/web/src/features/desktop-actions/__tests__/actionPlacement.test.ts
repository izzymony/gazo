import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { ACTION_PLACEMENT, SURFACE_OWNERS } from "../actionPlacement";

const SRC = join(__dirname, "../../..");
const APP = join(SRC, "app");

/**
 * Every route in the app, as a template. Separate from `test-support/routeWalker`
 * because that one is scoped to a single route group and this needs all of them,
 * and because `(dev)` — the gitignored playground — must not be counted: nothing
 * tracked may depend on it.
 */
const routeTemplates = (): string[] => {
  const found: string[] = [];
  const walk = (dir: string, segs: string[]) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith("_") || e.name === "__tests__" || e.name === "(dev)") continue;
        // A parallel slot and an intercepting route name no URL segment: they are
        // alternative renderings of a route declared elsewhere. Note `(.)x` opens
        // with `(` but does not close with `)`, so the route-group test below
        // does not catch it.
        if (e.name.startsWith("@")) continue;
        if (/^\(\.{1,3}\)/.test(e.name)) continue;
        if (e.name.startsWith("(") && e.name.endsWith(")")) {
          walk(p, segs);
          continue;
        }
        walk(p, [...segs, e.name.startsWith("[") ? `:${e.name.slice(1, -1)}` : e.name]);
        continue;
      }
      if (e.name === "page.tsx") found.push("/" + segs.join("/"));
    }
  };
  walk(APP, []);
  return found.sort();
};

const tsxFiles = (dir: string, acc: string[] = []): string[] => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      // `_`-prefixed dirs are private to the router and never build — `_draft`
      // holds parked work whose markup is not shipped. `(dev)` is the gitignored
      // playground; nothing tracked may depend on it.
      if (e.name.startsWith("_") || e.name === "node_modules" || e.name === "(dev)") continue;
      tsxFiles(p, acc);
    } else if (e.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
};

describe("desktop action placement", () => {
  const templates = ACTION_PLACEMENT.map(([t]) => t);

  it("classifies every route, and every classified route exists", () => {
    const onDisk = routeTemplates();
    expect(onDisk.length).toBeGreaterThan(0); // the walk itself must not silently find nothing
    expect([...templates].sort()).toEqual(onDisk);
  });

  it("classifies each route exactly once", () => {
    expect(new Set(templates).size).toBe(templates.length);
  });

  /**
   * The count is asserted because the arithmetic was wrong twice while this
   * matrix was being written — routes, action surfaces and ownership were being
   * added together as though they were the same quantity. A total that has to
   * match the walker keeps the three separate.
   */
  it("covers 70 routes", () => {
    expect(templates).toHaveLength(70);
  });

  it("owns every route it classifies as ours, and leaves auth's alone", () => {
    const auth = ACTION_PLACEMENT.filter(([, e]) => e.owner === "auth").map(([t]) => t);
    expect(auth.sort()).toEqual(["/forgot-password", "/signin", "/signup", "/welcome"]);
  });
});

describe("action surfaces", () => {
  const byFile = new Map(SURFACE_OWNERS.map((s) => [s.file, s]));

  it("points every entry at a file that exists", () => {
    for (const s of SURFACE_OWNERS) expect(existsSync(join(SRC, s.file))).toBe(true);
  });

  it("points every entry at routes that are classified", () => {
    const templates = new Set(ACTION_PLACEMENT.map(([t]) => t));
    for (const s of SURFACE_OWNERS)
      for (const r of s.routes)
        expect({ file: s.file, route: r, classified: templates.has(r) }).toEqual({
          file: s.file,
          route: r,
          classified: true,
        });
  });

  /**
   * The marker must be a USED PROP, not the word appearing anywhere in the file.
   * A bare `includes` passed on a comment that said "no longer a `footerAction`"
   * — the registry claimed a marker the code had just stopped having, and the
   * test agreed. Prop markers are matched as `name={`.
   */
  it("finds each declared marker in the file that declares it", () => {
    for (const s of SURFACE_OWNERS) {
      const src = readFileSync(join(SRC, s.file), "utf8");
      for (const m of s.markers) {
        const present =
          m === "footerAction" || m === "pageHeader"
            ? src.includes(`${m}={`)
            : m === "ownBar"
            ? /\bfixed\b[\s\S]{0,400}?\bbottom-0\b/.test(src) && /\blg:static\b/.test(src)
            : m === "AddressFlowFrame"
            ? src.includes("<AddressFlowFrame")
            : src.includes(m);
        expect({ file: s.file, marker: m, present }).toEqual({ file: s.file, marker: m, present: true });
      }
    }
  });

  /**
   * The direction that catches drift. A `footerAction` appearing on a route
   * classified `header`, or a brand-new screen growing a bottom bar, is exactly
   * the regression this work exists to undo — and it is invisible in review.
   * Here it fails the suite until someone classifies it on purpose.
   */
  it("knows about every action surface in the app", () => {
    const unregistered = tsxFiles(SRC)
      .filter((f) => /(?:footerAction|pageHeader)=\{/.test(readFileSync(f, "utf8")))
      .map((f) => f.slice(SRC.length + 1))
      .filter((rel) => !byFile.has(rel))
      .sort();
    expect(unregistered).toEqual([]);
  });

  it("does not let a header route keep a shell action bar", () => {
    const placement = new Map(ACTION_PLACEMENT.map(([t, e]) => [t, e.placement]));
    const offenders: string[] = [];
    for (const s of SURFACE_OWNERS) {
      if (!s.markers.includes("footerAction")) continue;
      // store-setup is the one legitimate both-at-once: its wizard steps are
      // `header` and its success screen keeps a bar. It declares `pageHeader`
      // too, which is how that is expressed rather than exempted.
      if (s.markers.includes("pageHeader")) continue;
      for (const r of s.routes) if (placement.get(r) === "header") offenders.push(`${s.file} -> ${r}`);
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * A page that OPENS a dialog must stay visible behind it.
 *
 * This is the one failure the placement registry could not see, and it shipped
 * twice. Both the cart and the order-review page replace themselves with a
 * full-screen `<Loader />` on a local flag, and both set that flag just before
 * navigating to what is now an intercepted route. That was correct while the
 * navigation REPLACED the page — the loader covered the gap and the page
 * unmounted. Under interception the page is never unmounted, so the flag turns
 * the thing behind the panel into a full-screen spinner, and nothing ever
 * clears it: closing the dialog returns to a spinner instead of the order.
 *
 * A dialog exists to keep its opener on screen. A trigger that blanks the
 * opener has undone the only thing the dialog was for.
 */
describe("a dialog's opener stays on screen", () => {
  /**
   * Where each modal slot lives, read from disk rather than listed — a trigger
   * is only intercepted when the page it sits on is INSIDE the slot's segment.
   * That distinction is the whole precision of this test: the product page also
   * pushes to an address route, and from there it is a real navigation, so its
   * page loader is correct and must not be flagged.
   */
  const slotSegments = (): string[] => {
    const found: string[] = [];
    const walk = (dir: string, route: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        if (e.name === "@modal") { found.push(route || "/"); continue; }
        if (e.name.startsWith("_") || e.name === "__tests__" || e.name === "(dev)") continue;
        if (/^\(\.{1,3}\)/.test(e.name) || e.name.startsWith("@")) continue;
        const next = e.name.startsWith("(") && e.name.endsWith(")") ? route : `${route}/${e.name}`;
        walk(join(dir, e.name), next);
      }
    };
    walk(APP, "");
    return found;
  };

  /** The URL a page file serves, or null if it is not an app-router page. */
  const routeOf = (file: string): string | null => {
    const rel = file.slice(SRC.length + 1);
    if (!rel.startsWith("app/") || !rel.endsWith("/page.tsx")) return null;
    return (
      "/" +
      rel
        .slice("app/".length, -"/page.tsx".length)
        .split("/")
        .filter((seg) => !(seg.startsWith("(") && seg.endsWith(")")))
        .join("/")
    );
  };

  it("never sets a page-level loading flag on the way into a dialog", () => {
    const segments = slotSegments();
    expect(segments.length).toBeGreaterThan(0); // the walk must not find nothing
    const dialogRoutes = ACTION_PLACEMENT.filter(([, e]) => e.placement === "dialog")
      .map(([t]) => t)
      .filter((t) => !t.includes(":"));

    const offenders: string[] = [];
    for (const f of tsxFiles(SRC)) {
      const src = readFileSync(f, "utf8");
      if (!/return\s*<Loader/.test(src)) continue; // only pages that can blank themselves
      const here = routeOf(f);
      if (!here) continue;
      const flat = src.replace(/\s+/g, " ");
      for (const route of dialogRoutes) {
        const seg = segments.find((sgm) => route.startsWith(sgm + "/"));
        if (!seg) continue;
        // intercepted only if THIS page sits inside the slot's own segment
        if (here !== seg && !here.startsWith(seg + "/")) continue;
        const re = new RegExp(
          'setLoading\\(true\\)[^}]{0,200}?router\\.(push|replace)\\("' + route + '"'
        );
        if (re.test(flat)) offenders.push(`${f.slice(SRC.length + 1)} -> ${route}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * The rule itself, enforced mechanically rather than trusted.
 *
 * HONEST ABOUT WHAT THIS CAN SEE. It is a text scan, so it proves a file does not
 * DECLARE a bottom-anchored action bar; it cannot prove one is not assembled at
 * runtime. It also has to cope with classes split across a `cn()` call — the
 * shell's own bar does not grep as one string, which is why a naive regex here
 * would report a reassuring zero — so it matches tokens within a window rather
 * than within one literal.
 *
 * DISCRIMINATING A BAR FROM A SCRIM was the whole difficulty. `bottom-0` appears
 * far more often on gradient fades and full-bleed overlays than on action bars:
 * the first version of this test flagged eight files and every one was a scrim —
 * the welcome screen's fade, two order-detail fades, a `bg-black/60` tile
 * overlay. The same eight the plan's own hand audit had already dismissed. What
 * separates a bar is chrome: an opaque surface with a top rule and a stacking
 * context. So a match also requires `border-t` or `z-sticky`, and is rejected
 * outright if it paints a gradient.
 */
describe("no page CTA at the viewport floor", () => {
  const ALLOWED: Record<string, string> = {
    "features/chat/ChatComposer.tsx": "The anchored-input exception. A message composer, not a CTA.",
    "features/buyer-shell/BuyerBottomNav.tsx": "Navigation, not a page action.",
    "features/seller-shell/BottomNav.tsx": "Navigation, not a page action.",
  };

  // The gap between the two tokens may contain quotes. That is the whole reason
  // this looks at a window instead of a literal: PageShell's bar puts `bottom-0`
  // in one `cn()` argument and `fixed` in another, four string literals later.
  // Forbidding quotes in between — the obvious way to keep the window inside one
  // class string — made the gate blind to the single most important bar in the
  // app, while still passing.
  const barRe =
    /\b(fixed|absolute)\b[\s\S]{0,400}?\bbottom-0\b|\bbottom-0\b[\s\S]{0,400}?\b(fixed|absolute)\b/;

  /**
   * Comments are not markup, and in this codebase they are longer than it.
   * PageShell's action bar carries ~1000 characters of explanation between the
   * `cn()` argument holding `bottom-0` and the one holding `fixed` — enough to
   * push them outside any sane window and make the gate quietly blind to the
   * most important bar in the app. Strip them first.
   */
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[\s{(,])\/\/[^\n]*/g, "$1");

  /** Every className expression in a file that declares a bottom-anchored bar. */
  const barSegments = (raw: string): string[] => {
    const out: string[] = [];
    const flat = stripComments(raw).replace(/\s+/g, " ");
    for (const m of flat.matchAll(/className=\{?[^}]{0,1200}/g)) {
      const seg = m[0];
      if (!barRe.test(seg)) continue;
      if (!/\b(w-full|left-0|right-0|inset-x-0|inset-0|left-shell-inset)\b/.test(seg)) continue;
      // chrome, not a scrim
      if (/gradient/.test(seg)) continue;
      if (!/\b(border-t|z-sticky)\b/.test(seg)) continue;
      out.push(seg);
    }
    return out;
  };

  /**
   * A bar is judged on whether it ESCAPES at lg, not on whether its file is on a
   * list. That is the actual rule, and it is what lets a screen own a mobile bar
   * — the cart summary is a fixed footer below lg and a bounded row above it —
   * without anyone having to be granted an exemption first.
   *
   * The allowlist is therefore only for bars that are not page CTAs at all and
   * so have no lg form to escape into: the chat composer and the two navs.
   */
  const ESCAPES = /\blg:(static|contents|hidden)\b/;

  it("gives every bottom-anchored action bar an lg escape", () => {
    const offenders: string[] = [];
    for (const f of tsxFiles(SRC)) {
      const rel = f.slice(SRC.length + 1);
      if (rel in ALLOWED) continue;
      for (const seg of barSegments(readFileSync(f, "utf8"))) {
        if (!ESCAPES.test(seg)) offenders.push(rel);
      }
    }
    expect([...new Set(offenders)].sort()).toEqual([]);
  });

  it("keeps no stale allowlist entries", () => {
    for (const rel of Object.keys(ALLOWED)) expect(existsSync(join(SRC, rel))).toBe(true);
  });

  /**
   * The two shared shells are where a bottom bar legitimately lives, and
   * exempting them would be the easy mistake — they are the ONLY places the rule
   * can be broken for every screen at once. Asserted positively instead: each
   * declares a bar AND declares the lg escape that dissolves it.
   */
  const UI = join(SRC, "../../../packages/ui/src");
  const shells: [string, RegExp][] = [
    ["PageShell.tsx", /lg:static/],
    ["PageHeaderBand.tsx", /lg:contents/],
  ];

  it.each(shells)("%s dissolves its bar at lg", (file, escape) => {
    const src = readFileSync(join(UI, file), "utf8");
    expect(barSegments(src).length).toBeGreaterThan(0);
    expect(src).toMatch(escape);
  });

  /**
   * `ResponsiveRouteDialog` is deliberately NOT in that list. It has no
   * bottom-anchored bar to dissolve — it is `fixed inset-0`, a full-bleed screen
   * below lg, which is the point: on a phone a route-backed dialog must look like
   * the page it replaces. Asserting it "dissolves a bar" would have been a test
   * passing for the wrong reason, so its own contract is asserted instead.
   */
  it("keeps the route dialog full-bleed below lg and bounded at lg", () => {
    const src = readFileSync(join(UI, "common/ResponsiveRouteDialog.tsx"), "utf8");
    expect(src).toMatch(/fixed inset-0/);
    expect(src).toMatch(/lg:max-w-dialog/);
    expect(src).not.toMatch(/\bbottom-0\b/);
  });
});
