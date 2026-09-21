import { render, screen } from "@testing-library/react";
import AuthOverlayCard from "../AuthOverlayCard";
import AuthSceneChip from "../AuthSceneChip";
import AuthSceneOverlay from "../AuthSceneOverlay";
import { overlayPlacementStyle, sceneFocalStyle } from "../scenePlacement";
import type { AuthOverlay } from "../authScene";

const eventOverlay: AuthOverlay = {
  kind: "event",
  placement: { x: 0.2, y: 0.3, anchor: "top-left", priority: "primary", mobile: { x: 0.9, y: 0.25 } },
  icon: "order",
  title: "New order",
  value: "₦24,500",
  metadata: "2 items",
};

const statusOverlay: AuthOverlay = {
  kind: "status",
  placement: { x: 0.7, y: 0.8, anchor: "bottom-right", priority: "optional", mobile: { x: 0.35, y: 0.4 } },
  icon: "payment",
  title: "Payment received",
  description: "Order confirmed",
  tone: "success",
  badge: "check",
};

const chipOverlay: AuthOverlay = {
  kind: "chip",
  icon: "saved",
  placement: { x: 0.9, y: 0.6, anchor: "bottom-right", priority: "optional", mobile: { x: 0.35, y: 0.4 } },
  label: "Saved",
};

describe("AuthOverlayCard", () => {
  it("renders its copy as real text", () => {
    render(<AuthOverlayCard icon="order" title="New order" value="₦24,500" detail="2 items" />);
    expect(screen.getByText("New order")).toBeInTheDocument();
    expect(screen.getByText("₦24,500")).toBeInTheDocument();
    expect(screen.getByText("2 items")).toBeInTheDocument();
  });

  it("is inert — no button, no handler, no pointer events", () => {
    const { container } = render(<AuthOverlayCard icon="order" title="New order" />);
    expect(container.querySelector("button")).toBeNull();
    expect(container.firstElementChild).toHaveClass("pointer-events-none");
  });

  it("is neutral glass, with the tone confined to the icon tile", () => {
    // This is the correction that shaped the redesign: the previous cards
    // tinted their whole body, which on three already-colourful editorial
    // renders read as a scatter of coloured stickers. The body is now one
    // material; semantic colour is a 40px tile and a 20px badge.
    const { container } = render(
      <AuthOverlayCard icon="payment" title="Paid" tone="success" />
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card).toHaveClass("glass", "rounded-card");
    expect(card.className).not.toMatch(/bg-(success|brand|info)-/);
    // The tile, not the card, carries the tone — as a complete literal class,
    // because a composed `bg-${tone}-surface` is invisible to the JIT.
    expect(card.querySelector(".bg-success-surface")).not.toBeNull();
  });

  it("does not build on Surface, whose background would race the glass fill", () => {
    // `cn` is tailwind-merge and it does not know a plugin utility conflicts
    // with `bg-surface`, so both declarations would survive and Tailwind's
    // sort order would pick a winner silently.
    const { container } = render(<AuthOverlayCard icon="order" title="New order" />);
    expect(container.firstElementChild).not.toHaveClass("bg-surface");
  });

  it("omits the value and detail rows entirely when there is nothing for them", () => {
    render(<AuthOverlayCard icon="store" title="Store is live" />);
    expect(screen.getByText("Store is live")).toBeInTheDocument();
    expect(screen.queryByText("₦24,500")).not.toBeInTheDocument();
  });

  it("overhangs its badge without clipping it", () => {
    const { container } = render(
      <AuthOverlayCard icon="order" title="New order" badge="tag" />
    );
    const card = container.firstElementChild as HTMLElement;
    // `relative` for the badge to hang off, and never `overflow-hidden` — that
    // would cut the 8px overhang off.
    expect(card).toHaveClass("relative");
    expect(card).not.toHaveClass("overflow-hidden");
    expect(card.querySelector(".-left-2.-top-2")).not.toBeNull();
  });

  it("carries no badge when the data names none", () => {
    const { container } = render(<AuthOverlayCard icon="order" title="New order" />);
    expect(container.querySelector(".-left-2")).toBeNull();
  });
});

