"use client";

import { cn } from "@vibaar/utils";
import Surface from "../common/Surface";
import { AUTH_SCENE_STRAPLINE, type AuthScene } from "./authScene";

/**
 * Which of the two presentation sites this is.
 *
 * `panel` sits inside the visual panel at `md+`. `column` is the existing
 * content-column position below the mobile artwork band. Exactly one is
 * displayed at any width — see the component docblock for why that is a `hidden`
 * class and not a JS branch.
 */
export type AuthCaptionVariant = "panel" | "column";

export interface AuthSceneCaptionProps {
  scenes: readonly AuthScene[];
  index: number;
  variant: AuthCaptionVariant;
  /**
   * Omitted for a static scene, which is what a progressive form step shows.
   * Its absence is what removes the dots: a set of one has nothing to select,
   * and a counter over it would be a lie.
   */
  onSelect?: (index: number) => void;
  className?: string;
}

/**
 * The rotating scene copy: eyebrow, label, headline, description, controls.
 *
 * ## Why this renders twice
 *
 * At `md+` the caption belongs inside the visual panel. Below `md` it must stay
 * exactly where it is today — in the content column, under a fixed-height
 * artwork band — because the media wrapper clips overflow and could not place
 * it there. So there are two presentation SITES for this small block of text
 * and its controls, fed by one scene state, one timer and one media renderer
 * held by `AuthSceneController`.
 *
 * The duplication is the text, not the engine. That distinction is the whole
 * point: the previous system duplicated the engine — two sibling subtrees under
 * `md:hidden` / `hidden md:flex`, both mounted, so every signed-out visit ran
 * two slideshow controllers and fetched all three backgrounds twice.
 *
 * Only one site is displayed at a time, via `hidden`, so `display: none` keeps
 * the other out of the accessibility tree as well as off the screen — the copy
 * is never announced twice. A JS width branch would do the same thing worse:
 * it would render nothing until hydration and reintroduce the viewport-reading
 * layout fork this work removed.
 *
 * ## No `aria-live`
 *
 * The copy is live in the sense that it is really in the document and really
 * changes. It is not an announcing region: a marketing headline that
 * interrupts a screen-reader user every few seconds while they are filling in a
 * sign-in form is a defect, not an accommodation. The text is reachable by
 * normal reading at all times, and the dots move focusably between scenes.
 *
 * ## There is no pause control, and SC 2.2.2 is knowingly unmet
 *
 * The dwell is 6500ms (`SCENE_DWELL_MS`) and the rotation loops indefinitely,
 * so this panel meets every trigger of WCAG 2.2.2 Pause, Stop, Hide (Level A)
 * and ships no mechanism. Two things mitigate and neither satisfies it:
 * `prefers-reduced-motion` stops the auto-advance outright, so anyone who has
 * set the OS preference never sees a change; and `usePageVisible` suspends the
 * timer on a hidden tab. Hover- and focus-pausing were considered and are not
 * mechanisms — hover does not exist on a phone, and neither is discoverable.
 * The dots are selection, not a stop.
 *
 * A visible pause/resume button was built and then removed by product
 * decision. This note exists so the next reader does not have to rediscover
 * the trade, and so re-adding one is a deliberate change rather than a
 * "missing control" bug report.
 *
 * ## The headline is not a heading
 *
 * It is a `<p>`. The page's heading is the fixed proposition in the content
 * column, which does not rotate. A heading whose text changes on a timer would
 * restructure the document outline while someone is navigating it, and would
 * give these pages two competing `h1`s — which is what the old `SlideContent`
 * did.
 */
