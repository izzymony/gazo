import { cn } from "@vibaar/utils";
import Surface from "../common/Surface";
import { SCENE_ICONS } from "./sceneIcons";
import type { AuthOverlayTone, AuthSceneIconKey } from "./authScene";

export interface AuthEventCardProps {
  icon: AuthSceneIconKey;
  /** What happened — "New order", "Delivered". */
  title: string;
  /** The number, where there is one — "₦24,500". Given its own weight. */
  value?: string;
  /** Supporting detail — "2 items", "Buyer confirmed". */
  metadata?: string;
  tone?: AuthOverlayTone;
  className?: string;
}

/**
 * Tone chrome. Complete literal strings, never `bg-${tone}-surface`: a
 * composed class is invisible to Tailwind's JIT and the card would render
 * untinted. `Badge` records the same lesson for the same reason.
 *
 * `brand` does not follow the tone-role shape the status colours do — there is
 * no `brand-surface`/`brand-border` — so it uses the sanctioned recipe from
 * Badge: a brand-50 ground with brandDeep text. Never `text-white` on
 * `bg-brand`, which is 1.28:1.
 */
const TONE: Record<AuthOverlayTone, { surface: string; icon: string }> = {
  brand: { surface: "border-brand-200", icon: "text-brandDeep" },
  success: { surface: "border-success-border", icon: "text-success-foreground" },
  neutral: { surface: "border-outline", icon: "text-foreground-secondary" },
};

/**
 * A thing that just happened, with a number attached.
 *
 * Built ON `Surface` rather than beside it — Surface owns the border, radius,
 * background and the fact that a non-interactive card is a `<div>`. Only the
 * padding and the border tone are overridden here, and `cn` resolves those.
 *
 * NOT built on `ListItem`, though its slots look like a match. ListItem is a
 * list-navigation row: `py-3`, no horizontal padding by design, a 40–56px
 * leading slot and a trailing slot aligned for tap targets. Forcing this into
 * it would mean redundant padding and a row built for a semantic it does not
 * have. These are decorative storytelling, not rows you can activate.
 *
 * Decorative and inert. `pointer-events-none` is applied here, so the card
 * cannot be clicked, hovered or focused wherever it is used, and there is no
 * `onClick` prop to pass — Surface would turn it into a real <button>.
 *
 * `aria-hidden` is applied by `AuthSceneOverlay`, one level up, because it
 * belongs to the whole decorative layer rather than to each card: the caption's
 * real headline carries the meaning, and a screen reader should not read out
 * fake order figures. It is not set here because `Surface` forwards `className`
 * and nothing else — claiming it on this component would be a comment the code
 * does not keep.
 */
export default function AuthEventCard({
  icon,
  title,
  value,
  metadata,
  tone = "neutral",
  className,
}: AuthEventCardProps) {
  const Icon = SCENE_ICONS[icon];
  const chrome = TONE[tone];

  return (
    <Surface
      className={cn(
        "pointer-events-none flex w-fit items-center gap-2.5 p-2.5 shadow-card",
        chrome.surface,
        className
      )}>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-field bg-surface-subtle",
          chrome.icon
        )}>
        <Icon size={16} />
      </span>

      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body-sm font-medium text-foreground-primary">
          {title}
        </span>
        {(value || metadata) && (
          <span className="flex items-baseline gap-1.5">
            {value && (
              <span className="truncate text-body font-semibold text-foreground-primary">
                {value}
              </span>
            )}
            {metadata && (
              <span className="truncate text-caption text-foreground-muted">{metadata}</span>
            )}
          </span>
        )}
      </span>
    </Surface>
  );
}
