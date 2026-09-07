"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import styles from "../MarketingSite.module.css";

/**
 * The single scroll controller for the whole seller → buyer → creator journey.
 *
 * Each section used to run its own listener, its own rAF and its own geometry
 * read, so three sections meant three of everything and every section measured
 * itself on every frame even while off-screen. This owns one passive listener
 * and one rAF for all of them, caches each panel's geometry until a resize
 * invalidates it, and skips any panel further than a viewport outside the
 * scroll window.
 *
 * Scroll position is the clock — modelled on biosites.com, which uses no
 * scroll-snap at all: a tall runway with one `position: sticky` panel inside
 * it, so the panel holds the screen while the reader scrolls *through* it. The
 * page never jumps to a snap point, which is what keeps the movement smooth
 * and fully reversible, and it means nothing moves unless the reader moves it.
 *
 * Two continuous values come out of each frame, both written as CSS custom
 * properties rather than React state so a scroll costs style writes instead of
 * renders:
 *
 *   --slide-fill   0..1 through the current slide, drives the progress bar.
 *   --scene-*      the stacked-scene transform, see `writeScene` below.
 *
 * Only crossing a slide boundary re-renders, and only the panel that crossed.
 */

type SceneRegistration = {
  readonly el: HTMLElement;
  readonly count: number;
  readonly rail: HTMLElement | null;
  readonly setIndex: (index: number) => void;
  /**
   * How much of a viewport one step costs. The audience panels give a whole
   * one to each slide; the FAQ steps faster than that, because a question is a
   * line to read rather than a scene to take in.
   */
  readonly stride?: number;
};

type Scene = SceneRegistration & {
  /** Cached geometry — refreshed on resize, never per frame. */
  top: number;
  height: number;
  /** The pin's own height. Panels are sized in `svh`, which is not the live
      viewport on a phone whose URL bar is retracted, so the slide runway is
      measured off the pin rather than assumed equal to the scroller. */
  pin: number;
  /** Last values written, so a settled scene stops touching the DOM. */
  index: number;
  fill: number;
  phase: string;
  y: number;
};

type JourneyApi = {
  readonly register: (scene: SceneRegistration) => () => void;
  readonly scrollToSlide: (el: HTMLElement, slot: number) => void;
  /** The panel currently holding the screen, as the controller sees it. */
  readonly subscribeActive: (listener: (id: string) => void) => () => void;
  readonly scrollToPanel: (id: string) => void;
};

const AudienceJourneyContext = createContext<JourneyApi | null>(null);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** How far outside the viewport a panel still gets frame work. */
const NEAR = 1.15;

/**
 * The stacked-scene transform.
 *
 * `p` runs -1 → 0 → 1: fully below and rising, settled, closing upward. The
 * transform lands on the pin's *children* rather than the pin itself, so the
 * pin keeps painting its section background edge to edge and no black band can
 * open up between two scenes as they hand over.
 */
function writeScene(scene: Scene, p: number, viewport: number) {
  const incoming = p < 0;
  // Resolved against the viewport rather than each child's own box, so the
  // copy, the artwork and the glow travel as one scene instead of three.
  const y = (incoming ? -p * 0.1 : -p * 0.08) * viewport;
  const opacity = incoming ? 1 + p * 0.15 : 1;
  const scaleValue = incoming ? 1 : 1 - p * 0.015;
  const dim = incoming ? 1 : 1 - p * 0.18;

  if (Math.abs(y - scene.y) < 0.05) return;
  scene.y = y;

  const style = scene.el.style;
  style.setProperty("--scene-y", `${y.toFixed(2)}px`);
  style.setProperty("--scene-opacity", opacity.toFixed(4));
  style.setProperty("--scene-scale", scaleValue.toFixed(5));
  style.setProperty("--scene-dim", dim.toFixed(4));
}

function setPhase(scene: Scene, phase: string) {
  if (scene.phase === phase) return;
  scene.phase = phase;
  scene.el.dataset.scene = phase;
}

