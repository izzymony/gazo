/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * A narrower `next/image` than the shared setup's, which spreads every prop
 * onto the element: `fill`/`priority` are booleans that are not DOM attributes,
 * and React's warning about them would trip this package's console.error trap.
 * Stripping them here keeps the assertions about `src` and `alt`, which is what
 * these tests are actually about.
 */
jest.mock(
  "next/image",
  () => ({
    __esModule: true,
    default: ({ fill, priority, quality, placeholder, blurDataURL, unoptimized, ...rest }: any) => {
      const React = require("react");
      // eslint-disable-next-line jsx-a11y/alt-text
      return React.createElement("img", rest);
    },
  }),
  { virtual: true }
);

import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import AuthSceneCaption from "../AuthSceneCaption";
import AuthSceneMedia from "../AuthSceneMedia";
import type { AuthScene } from "../authScene";

const scene = (id: AuthScene["id"], headline: string): AuthScene => ({
  id,
  label: `0${id === "discover" ? 1 : id === "order" ? 2 : 3} · ${id}`,
  headline,
  description: `${headline} description`,
  image: {
    slot: `auth-${id}`,
    src: `/auth/auth-${id}.webp`,
    width: 1448,
    height: 1086,
    alt: `${id} artwork`,
    focal: {
      mobile: { x: 0.5, y: 0.55 },
      compact: { x: 0.5, y: 0.55 },
      desktop: { x: 0.5, y: 0.55 },
    },
  },
  overlays: [
    {
      kind: "event",
      icon: "order",
      title: `${id} event`,
      placement: { x: 0.9, y: 0.3, anchor: "top-right", priority: "primary" },
    },
  ],
});

const SCENES: readonly AuthScene[] = [
  scene("discover", "Discover Products."),
  scene("order", "Turn Interest Into an Order."),
  scene("deliver", "Complete Every Sale."),
];

/**
 * The gate that made this component necessary.
 *
 * One prerendered document serves every query string on `/signin`, `/signup`
 * and `/forgot-password`, and it is the step-zero landing — measured: the HTML
 * for `/signin?step=1` was byte-identical to the landing's, 16 `<img>` and 8
 * `rel="preload"`. So a phone opening a password step downloaded the whole
 * landing composition before any JavaScript ran.
 *
 * A DOM assertion after hydration cannot see that, which is the entire reason
 * this test renders on the server instead. `renderToStaticMarkup` takes the
 * `getServerSnapshot` path through `useIsHydrated`, exactly as the prerender
 * does.
 */
describe("AuthSceneMedia keeps the artwork out of the server HTML", () => {
  it("emits no markup at all when rendered on the server", () => {
    const html = renderToStaticMarkup(
      <AuthSceneMedia scenes={SCENES} index={0} outgoing={null} />
    );
    expect(html).toBe("");
  });

  it("emits no reference to any scene asset", () => {
    const html = renderToStaticMarkup(
      <AuthSceneMedia scenes={SCENES} index={1} outgoing={0} />
    );
    for (const item of SCENES) {
      expect(html).not.toContain(item.image.src);
    }
    expect(html).not.toContain("<img");
  });
});

/**
 * Point of this one: the predecessor mounted all three slides and hid two with
 * `opacity-0`, so every signed-out visit fetched three backgrounds to show one.
 * A `priority` prop or a DOM count would not have caught it — a hidden
 * `next/image` is still requested — so what is pinned here is how many image
 * elements exist, which is what decides how many requests happen.
 */
describe("AuthSceneMedia mounts at most two layers", () => {
  it("mounts only the active scene when nothing is leaving", () => {
    const { container } = render(
      <AuthSceneMedia scenes={SCENES} index={0} outgoing={null} />
    );
    const sources = Array.from(container.querySelectorAll("img"))
      .map((img) => img.getAttribute("src") ?? "")
      .filter((src) => src.includes("auth-"));
    expect(sources).toHaveLength(1);
    expect(sources[0]).toContain("auth-discover");
  });

  it("mounts the active and outgoing scenes during a crossfade, never the third", () => {
    const { container } = render(<AuthSceneMedia scenes={SCENES} index={1} outgoing={0} />);
    const sources = Array.from(container.querySelectorAll("img"))
      .map((img) => img.getAttribute("src") ?? "")
      .filter((src) => src.includes("auth-"));
    expect(sources).toHaveLength(2);
    expect(sources.some((src) => src.includes("auth-deliver"))).toBe(false);
  });

  it("leaves the artwork out of the accessibility tree", () => {
    // The pane is no longer `aria-hidden` as a whole — the caption inside it is
    // real copy — so each decorative part has to declare itself. An `alt` here
    // would announce the same thing the caption already says.
    const { container } = render(
      <AuthSceneMedia scenes={SCENES} index={0} outgoing={null} />
    );
    for (const img of Array.from(container.querySelectorAll("img"))) {
      expect(img.getAttribute("alt")).toBe("");
    }
  });
});