describe("AuthSceneChip", () => {
  it("is a glass pill with one phrase and a glyph", () => {
    // It shipped icon-less first, matching the retired "Checkout Safely" pill.
    // Beside two cards that each carry a glyph, the bare pill read as
    // unfinished rather than as the lightest object.
    const { container } = render(<AuthSceneChip icon="saved" label="Saved" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("glass", "rounded-pill");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("takes a glyph but never a badge", () => {
    // A corner mark on a 38px pill is larger than the pill's own text, which
    // would make the smallest object the loudest.
    const { container } = render(<AuthSceneChip icon="saved" label="Saved" />);
    expect(container.querySelector(".-left-2")).toBeNull();
  });

  it("is inert", () => {
    const { container } = render(<AuthSceneChip icon="saved" label="Saved" />);
    expect(container.querySelector("button")).toBeNull();
    expect(container.firstElementChild).toHaveClass("pointer-events-none");
  });
});

describe("AuthSceneOverlay", () => {
  it("hides the whole decorative layer from assistive tech", () => {
    const { container } = render(<AuthSceneOverlay overlay={eventOverlay} index={0} active />);
    // The caption carries the real meaning. Announcing invented order figures
    // would be both duplicated and untrue.
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("carries no focusable element", () => {
    const { container } = render(<AuthSceneOverlay overlay={eventOverlay} index={0} active />);
    expect(container.querySelectorAll("button, a, input, [tabindex]")).toHaveLength(0);
  });

  it("carries the band's coordinates as well as the pane's", () => {
    // The two are a different composition, not one scaled: 390x422 at aspect
    // 0.92 against 806x836, and the band has a wordmark across its top and a
    // seam gradient across its bottom that the pane does not. Scaling one set
    // produced overlapping cards, which is what led to hiding elements on
    // mobile instead of placing them.
    const { container } = render(<AuthSceneOverlay overlay={eventOverlay} index={0} active />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.getPropertyValue("--overlay-x")).toBe("0.2");
    expect(el.style.getPropertyValue("--overlay-x-mobile")).toBe("0.9");
    expect(el.style.getPropertyValue("--overlay-y-mobile")).toBe("0.25");
  });

  it("positions from custom properties, not from a class", () => {
    const { container } = render(<AuthSceneOverlay overlay={eventOverlay} index={2} active />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass("scene-overlay", "scene-anchor-top-left");
    expect(el.style.getPropertyValue("--overlay-x")).toBe("0.2");
    expect(el.style.getPropertyValue("--overlay-y")).toBe("0.3");
    // The stagger is a delay computed in CSS from this index — not a timer.
    expect(el.style.getPropertyValue("--overlay-index")).toBe("2");
  });

  it("marks only optional overlays as droppable on a constrained pane", () => {
    const optional = render(<AuthSceneOverlay overlay={statusOverlay} index={1} active />);
    expect(optional.container.firstElementChild).toHaveClass("scene-overlay-optional");

    const primary = render(<AuthSceneOverlay overlay={eventOverlay} index={0} active />);
    expect(primary.container.firstElementChild).not.toHaveClass("scene-overlay-optional");
  });

  it("exposes its priority for measurement", () => {
    const { container } = render(<AuthSceneOverlay overlay={statusOverlay} index={0} active />);
    // The browser pass asserts optional overlays are display:none at 768 and
    // visible at 1440; it needs a handle that is not a class.
    expect(container.firstElementChild).toHaveAttribute("data-overlay", "optional");
  });

  it("fades the element that carries the blur, never an ancestor of it", () => {
    // The load-bearing half of the entrance. An element whose ANCESTOR sits at
    // `opacity < 1` is a backdrop root, and `backdrop-filter` inside a backdrop
    // root samples nothing — so a glass card in a fading wrapper would have no
    // blur for the whole entrance and then snap to blurred at the end. The
    // wrapper takes the translate; the CARD takes the opacity.
    const idle = render(<AuthSceneOverlay overlay={eventOverlay} index={0} active={false} />);
    const wrapper = idle.container.firstElementChild as HTMLElement;
    const float = wrapper.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass("scene-offset");
    expect(wrapper).not.toHaveClass("opacity-0");
    // Three elements, each owning one property that the others must not touch:
    // wrapper = anchor `transform` + entrance `translate`, float = the
    // perpetual `translate` animation, card = `opacity` + `backdrop-filter`.
    expect(float).toHaveClass("scene-float");
    expect(float).not.toHaveClass("opacity-0");
    expect(float.firstElementChild).toHaveClass("glass", "opacity-0");

    // `scene-offset`, NOT `translate-y-2`: Tailwind's translate utilities
    // compile to `transform`, which would overwrite the anchor's
    // `transform: translate(-50%,-50%)` and drop the card at its raw
    // coordinate. These use the independent `translate` property.
    expect(wrapper).not.toHaveClass("translate-y-2");

    const live = render(<AuthSceneOverlay overlay={eventOverlay} index={0} active />);
    const liveWrapper = live.container.firstElementChild as HTMLElement;
    expect(liveWrapper).toHaveClass("scene-settled");
    expect(liveWrapper.firstElementChild!.firstElementChild).toHaveClass("opacity-100");
    // A CSS transition, so `motion-reduce` can switch it off — unlike the WAAPI
    // float, which no CSS rule could reach.
    expect(liveWrapper).toHaveClass("motion-reduce:transition-none");
  });

  it("gives the perpetual bob its own element", () => {
    // `AnimatedImages` did this with `el.animate()` and `iterations:
    // Infinity`, which is unreachable from CSS — so the app's blanket
    // `prefers-reduced-motion` rule could not stop it, and an orphaned
    // `setTimeout` could start one that nothing would ever cancel. A CSS
    // animation on its own element has neither problem, and cannot fight the
    // wrapper's entrance `translate` or the anchor's `transform`.
    const { container } = render(
      <AuthSceneOverlay overlay={eventOverlay} index={0} active />
    );
    const float = container.querySelector(".scene-float");
    expect(float).not.toBeNull();
    expect(float!.parentElement).toHaveClass("scene-overlay");
    expect(float!.firstElementChild).toHaveClass("glass");
  });

  it("dispatches on kind, including the chip", () => {
    render(<AuthSceneOverlay overlay={statusOverlay} index={0} active />);
    expect(screen.getByText("Payment received")).toBeInTheDocument();

    const chip = render(<AuthSceneOverlay overlay={chipOverlay} index={0} active />);
    expect(chip.getByText("Saved")).toBeInTheDocument();
    // A chip has a glyph but no icon TILE and no badge — a tile would mean the
    // dispatch fell through to the card arm.
    expect(chip.container.querySelector(".rounded-field")).toBeNull();
  });
});

describe("scenePlacement helpers", () => {
  it("emit only the enumerated custom properties", () => {
    // The narrowness is the point: these cannot write a colour, a length or a
    // font, which is what makes the indirection tighter than the drift rule it
    // steps around rather than a way past it.
    expect(
      Object.keys(
        overlayPlacementStyle({ x: 0.1, y: 0.2, mobileX: 0.9, mobileY: 0.3, index: 1 })
      )
    ).toEqual([
      "--overlay-x",
      "--overlay-y",
      "--overlay-x-mobile",
      "--overlay-y-mobile",
      "--overlay-index",
    ]);

    expect(Object.keys(sceneFocalStyle({
      x: 0.5, y: 0.5, compactX: 0.4, compactY: 0.3, desktopX: 0.6, desktopY: 0.45,
    }))).toEqual([
      "--scene-focal-x", "--scene-focal-y",
      "--scene-focal-x-compact", "--scene-focal-y-compact",
      "--scene-focal-x-desktop", "--scene-focal-y-desktop",
    ]);
  });
});