export default function AuthSceneCaption({
  scenes,
  index,
  variant,
  onSelect,
  className,
}: AuthSceneCaptionProps) {
  const isPanel = variant === "panel";
  const rotating = Boolean(onSelect) && scenes.length > 1;

  const body = (
    <>
      {/* The one line that holds across all three scenes, so it does not join
          the crossfade. Panel only: adding a line above the mobile headline
          would push the caption down the column, and that geometry is fixed. */}
      {isPanel && (
        <p className="text-caption font-medium uppercase tracking-widest text-foreground-secondary">
          {AUTH_SCENE_STRAPLINE}
        </p>
      )}

      {/* Every scene in ONE grid cell, so the box is as tall as the tallest
          copy and the crossfade cannot change the layout. The predecessor used
          `h-20 sm:h-28` — a height picked for an 18px headline, which clipped
          both the title and the second description line once the type grew. */}
      <div className={cn("grid", isPanel ? "mt-3" : undefined)}>
        {scenes.map((scene, position) => (
          <div
            key={scene.id}
            // Not `aria-live`: this hides the scenes that are not on screen so
            // the caption reads as one block rather than three stacked copies.
            aria-hidden={position !== index}
            className={cn(
              "col-start-1 row-start-1 w-full transition-opacity duration-500 motion-reduce:transition-none",
              isPanel ? "text-left" : "text-center",
              position === index ? "opacity-100" : "pointer-events-none opacity-0"
            )}>
            {isPanel && (
              <p className="text-body-sm font-medium text-brandDeep">{scene.label}</p>
            )}

            {/* A `<p>`, deliberately — see the docblock. Same type scale the
                column headline has always had, so the mobile presentation is
                unchanged by this move. */}
            <p
              className={cn(
                "text-balance font-medium tracking-wide text-foreground-primary",
                isPanel ? "mt-1 text-h1" : "text-h1"
              )}>
              {scene.headline}
            </p>

            <p
              className={cn(
                "mt-3 text-body font-normal text-foreground-secondary",
                isPanel && "mt-2"
              )}>
              {scene.description}
            </p>
          </div>
        ))}
      </div>

      {rotating && (
        <div
          className={cn(
            "flex items-center",
            // `justify-between` used to push a pause button to the far edge.
            // With the dots as the only child it would just make them hug the
            // left, so it is gone rather than left behind as dead intent.
            isPanel ? "mt-4" : "justify-center py-5"
          )}>
          {/* A group, named, so the dots are not three unexplained buttons in a
              row. `aria-current` marks which one is showing — the active dot is
              distinguished by width alone visually, which is not available to
              anyone not looking at it. */}
          <div
            role="group"
            aria-label="Choose a scene"
            className={cn("flex items-center", isPanel ? "gap-1.5" : "gap-1")}>
            {scenes.map((scene, position) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => onSelect?.(position)}
                aria-current={position === index}
                // The headline, not "slide 3 of 3": it names the thing the
                // control goes to instead of its ordinal.
                aria-label={scene.headline}
                className={cn(
                  "h-1 rounded-full transition-all duration-300 motion-reduce:transition-none",
                  position === index ? "w-3.5 bg-brand" : "w-1 bg-surface-strong"
                )}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );

  // `data-scene-caption` names which of the two presentation sites this is.
  // Same convention as the overlay layer's `data-overlay`: it is what lets a
  // measurement assert that exactly ONE caption is displayed at a given width,
  // which is the property the two-site arrangement has to keep and the thing a
  // class-name assertion cannot see.
  if (!isPanel) {
    return (
      <div data-scene-caption="column" className={className}>
        {body}
      </div>
    );
  }

  // Placement on the outer node, chrome on the `Surface`. Two elements because
  // `Surface` takes a `className` and nothing else — it is the app's bordered
  // box, not a prop passthrough, and widening it for one attribute here would
  // change a primitive that ~40 call sites depend on.
  return (
    <div data-scene-caption="panel" className={className}>
      {/* `rounded-panel` rather than Surface's `rounded-card`: this sits inside
          the panel's own `rounded-panel` frame, and the smaller radius read as
          a different family of object. */}
      <Surface className="rounded-panel p-5 shadow-pop">{body}</Surface>
    </div>
  );
}
