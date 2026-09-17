"use client";
import { useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { slidesData, COMPOSITION_CANVAS } from "./slidesData";

interface AnimatedImagesProps {
  currentSlide: number;
}

/**
 * The resting transform for a card, in canvas fractions.
 *
 * Both terms are `calc()` against `--composition-scale`, which
 * `.composition-canvas` sizes from its container — so the spread grows and
 * shrinks with the pane, continuously, with no breakpoint and no resize
 * listener. The offsets used to be literal pixels (`translate(165px, 15px)`)
 * against a pane that is 344px wide at 768 and 928px at 1440, which is why the
 * composition overflowed its own pane by 117px a side at the low end.
 */
const SPREAD =
  "translate(calc(-50% + var(--item-x, 0) * var(--composition-scale)), " +
  "calc(-50% + var(--item-y, 0) * var(--composition-scale)))";

/** Stacked at the centre, before the spread. */
const GATHERED = "translate(-50%, -50%)";

export default function AnimatedImages({ currentSlide }: AnimatedImagesProps) {
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const animateSlide = useCallback(
    (container: HTMLDivElement | null, index: number) => {
      if (!container) return;

      const elements = Array.from(container.children) as HTMLElement[];
      const slide = slidesData[index];

      // Cancel first, every time. `startFloating` composes its keyframes on top
      // of whatever transform is current, and a WAAPI animation outranks the
      // inline style — so without this, re-entering a slide stacked a second
      // infinite animation on each card and the later gather/spread had no
      // visible effect at all.
      const stop = () =>
        elements.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));

      const gather = () => {
        elements.forEach((el) => {
          el.style.transition = "transform 1s cubic-bezier(0.16, 1, 0.3, 1)";
          el.style.transform = GATHERED;
        });
      };

      const spread = () => {
        elements.forEach((el) => {
          el.style.transition = "transform 1.8s cubic-bezier(0.16, 1, 0.3, 1)";
          el.style.transform = SPREAD;
        });
      };

      const startFloating = () => {
        elements.forEach((el, idx) => {
          const float = slide.images[idx]?.animation?.floatHeight ?? 10;
          const duration = slide.images[idx]?.animation?.floatDuration ?? 4000;
          // The amplitude is a canvas fraction too, so a card on a small pane
          // does not bob the same absolute distance as one on a large pane.
          const rise = `translateY(calc(${-float / COMPOSITION_CANVAS} * var(--composition-scale)))`;

          el.animate(
            [
              { transform: `${SPREAD} translateY(0px)` },
              { transform: `${SPREAD} ${rise}` },
              { transform: `${SPREAD} translateY(0px)` },
            ],
            {
              duration,
              iterations: Infinity,
              easing: "cubic-bezier(0.5, 0, 0.5, 1)",
              direction: "alternate",
            }
          );
        });
      };

      stop();
      gather();

      // BOTH handles are captured. The inner one used to be discarded, and that
      // was a leak with teeth: a slide change landing between t+800 and t+2600
      // ran this cleanup — which cancelled the animations — and then the
      // orphaned timeout fired `startFloating` anyway, on the OUTGOING slide's
      // cards. Those cards are still in the DOM (every slide is mounted, just
      // `opacity-0`), so they kept an infinite animation that nothing would
      // ever cancel, because `stop()` only iterates the container of the slide
      // being entered. On unmount it called `el.animate()` against detached
      // nodes. The 8s auto-advance mostly hid the window; a manual indicator
      // click lands in it squarely.
      let floatTimeout: ReturnType<typeof setTimeout> | undefined;
      const spreadTimeout = setTimeout(() => {
        spread();
        floatTimeout = setTimeout(startFloating, 1800);
      }, 800);

      return () => {
        clearTimeout(spreadTimeout);
        clearTimeout(floatTimeout);
        stop();
      };
    },
    []
  );

  useEffect(() => {
    // Returning animateSlide's own cleanup matters: it clears the pending
    // spread timeout, which otherwise fires against a detached element, and
    // cancels the float so animations cannot accumulate across slides.
    return animateSlide(containerRefs.current[currentSlide], currentSlide);
  }, [currentSlide, animateSlide]);

  const setContainerRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      containerRefs.current[index] = el;
    },
    []
  );

  return (
    <div className="h-full w-full">
      <header className="relative h-full w-full overflow-hidden">
        {slidesData.map((slide, index) => {
          const isActive = currentSlide === index;
          return (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity ease-in-out ${
                isActive ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}>
              <div className="relative w-full h-full">
                <Image
                  src={slide.background}
                  fill
                  alt=""
                  // Only the slide on screen is worth blocking paint for. All
                  // three carried `priority` before, so every visit fetched two
                  // backgrounds nobody was looking at at the highest priority
                  // the loader has.
                  priority={isActive}
                  loading={isActive ? undefined : "lazy"}
                  // The pane is half the frame at md and a full-bleed band
                  // below it; without this Next emits a 100vw srcset for a
                  // box that is never 100vw on desktop.
                  sizes="(min-width: 768px) 60vw, 100vw"
                  className="z-0 top-0 absolute object-cover"
                />

                <Image
                  src="/brand/logo-white.svg"
                  alt=""
                  width={150}
                  height={43}
                  className="mx-auto z-20 absolute top-16 left-1/2 transform -translate-x-1/2 -translate-y-1/3 md:hidden"
                  priority={isActive}
                />

                <div
                  ref={setContainerRef(index)}
                  className="composition-canvas absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                  {slide.images.map((img, idx) => (
                    <div
                      key={`img-${index}-${idx}`}
                      className="composition-item will-change-transform"
                      style={
                        {
                          // Geometry as fractions of the canvas; CSS multiplies
                          // them by the real pane. One style object, carrying
                          // the whole card's contract.
                          "--item-x": (img.position?.x ?? 0) / COMPOSITION_CANVAS,
                          "--item-y": (img.position?.y ?? 0) / COMPOSITION_CANVAS,
                          "--item-w": img.width / COMPOSITION_CANVAS,
                          transform: GATHERED,
                          transition: "transform 1.8s cubic-bezier(0.16, 1, 0.3, 1)",
                        } as React.CSSProperties
                      }>
                      <Image
                        src={img.src}
                        width={img.width}
                        height={img.height}
                        alt=""
                        priority={isActive}
                        loading={isActive ? undefined : "lazy"}
                        className="w-full h-auto"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Joins the band to the content beneath it on mobile.
            It must finish at `bottom-0` and reach FULL surface there. It used
            to sit at `-bottom-12` with 48px hanging below, inside this
            `overflow-hidden` header — so the overhang was clipped and the
            gradient was still ~30% transparent where the band ended, leaving a
            hard seam against the page. Nothing below to fade into at `md`. */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface via-surface/70 to-transparent z-20 md:hidden" />
      </header>
    </div>
  );
}
