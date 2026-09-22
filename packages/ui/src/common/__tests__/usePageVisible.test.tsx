import { render } from "@testing-library/react";
import { act } from "react";
import usePageVisible from "../usePageVisible";

/**
 * jsdom reports `visibilityState === "visible"` and never changes it on its
 * own, so the hidden case has to be forced — which is also the only way to
 * prove the subscription is wired rather than the snapshot just being right
 * by luck.
 */
function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

afterEach(() => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  });
});

function probe() {
  const seen: boolean[] = [];
  const Probe = () => {
    seen.push(usePageVisible());
    return null;
  };
  const utils = render(<Probe />);
  return { last: () => seen[seen.length - 1], ...utils };
}

describe("usePageVisible", () => {
  it("assumes visible, because visibilitychange never fires on load", () => {
    // The asymmetry with the other environment hooks is the point: a `false`
    // snapshot would leave a visible tab paused until the visitor happened to
    // switch away and back.
    expect(probe().last()).toBe(true);
  });

  it("reports hidden when the document goes away, and visible again after", () => {
    const p = probe();
    act(() => setVisibility("hidden"));
    expect(p.last()).toBe(false);
    act(() => setVisibility("visible"));
    expect(p.last()).toBe(true);
  });

  it("stops listening on unmount", () => {
    const added = jest.spyOn(document, "addEventListener");
    const removed = jest.spyOn(document, "removeEventListener");
    const { unmount } = probe();
    expect(added).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    unmount();
    expect(removed).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    added.mockRestore();
    removed.mockRestore();
  });
});
