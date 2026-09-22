import { act } from "react";
import { renderHook } from "@testing-library/react";
import useSceneRotation, { SCENE_DWELL_MS, SCENE_FADE_MS } from "../useSceneRotation";

/**
 * The timer is the whole point of this hook, so these use fake timers and
 * assert on timer COUNT as well as behaviour. `jest.getTimerCount()` after
 * unmount is the direct test of the ownership fix — nothing tested that before,
 * which is how two page controllers each ended up running an ungated interval.
 */
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

const opts = { count: 3, enabled: true, paused: false };

describe("useSceneRotation", () => {
  it("starts on the first scene with nothing fading", () => {
    const { result } = renderHook(() => useSceneRotation(opts));
    expect(result.current.index).toBe(0);
    expect(result.current.outgoing).toBeNull();
  });

  it("advances after the dwell", () => {
    const { result } = renderHook(() => useSceneRotation(opts));
    act(() => void jest.advanceTimersByTime(SCENE_DWELL_MS));
    expect(result.current.index).toBe(1);
  });

  it("keeps the outgoing scene only for the length of the fade", () => {
    const { result } = renderHook(() => useSceneRotation(opts));
    act(() => void jest.advanceTimersByTime(SCENE_DWELL_MS));
    // Something to fade FROM — but not all three layers, which would request
    // all three images.
    expect(result.current.outgoing).toBe(0);
    act(() => void jest.advanceTimersByTime(SCENE_FADE_MS));
    expect(result.current.outgoing).toBeNull();
  });

  it.each([2, 3, 5])("wraps at the end for %i scenes", (count) => {
    const { result } = renderHook(() => useSceneRotation({ ...opts, count }));
    for (let i = 0; i < count; i++) {
      act(() => void jest.advanceTimersByTime(SCENE_DWELL_MS));
    }
    // The count is derived, never a literal. `% 3` was hard-coded in two page
    // files and stopped matching the data.
    expect(result.current.index).toBe(0);
  });

  it("resets the dwell on manual selection, so a click is not overtaken", () => {
    const { result } = renderHook(() => useSceneRotation(opts));
    act(() => void jest.advanceTimersByTime(SCENE_DWELL_MS - 200));
    act(() => result.current.goTo(2));
    expect(result.current.index).toBe(2);
    // The old `setInterval` with `[]` deps never restarted, so a click at
    // t+6.3s was overtaken 200ms later.
    act(() => void jest.advanceTimersByTime(300));
    expect(result.current.index).toBe(2);
    act(() => void jest.advanceTimersByTime(SCENE_DWELL_MS));
    expect(result.current.index).toBe(0);
  });

  it("wraps a caller's out-of-range index instead of clamping", () => {
    const { result } = renderHook(() => useSceneRotation(opts));
    act(() => result.current.goTo(4));
    expect(result.current.index).toBe(1);
    act(() => result.current.goTo(-1));
    expect(result.current.index).toBe(2);
  });

  it("schedules NOTHING when disabled — the static case", () => {
    const { result } = renderHook(() => useSceneRotation({ ...opts, enabled: false }));
    expect(jest.getTimerCount()).toBe(0);
    act(() => void jest.advanceTimersByTime(SCENE_DWELL_MS * 10));
    expect(result.current.index).toBe(0);
  });

  it("holds while paused, then serves a full dwell on resume", () => {
    const { result, rerender } = renderHook(
      (p: { paused: boolean }) => useSceneRotation({ ...opts, paused: p.paused }),
      { initialProps: { paused: true } }
    );
    act(() => void jest.advanceTimersByTime(SCENE_DWELL_MS * 3));
    expect(result.current.index).toBe(0);

    rerender({ paused: false });
    // Not immediate on resume — the dwell restarts rather than firing the
    // backlog, so unpausing does not snap the scene.
    act(() => void jest.advanceTimersByTime(SCENE_DWELL_MS - 100));
    expect(result.current.index).toBe(0);
    act(() => void jest.advanceTimersByTime(200));
    expect(result.current.index).toBe(1);
  });

  it("never rotates a single scene", () => {
    const { result } = renderHook(() => useSceneRotation({ ...opts, count: 1 }));
    expect(jest.getTimerCount()).toBe(0);
    act(() => void jest.advanceTimersByTime(SCENE_DWELL_MS * 5));
    expect(result.current.index).toBe(0);
  });

  it("leaves no timer behind on unmount", () => {
    const { unmount } = renderHook(() => useSceneRotation(opts));
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    unmount();
    // The assertion that matters: effect cleanup is the entire teardown story.
    expect(jest.getTimerCount()).toBe(0);
  });

  it("leaves no timer behind when unmounted mid-fade", () => {
    const { result, unmount } = renderHook(() => useSceneRotation(opts));
    act(() => void jest.advanceTimersByTime(SCENE_DWELL_MS));
    expect(result.current.outgoing).toBe(0);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
