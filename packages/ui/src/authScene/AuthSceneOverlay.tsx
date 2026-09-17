import { cn } from "@vibaar/utils";
import AuthEventCard from "./AuthEventCard";
import AuthStatusCard from "./AuthStatusCard";
import { overlayPlacementStyle } from "./scenePlacement";
import type { AuthOverlay, AuthOverlayAnchor, AuthOverlayPriority } from "./authScene";

/** Which corner sits on the coordinate. A closed set, so these are classes. */
const ANCHOR: Record<AuthOverlayAnchor, string> = {
  center: "scene-anchor-center",
  "top-left": "scene-anchor-top-left",
  "top-right": "scene-anchor-top-right",
  "bottom-left": "scene-anchor-bottom-left",
  "bottom-right": "scene-anchor-bottom-right",
};

/**
 * `optional` is dropped by a container query on a constrained pane — see
 * `.scene-overlay-optional` in the preset. `primary` and `secondary` carry no
 * class because they are always rendered; the difference between them is the
 * entrance order, which comes from `index`.
 */
const PRIORITY: Record<AuthOverlayPriority, string | undefined> = {
  primary: undefined,
  secondary: undefined,
  optional: "scene-overlay-optional",
};

export interface AuthSceneOverlayProps {
  overlay: AuthOverlay;
  /** Entrance order from 0. Becomes a transition delay, not a timer. */
  index: number;
  /** Whether the owning scene is the active one. Drives the entrance. */
  active: boolean;
}

/**
 * Places one overlay, and owns the fact that it is decoration.
 *
 * Each overlay receives its own datum as a prop. Nothing here iterates
 * `container.children` and then indexes a parallel data array — which is what
 * `AnimatedImages` does, and why adding any element inside its canvas silently
 * shifts the mapping and mis-assigns float parameters. Extra elements are
 * structurally irrelevant here because the data never travels separately from
 * the element that renders it.
 *
 * `aria-hidden` lives on this wrapper rather than on the cards: it belongs to
 * the decorative layer as a whole. The scene's real headline and description
 * are in the caption, already in the accessibility tree, so announcing invented
 * order figures as well would be both duplicated and untrue.
 *
 * The entrance is a CSS transition keyed off `active`, with the stagger coming
 * from `--overlay-index` × `--scene-stagger` in the preset. No `el.animate()`,
 * no per-overlay timer: the previous system's WAAPI choreography is precisely
 * what stranded uncancellable animations, and a settle does not need it.
 * `translate` carries the motion while `transform` carries the anchor, as
 * independent CSS properties, so neither clobbers the other. Note this is why
 * the entrance uses `.scene-offset`/`.scene-settled` and NOT Tailwind's
 * `translate-y-*`: those compile to `transform`, which would overwrite the
 * anchor and drop the card at its raw coordinate.
 */
export default function AuthSceneOverlay({ overlay, index, active }: AuthSceneOverlayProps) {
  const { placement } = overlay;

  return (
    <div
      aria-hidden="true"
      data-overlay={placement.priority}
      style={overlayPlacementStyle({ x: placement.x, y: placement.y, index })}
      className={cn(
        "scene-overlay",
        ANCHOR[placement.anchor],
        PRIORITY[placement.priority],
        "transition-scene duration-500 ease-out motion-reduce:transition-none",
        active ? "scene-settled opacity-100" : "scene-offset opacity-0"
      )}>
      {overlay.kind === "event" ? (
        <AuthEventCard
          icon={overlay.icon}
          title={overlay.title}
          value={overlay.value}
          metadata={overlay.metadata}
          tone={overlay.tone}
        />
      ) : (
        <AuthStatusCard
          icon={overlay.icon}
          title={overlay.title}
          description={overlay.description}
          tone={overlay.tone}
        />
      )}
    </div>
  );
}
