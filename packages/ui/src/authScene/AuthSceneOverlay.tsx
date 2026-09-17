import { cn } from "@vibaar/utils";
import AuthOverlayCard from "./AuthOverlayCard";
import AuthSceneChip from "./AuthSceneChip";
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
 * Both `secondary` and `optional` are dropped by container queries on a
 * constrained pane, at different thresholds and for different reasons — see the
 * preset. `primary` carries no class because it is the one element that is
 * always rendered; if it does not fit, nothing about the panel works.
 *
 * The thresholds are not a tidy ladder. `secondary` goes at 30rem of pane
 * WIDTH, because that is the width below which two cards cannot sit at opposite
 * corners without overlapping. `optional` goes at 26rem wide or 38rem tall,
 * because a third element also has to clear the bottom-anchored caption.
 */
const PRIORITY: Record<AuthOverlayPriority, string | undefined> = {
  primary: undefined,
  secondary: "scene-overlay-secondary",
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
 *
 * It is split across two elements, and neither half is arbitrary. `translate`
 * stays on this wrapper alongside the anchor's `transform`, as independent CSS
 * properties so neither clobbers the other — which is also why it uses
 * `.scene-offset`/`.scene-settled` rather than Tailwind's `translate-y-*`,
 * since those compile to `transform` and would drop the card at its raw
 * coordinate. The `opacity` half goes to the card; see below for why.
 */
export default function AuthSceneOverlay({ overlay, index, active }: AuthSceneOverlayProps) {
  const { placement } = overlay;

  /**
   * The entrance opacity travels DOWN to the card, and that is load-bearing.
   *
   * An element whose ancestor sits at `opacity < 1` becomes a backdrop root, and
   * `backdrop-filter` inside a backdrop root samples nothing — it renders as a
   * flat transparent pane. The preset records this trap for masks; opacity is
   * the same mechanism. So a glass card nested inside a fading wrapper would
   * have no blur at all for the whole 500ms entrance plus its stagger, then
   * snap to blurred the instant the wrapper reached 1: a visible pop on every
   * scene change.
   *
   * On the SAME element as the `backdrop-filter` there is no ancestor root to
   * defeat it — the filter samples the backdrop first, then group opacity
   * composites the result. The wrapper keeps position, anchor and `translate`,
   * which have no bearing on backdrop roots.
   */
  const entrance = cn(
    "transition-scene duration-500 ease-out motion-reduce:transition-none",
    active ? "opacity-100" : "opacity-0"
  );

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
        active ? "scene-settled" : "scene-offset"
      )}>
      {overlay.kind === "chip" ? (
        <AuthSceneChip label={overlay.label} className={entrance} />
      ) : (
        <AuthOverlayCard
          icon={overlay.icon}
          title={overlay.title}
          value={overlay.kind === "event" ? overlay.value : undefined}
          detail={overlay.kind === "event" ? overlay.metadata : overlay.description}
          tone={overlay.tone}
          badge={overlay.badge}
          className={entrance}
        />
      )}
    </div>
  );
}
