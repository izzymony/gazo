import { render, screen } from "@testing-library/react";
import AuthEventCard from "../AuthEventCard";
import AuthStatusCard from "../AuthStatusCard";
import AuthSceneOverlay from "../AuthSceneOverlay";
import { overlayPlacementStyle, sceneFocalStyle } from "../scenePlacement";
import type { AuthOverlay } from "../authScene";

const eventOverlay: AuthOverlay = {
  kind: "event",
  placement: { x: 0.2, y: 0.3, anchor: "top-left", priority: "primary" },
  icon: "order",
  title: "New order",
  value: "₦24,500",
  metadata: "2 items",
};

const statusOverlay: AuthOverlay = {
  kind: "status",
  placement: { x: 0.7, y: 0.8, anchor: "bottom-right", priority: "optional" },
  icon: "payment",
  title: "Payment secured",
  description: "Held until delivery",
  tone: "success",
};

describe("AuthEventCard", () => {
  it("renders its copy as real text", () => {
    render(<AuthEventCard icon="order" title="New order" value="₦24,500" metadata="2 items" />);
    expect(screen.getByText("New order")).toBeInTheDocument();
    expect(screen.getByText("₦24,500")).toBeInTheDocument();
    expect(screen.getByText("2 items")).toBeInTheDocument();
  });

  it("is inert — no button, no handler, no pointer events", () => {
    const { container } = render(<AuthEventCard icon="order" title="New order" />);
    // Surface turns into a real <button> when given onClick. There is no such
    // prop, so a decorative card can never become a control by accident.
    expect(container.querySelector("button")).toBeNull();
    expect(container.firstElementChild).toHaveClass("pointer-events-none");
  });

  it("takes its tone chrome from complete token classes", () => {
    const { container } = render(<AuthEventCard icon="payment" title="Paid" tone="success" />);
    // Literal strings, not `border-${tone}-border`: a composed class is
    // invisible to the JIT and the card would render untinted.
    expect(container.firstElementChild).toHaveClass("border-success-border");
  });

  it("uses Surface's radius and border rather than re-deriving them", () => {
    const { container } = render(<AuthEventCard icon="order" title="New order" />);
    expect(container.firstElementChild).toHaveClass("rounded-card", "border", "bg-surface");
  });

  it("omits the value row entirely when there is no number", () => {
    render(<AuthEventCard icon="store" title="Store is live" />);
    expect(screen.getByText("Store is live")).toBeInTheDocument();
    expect(screen.queryByText("₦24,500")).not.toBeInTheDocument();
  });
});

describe("AuthStatusCard", () => {
  it("renders title and description", () => {
    render(<AuthStatusCard icon="payment" title="Payment secured" description="Held" tone="success" />);
    expect(screen.getByText("Payment secured")).toBeInTheDocument();
    expect(screen.getByText("Held")).toBeInTheDocument();
  });

  it("is tinted, which is what separates it from an event card", () => {
    const { container } = render(<AuthStatusCard icon="store" title="Live" tone="brand" />);
    // brand has no tone-role surface, so it uses Badge's sanctioned recipe.
    expect(container.firstElementChild).toHaveClass("bg-brand-50", "border-brand-200");
  });

  it("is inert", () => {
    const { container } = render(<AuthStatusCard icon="store" title="Live" tone="brand" />);
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

  it("enters when its scene becomes active, and respects reduced motion", () => {
    const idle = render(<AuthSceneOverlay overlay={eventOverlay} index={0} active={false} />);
    // `scene-offset`, NOT `translate-y-2`: Tailwind's translate utilities
    // compile to `transform`, which would overwrite the anchor's
    // `transform: translate(-50%,-50%)` and drop the card at its raw
    // coordinate. These use the independent `translate` property, which
    // composes with `transform` instead of replacing it.
    expect(idle.container.firstElementChild).toHaveClass("opacity-0", "scene-offset");
    expect(idle.container.firstElementChild).not.toHaveClass("translate-y-2");

    const live = render(<AuthSceneOverlay overlay={eventOverlay} index={0} active />);
    expect(live.container.firstElementChild).toHaveClass("opacity-100", "scene-settled");
    // A CSS transition, so `motion-reduce` can switch it off — unlike the WAAPI
    // float, which no CSS rule could reach.
    expect(live.container.firstElementChild).toHaveClass("motion-reduce:transition-none");
  });

  it("dispatches on kind", () => {
    render(<AuthSceneOverlay overlay={statusOverlay} index={0} active />);
    expect(screen.getByText("Payment secured")).toBeInTheDocument();
  });
});

describe("scenePlacement helpers", () => {
  it("emit only the enumerated custom properties", () => {
    // The narrowness is the point: these cannot write a colour, a length or a
    // font, which is what makes the indirection tighter than the drift rule it
    // steps around rather than a way past it.
    expect(Object.keys(overlayPlacementStyle({ x: 0.1, y: 0.2, index: 1 })))
      .toEqual(["--overlay-x", "--overlay-y", "--overlay-index"]);

    expect(Object.keys(sceneFocalStyle({
      x: 0.5, y: 0.5, compactX: 0.4, compactY: 0.3, desktopX: 0.6, desktopY: 0.45,
    }))).toEqual([
      "--scene-focal-x", "--scene-focal-y",
      "--scene-focal-x-compact", "--scene-focal-y-compact",
      "--scene-focal-x-desktop", "--scene-focal-y-desktop",
    ]);
  });
});
