import { render, screen, act } from "@testing-library/react";
import { useState } from "react";
import useScroll from "../useScroll";

/**
 * A screen shaped like the real ones: it renders a skeleton first and only
 * mounts its scroll container once "data" arrives. That ordering is what the
 * previous hook could not survive.
 */
function Screen({ readyAtStart = true }: { readyAtStart?: boolean }) {
  const [ready, setReady] = useState(readyAtStart);
  const { isScrolled, scrollRef } = useScroll(20);

  if (!ready) {
    return (
      <button type="button" onClick={() => setReady(true)}>
        load
      </button>
    );
  }

  return (
    <div ref={scrollRef} data-testid="scroller">
      <span data-testid="state">{isScrolled ? "compact" : "hero"}</span>
    </div>
  );
}

/** jsdom gives every element scrollTop 0 and never fires scroll on its own. */
function scrollTo(element: HTMLElement, top: number) {
  Object.defineProperty(element, "scrollTop", { value: top, configurable: true });
  act(() => {
    element.dispatchEvent(new Event("scroll"));
  });
}

describe("useScroll", () => {
  it("starts un-scrolled", () => {
    render(<Screen />);
    expect(screen.getByTestId("state")).toHaveTextContent("hero");
  });

  it("reports a crossing of the threshold", () => {
    render(<Screen />);
    scrollTo(screen.getByTestId("scroller"), 21);
    expect(screen.getByTestId("state")).toHaveTextContent("compact");
  });

  it("ignores movement that stays within the threshold", () => {
    render(<Screen />);
    scrollTo(screen.getByTestId("scroller"), 20);
    expect(screen.getByTestId("state")).toHaveTextContent("hero");
  });

  it("goes back to the hero state when scrolled home again", () => {
    render(<Screen />);
    const scroller = screen.getByTestId("scroller");
    scrollTo(scroller, 200);
    expect(screen.getByTestId("state")).toHaveTextContent("compact");
    scrollTo(scroller, 0);
    expect(screen.getByTestId("state")).toHaveTextContent("hero");
  });

  // Every screen using this renders a skeleton or a loader before its scroller
  // exists. The old hook did cope with that, but only because it re-subscribed
  // on every single render until one attempt happened to find the element. This
  // pins the behaviour to the callback ref instead, so subscribing once — the
  // change that removed the churn — cannot quietly break the late mount.
  it("attaches to a scroller that only appears after the skeleton", async () => {
    render(<Screen readyAtStart={false} />);
    expect(screen.queryByTestId("scroller")).not.toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: "load" }).click();
    });

    scrollTo(screen.getByTestId("scroller"), 50);
    expect(screen.getByTestId("state")).toHaveTextContent("compact");
  });

  it("reads the position on attach, so an already-scrolled element is not reported as at rest", () => {
    // Back-navigation restores scrollTop before any scroll event fires.
    function Restored() {
      const { isScrolled, scrollRef } = useScroll(20);
      return (
        <div
          ref={(node) => {
            if (node) Object.defineProperty(node, "scrollTop", { value: 999, configurable: true });
            scrollRef(node);
          }}>
          <span data-testid="state">{isScrolled ? "compact" : "hero"}</span>
        </div>
      );
    }

    render(<Restored />);
    expect(screen.getByTestId("state")).toHaveTextContent("compact");
  });
});