export function AudienceJourney({ children }: { readonly children: ReactNode }) {
  const scenesRef = useRef<Set<Scene>>(new Set());
  const sizeRef = useRef<ResizeObserver | null>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const activeListeners = useRef(new Set<(id: string) => void>());
  const measureRef = useRef<() => void>(() => {});
  const scheduleRef = useRef<() => void>(() => {});

  const api = useMemo<JourneyApi>(
    () => ({
      register(registration) {
        const scene: Scene = {
          ...registration,
          top: 0,
          height: 0,
          pin: 0,
          index: -1,
          fill: -1,
          phase: "",
          y: Number.NaN,
        };
        scenesRef.current.add(scene);
        sizeRef.current?.observe(scene.el);
        measureRef.current();
        scheduleRef.current();
        return () => {
          scenesRef.current.delete(scene);
          sizeRef.current?.unobserve(scene.el);
        };
      },
      subscribeActive(listener) {
        activeListeners.current.add(listener);
        return () => {
          activeListeners.current.delete(listener);
        };
      },
      scrollToPanel(id) {
        const scroller = scrollerRef.current;
        const scene = [...scenesRef.current].find((entry) => entry.el.id === id);
        if (!scroller || !scene) return;
        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        // Its settled position — the same place scrolling would put you.
        scroller.scrollTo({
          behavior: reduced ? "auto" : "smooth",
          top: scene.top,
        });
      },
      scrollToSlide(el, slot) {
        const scroller = scrollerRef.current;
        const scene = [...scenesRef.current].find((entry) => entry.el === el);
        if (!scroller || !scene) return;

        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        // The middle of that slide's own viewport, so the indicator lands the
        // reader where the slide is fully settled rather than mid-handover.
        scroller.scrollTo({
          behavior: reduced ? "auto" : "smooth",
          top: scene.top + scene.pin * (scene.stride ?? 1) * (slot + 0.5),
        });
      },
    }),
    []
  );

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(
      "[data-marketing-scroller]"
    );
    if (!scroller) return;
    scrollerRef.current = scroller;

    let frame = 0;
    let activeId = "";

    const measure = () => {
      const base = scroller.getBoundingClientRect().top - scroller.scrollTop;
      for (const scene of scenesRef.current) {
        scene.top = scene.el.getBoundingClientRect().top - base;
        scene.height = scene.el.offsetHeight;
        scene.pin =
          scene.el.querySelector<HTMLElement>("[data-panel-pin]")?.offsetHeight ??
          scene.height;
      }
    };

    const read = () => {
      frame = 0;
      const viewport = scroller.clientHeight;
      const scrollTop = scroller.scrollTop;
      let nextActive = "";

      for (const scene of scenesRef.current) {
        // Two different runways. The pin stays stuck for the whole of the
        // first; the slides only advance across the second, so the handover
        // viewport at the end does not drag the deck past its last slide.
        const pinRunway = scene.height - scene.pin;
        const slideRunway = scene.count * scene.pin * (scene.stride ?? 1);
        const rel = scrollTop - scene.top;

        // Everything below is gated on the panel being near the viewport, so a
        // scroll through the FAQ does no work for three audience panels.
        if (rel < -viewport * NEAR || rel > pinRunway + viewport * NEAR) {
          setPhase(scene, "away");
          continue;
        }

        if (rel < 0) {
          const p = Math.max(rel / viewport, -1);
          writeScene(scene, p, viewport);
          setPhase(scene, "in");
          // Half-covered is the point at which this scene, not the one behind
          // it, is what the reader is looking at.
          if (p > -0.5) nextActive = scene.el.id;
        } else if (rel <= slideRunway) {
          writeScene(scene, 0, viewport);
          setPhase(scene, "settled");
          nextActive = scene.el.id;
        } else {
          writeScene(scene, Math.min((rel - slideRunway) / viewport, 1), viewport);
          setPhase(scene, "out");
        }

        const progress = slideRunway > 0 ? clamp(rel / slideRunway, 0, 1) : 0;
        const scaled = progress * scene.count;
        const slot = Math.min(Math.floor(scaled), scene.count - 1);

        if (slot !== scene.index) {
          scene.index = slot;
          scene.setIndex(slot);
        }

        const fill = clamp(scaled - slot, 0, 1);
        if (Math.abs(fill - scene.fill) > 0.001) {
          scene.fill = fill;
          scene.rail?.style.setProperty("--slide-fill", fill.toFixed(4));
        }
      }

      /*
       * Which audience is current is answered here rather than by a separate
       * observer. An IntersectionObserver only reports the entries that
       * changed in a given batch, so it was choosing the most visible section
       * *of that batch* — fine while scrolling, wrong after a jump, where the
       * batches arrive split and the last one to land won. The controller
       * already knows exactly which panel holds the screen.
       */
      if (nextActive && nextActive !== activeId) {
        activeId = nextActive;
        for (const listener of activeListeners.current) listener(nextActive);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    const remeasure = () => {
      measure();
      schedule();
    };

    measureRef.current = measure;
    scheduleRef.current = schedule;

    remeasure();
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);

    // Panels are viewport-sized, so anything that changes a panel box — a
    // fold-out, a font swap, the mobile URL bar, the FAQ changing category —
    // invalidates the cache. Panels are observed one by one rather than
    // through a common wrapper, because they no longer share one.
    const resizeObserver = new ResizeObserver(remeasure);
    sizeRef.current = resizeObserver;
    for (const scene of scenesRef.current) resizeObserver.observe(scene.el);

    return () => {
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      resizeObserver.disconnect();
      sizeRef.current = null;
      if (frame) cancelAnimationFrame(frame);
      measureRef.current = () => {};
      scheduleRef.current = () => {};
    };
  }, []);

  return (
    <AudienceJourneyContext.Provider value={api}>
      {children}
    </AudienceJourneyContext.Provider>
  );
}

/**
 * The sticky wrapper for the three audience panels and their tab. Separate
 * from the provider above so the FAQ can share the controller without joining
 * the block whose bottom edge releases the tab.
 */
export function AudienceStack({ children }: { readonly children: ReactNode }) {
  return (
    <div className={styles.audienceJourney} data-audience-journey>
      {children}
    </div>
  );
}

/**
 * One audience panel's view of the shared controller. The returned shape is
 * the same one the per-section hook used to return, so a section only has to
 * hand back its element and its rail.
 */
/** The journey's shared controller, for anything that is not a panel. */
export function useAudienceJourney(): JourneyApi | null {
  return useContext(AudienceJourneyContext);
}

export function useAudienceScene(
  count: number,
  stride?: number
): {
  readonly index: number;
  readonly railRef: RefObject<HTMLDivElement>;
  readonly sectionRef: RefObject<HTMLElement>;
  readonly select: (slot: number) => void;
} {
  const journey = useContext(AudienceJourneyContext);
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !journey) return;
    return journey.register({
      count,
      el,
      rail: railRef.current,
      setIndex,
      stride,
    });
  }, [count, journey, stride]);

  const select = useCallback(
    (slot: number) => {
      const el = sectionRef.current;
      if (el && journey) journey.scrollToSlide(el, slot);
    },
    [journey]
  );

  return { index, railRef, sectionRef, select };
}