describe("AuthSceneCaption", () => {
  it("renders the active scene's copy as real text, not a live region", () => {
    const { container } = render(
      <AuthSceneCaption scenes={SCENES} index={1} variant="panel" onSelect={() => {}} />
    );
    expect(screen.getByText("Turn Interest Into an Order.")).toBeInTheDocument();
    // An automatically changing headline that announces itself would interrupt
    // a screen-reader user every few seconds while they fill in a form.
    expect(container.querySelector("[aria-live]")).toBeNull();
    expect(container.querySelector("[role='status']")).toBeNull();
    expect(container.querySelector("[role='alert']")).toBeNull();
  });

  it("does not make the rotating headline a heading", () => {
    // The page heading is the fixed proposition in the content column. A
    // heading that changes on a timer restructures the outline mid-read, and
    // the old `SlideContent` shipped it as a second `h1`.
    const { container } = render(
      <AuthSceneCaption scenes={SCENES} index={0} variant="column" onSelect={() => {}} />
    );
    expect(container.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
  });

  it("hides the scenes that are not showing, so the copy reads once", () => {
    render(<AuthSceneCaption scenes={SCENES} index={0} variant="column" onSelect={() => {}} />);
    // Present in the DOM for stable geometry, but only one is exposed.
    expect(screen.getByText("Discover Products.")).toBeVisible();
    const hidden = screen.getByText("Turn Interest Into an Order.").closest("[aria-hidden]");
    expect(hidden).toHaveAttribute("aria-hidden", "true");
  });

  it("offers a visible pause control while it rotates", () => {
    // Required because the rotation loops indefinitely. Pausing on hover, on
    // focus, or under `prefers-reduced-motion` is not a control a keyboard or
    // touch user can find and operate — and hover does not exist on a phone.
    render(
      <AuthSceneCaption
        scenes={SCENES}
        index={0}
        variant="panel"
        onSelect={() => {}}
        paused={false}
        onTogglePause={() => {}}
      />
    );
    const pause = screen.getByRole("button", { name: "Pause the scene rotation" });
    expect(pause).toBeVisible();
    expect(pause).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the paused state on the same control", () => {
    render(
      <AuthSceneCaption
        scenes={SCENES}
        index={0}
        variant="panel"
        onSelect={() => {}}
        paused
        onTogglePause={() => {}}
      />
    );
    const resume = screen.getByRole("button", { name: "Resume the scene rotation" });
    expect(resume).toHaveAttribute("aria-pressed", "true");
  });

  it("names each dot by its scene and marks the current one", () => {
    render(<AuthSceneCaption scenes={SCENES} index={2} variant="panel" onSelect={() => {}} />);
    const group = screen.getByRole("group", { name: "Choose a scene" });
    const dots = within(group).getAllByRole("button");
    expect(dots).toHaveLength(3);
    expect(dots[2]).toHaveAttribute("aria-current", "true");
    expect(dots[0]).toHaveAttribute("aria-label", "Discover Products.");
  });

  it("drops the dots and the pause control for a static scene", () => {
    // A progressive form step shows one scene. A counter over a set of one is a
    // lie, and there is nothing to pause.
    render(<AuthSceneCaption scenes={SCENES} index={0} variant="panel" />);
    expect(screen.queryByRole("group", { name: "Choose a scene" })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("omits the eyebrow label in the column, where the geometry is fixed", () => {
    // Mobile keeps today's arrangement exactly: headline, description, dots,
    // at the same offset below the artwork band. A label line above the
    // headline would push all of it down the column.
    render(<AuthSceneCaption scenes={SCENES} index={0} variant="column" onSelect={() => {}} />);
    expect(screen.queryByText("From attention to income")).toBeNull();
    expect(screen.getByText("Discover Products.")).toBeVisible();
  });
});
