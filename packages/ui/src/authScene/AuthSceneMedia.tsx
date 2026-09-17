"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@vibaar/utils";
import useIsHydrated from "../common/useIsHydrated";
import usePrefersReducedMotion from "../common/usePrefersReducedMotion";
import AuthSceneOverlay from "./AuthSceneOverlay";
import { sceneFocalStyle } from "./scenePlacement";
import type { AuthScene } from "./authScene";

export interface AuthSceneMediaProps {
  scenes: readonly AuthScene[];
  /** The scene on screen. */
  index: number;
  /** The scene fading out, or `null`. From `useSceneRotation`. */
  outgoing: number | null;
}

interface AuthSceneLayerProps {
  scene: AuthScene;
  /** `false` for the outgoing layer: the photo fades and the cards retreat. */
  active: boolean;
}

/**
 * One scene: its photograph and its cards.
 *
 * `entered` exists because a layer that mounts already in its final state has
 * nothing to transition from — React would render the incoming scene at
 * `opacity-100` on its first frame and the crossfade would simply not happen.
 * So the layer mounts in its offset state and is promoted one frame later.
 *
 * One `requestAnimationFrame` per layer mount, cancelled on unmount. Not a
 * `setTimeout`, which is what `AnimatedImages` used and how it stranded an
 * uncancellable animation: an rAF cannot fire after its cancel, and there is no
 * chained second handle to lose.
 *
 * Under reduced motion it starts entered. The transitions are
 * `motion-reduce:transition-none`, so promoting a frame later would snap
 * through one frame of `opacity-0` — a flash, which is precisely what the
 * preference asks not to happen.
 */
function AuthSceneLayer({ scene, active }: AuthSceneLayerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [entered, setEntered] = useState(reducedMotion);

  useEffect(() => {
    if (entered) return;
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [entered]);

  const shown = active && entered;
  const { image } = scene;

  return (
    <div
      className={cn(
        "scene-layer",
        "transition-scene duration-500 ease-out motion-reduce:transition-none",
        shown ? "opacity-100" : "opacity-0"
      )}>
      {/* `alt=""`, not a copy of `image.alt`. The pane is no longer
          `aria-hidden` as a whole — the caption inside it is real content — so
          each decorative part now has to declare itself, and the photograph is
          decorative: the caption states the same thing in words that are
          already in the accessibility tree. `image.alt` is still required by
          the type and asserted by a test; it is review material, describing
          what shipped, not a second announcement. */}
      <Image
        src={image.src}
        alt=""
        fill
        // Only the scene on screen is worth a high fetch priority. The old
        // panel gave all three `priority`, so every signed-out visit fetched
        // two backgrounds nobody was looking at ahead of the one they were.
        priority={active}
        loading={active ? undefined : "lazy"}
        // The pane is a full-bleed band below `md` and ~60% of the frame from
        // `lg`; without this Next emits a 100vw srcset for a box that is never
        // 100vw on a desktop.
        sizes="(min-width: 1024px) 60vw, (min-width: 768px) 50vw, 100vw"
        className={cn(
          "scene-image",
          "transition-scene duration-700 ease-out motion-reduce:transition-none",
          // A settle, not a zoom: 1.01 → 1. `scale` as the independent
          // property, so it composes with anything `transform` carries rather
          // than replacing it.
          shown ? "scene-media-settled" : "scene-media-offset"
        )}
        style={sceneFocalStyle({
          x: image.focal.mobile.x,
          y: image.focal.mobile.y,
          compactX: image.focal.compact.x,
          compactY: image.focal.compact.y,
          desktopX: image.focal.desktop.x,
          desktopY: image.focal.desktop.y,
        })}
      />

      {/* Mobile only, and preserved exactly as the band carries it today:
          the white wordmark over the artwork, at the same offset. */}
      <Image
        src="/brand/logo-white.svg"
        alt=""
        aria-hidden="true"
        width={150}
        height={43}
        priority={active}
        className="absolute left-1/2 top-16 z-20 mx-auto -translate-x-1/2 -translate-y-1/3 transform md:hidden"
      />

      {scene.overlays.map((overlay, position) => (
        <AuthSceneOverlay
          key={`${scene.id}-${position}`}
          overlay={overlay}
          index={position}
          active={shown}
        />
      ))}
    </div>
  );
}

/**
 * The artwork inside the auth media pane.
 *
 * ## At most two layers are ever mounted
 *
 * `AnimatedImages` mounted all three slides and hid two with `opacity-0`, so a
 * signed-out visit downloaded three backgrounds and 27 cards to show nine.
 * Here the only mounted layers are the active scene and, during a crossfade,
 * the one it is replacing — so the third scene's photograph is not requested
 * until it is the one being shown. A network assertion pins this: no more than
 * two scene images in flight across a transition.
 *
 * ## Nothing here reaches the server
 *
 * The whole panel is behind `useIsHydrated`, and that is not an optimisation —
 * it is the fix for a measured defect. One prerendered document serves every
 * query string on these routes, and it is the step-zero landing, so
 * `/signin?step=1` shipped the entire landing composition to a phone that was
 * about to render a password field. See `useIsHydrated` for the measurement and
 * for what this costs.
 *
 * The pane reserves its own box — it is a grid track at `md` and `h-auth-band`
 * below it, both independent of their contents — so mounting into it after
 * hydration moves nothing.
 */
export default function AuthSceneMedia({ scenes, index, outgoing }: AuthSceneMediaProps) {
  const hydrated = useIsHydrated();

  if (!hydrated) return null;

  const active = scenes[index];
  if (!active) return null;

  const leaving = outgoing !== null && outgoing !== index ? scenes[outgoing] : undefined;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Keyed by scene id: a layer is a scene, so React unmounts the one that
          left rather than reusing its DOM for a different photograph — which
          would swap the `src` under a running transition and show the new
          image mid-fade. */}
      {leaving && <AuthSceneLayer key={leaving.id} scene={leaving} active={false} />}
      <AuthSceneLayer key={active.id} scene={active} active />

      {/* Joins the band to the content beneath it on mobile. Must finish at
          `bottom-0` and reach FULL surface there, or the band ends on a hard
          seam. Nothing below to fade into at `md`, hence `md:hidden`. Above the
          layers, so it fades whichever scene is showing. */}
      <div className="absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-surface via-surface/70 to-transparent md:hidden" />
    </div>
  );
}
