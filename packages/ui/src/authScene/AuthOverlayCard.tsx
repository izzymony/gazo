import { cn } from "@vibaar/utils";
import { SCENE_BADGES, SCENE_ICONS } from "./sceneIcons";
import type { AuthOverlayBadge, AuthOverlayTone, AuthSceneIconKey } from "./authScene";

export interface AuthOverlayCardProps {
  icon: AuthSceneIconKey;
  /** What happened, or the state reached. One line. */
  title: string;
  /** The figure, where there is one — "₦24,500". Given its own weight. */
  value?: string;
  /** One short clause under the title. */
  detail?: string;
  /** Tints the icon tile only. The card body is neutral glass. */
  tone?: AuthOverlayTone;
  /** The overhanging corner mark, or nothing. */
  badge?: AuthOverlayBadge;
  /** Merged last, so the overlay layer can hand down the entrance opacity. */
  className?: string;
}

/**
 * Tone chrome for the ICON TILE, and nothing else.
 *
 * This is the whole of the tone system now, and the narrowing is deliberate.
 * The previous cards tinted their entire body — `bg-success-surface`,
 * `bg-brand-50` — which on three already-colourful editorial renders made the
 * panel read as a scatter of coloured stickers. Semantic colour is now a 40px
 * tile and a 20px badge; the card itself is neutral glass over whatever the
 * artwork is doing.
 *
 * Complete literal strings, never a composed `bg-${tone}-surface`: the JIT only
 * keeps classes it can see, so a composed one compiles to nothing and the tile
 * renders untinted. `Badge` records the same lesson for the same reason.
 */
const TONE: Record<AuthOverlayTone, string> = {
  brand: "bg-brand-100 text-brandDeep",
  success: "bg-success-surface text-success-foreground",
  neutral: "bg-surface-muted text-foreground-secondary",
};

/**
 * One floating element on the auth scene panel: a thing that happened, or a
 * state now reached.
 *
 * ## Why this replaced two components
 *
 * `AuthEventCard` and `AuthStatusCard` differed in their tone map and in
 * whether the second line was called `metadata` or `description`. Once the body
 * became one neutral material, nothing was left to tell them apart — they
 * rendered the same box with the same slots — so they are one component with an
 * optional `value`. The `event`/`status` distinction survives where it is real:
 * in the data, where it decides the badge and the copy.
 *
 * ## Not built on `Surface`
 *
 * `Surface` is the canonical bordered container and its base is
 * `border border-outline rounded-card bg-surface p-4`. A glass card overrides
 * the background, the border and the padding, which leaves `rounded-card` and
 * the fact that it is a `<div>`. Worse, `cn` is tailwind-merge and tailwind-merge
 * does not know a plugin utility like `.glass` conflicts with `bg-surface`, so
 * BOTH background declarations would survive into the class attribute and the
 * winner would be Tailwind's internal sort order — decided silently, and
 * differently if that order ever changes. For the one property this whole
 * redesign hinges on, that is not acceptable.
 *
 * ## Decorative and inert
 *
 * `pointer-events-none` here; `aria-hidden` on the overlay layer above, because
 * this component cannot honestly claim an attribute it does not own.
 */
export default function AuthOverlayCard({
  icon,
  title,
  value,
  detail,
  tone = "neutral",
  badge,
  className,
}: AuthOverlayCardProps) {
  const Icon = SCENE_ICONS[icon];
  const mark = badge ? SCENE_BADGES[badge] : undefined;

  return (
    <div
      className={cn(
        // `relative` so the badge can overhang; nothing here may gain
        // `overflow-hidden` or the overhang clips.
        "glass pointer-events-none relative flex w-fit items-center gap-2.5 rounded-card p-2.5 shadow-card",
        className
      )}>
      {mark && (
        // Overhangs the corner by 8px, positioned with `left`/`top` rather than
        // a transform — `.scene-anchor-*` owns `transform` on the wrapper above
        // and the entrance owns `translate`, and this must not compete with
        // either. `ring-surface` separates it from whatever is behind.
        <span
          className={cn(
            "absolute -left-2 -top-2 grid size-6 place-items-center rounded-full ring-2 ring-surface",
            mark.chrome
          )}>
          <mark.Icon size={14} />
        </span>
      )}

      <span className={cn("grid size-10 shrink-0 place-items-center rounded-field", TONE[tone])}>
        <Icon size={20} />
      </span>

      {/* TWO ROWS, not three columns — and this is what makes the mobile
          composition possible rather than a styling preference.

          The value used to be a third column pushed right by `ml-auto`, so a
          card's natural width was tile + title + value on one line: 261px for
          "New collection / 12 products". Two of those cannot sit in a 390px
          band without colliding, which is why the secondary card was being
          hidden there. Moving the value under the title makes the width the
          WIDER OF TWO SHORT ROWS instead of the sum of everything — about
          200px for the same content — and three elements fit.

          It is also the reference's own anatomy: a bold title, then a row with
          the detail on the left and the figure on the right. */}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body font-semibold text-foreground-primary">{title}</span>

        {(detail || value) && (
          <span className="flex items-baseline gap-3">
            {/* `foreground-secondary`, never `foreground-muted`: muted measures
                2.2:1 on this glass over the darkest patch a card can land on. */}
            {detail && (
              <span className="truncate text-body-sm text-foreground-secondary">{detail}</span>
            )}
            {/* `ml-auto` so the figure sits right whether or not there is a
                detail beside it. */}
            {value && (
              <span className="ml-auto shrink-0 text-body font-semibold tabular-nums text-foreground-primary">
                {value}
              </span>
            )}
          </span>
        )}
      </span>

    </div>
  );
}
