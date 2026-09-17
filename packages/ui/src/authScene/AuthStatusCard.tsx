import { cn } from "@vibaar/utils";
import Surface from "../common/Surface";
import { SCENE_ICONS } from "./sceneIcons";
import type { AuthSceneIconKey } from "./authScene";

export interface AuthStatusCardProps {
  icon: AuthSceneIconKey;
  /** The state reached — "Payment secured", "Store is live". */
  title: string;
  /** One short clause of reassurance. Optional; two lines is already a lot. */
  description?: string;
  /** Only the two affirmative tones. A status card never reports a failure. */
  tone: "brand" | "success";
  className?: string;
}

/**
 * Complete literal strings — a composed `bg-${tone}-surface` compiles to
 * nothing under the JIT and the card renders untinted.
 *
 * A status card is tinted where an event card is white: an event is a fact,
 * a status is a reassurance, and the tint is what carries that difference
 * without another word of copy.
 */
const TONE = {
  brand: {
    surface: "border-brand-200 bg-brand-50",
    icon: "text-brandDeep",
    title: "text-brandDeep",
  },
  success: {
    surface: "border-success-border bg-success-surface",
    icon: "text-success-foreground",
    title: "text-success-foreground",
  },
} as const;

/**
 * A state the seller is now in.
 *
 * Same substrate as `AuthEventCard` — `Surface` for the border, radius and the
 * `<div>`-when-not-interactive rule — and the same refusal to use `ListItem`,
 * which is a navigation row with a tap-target geometry this does not want.
 *
 * Deliberately NOT `Badge`, and that needs saying because Badge is the
 * consolidated chip and adding a fifth one would be the exact drift its
 * docblock warns about. Badge is a pill of one line: `rounded-pill`, text-only,
 * `py-[1px]`. This needs a title AND an optional description on a tinted card,
 * which is a different shape, not a bigger Badge. Where the composition only
 * needs one short tinted line, the right answer is to use Badge and not this —
 * which is why no third chip component exists here.
 *
 * Decorative and inert, as the event card is: `pointer-events-none` here, and
 * `aria-hidden` on the overlay layer above rather than on each card — Surface
 * forwards only `className`, so this component cannot honestly claim it.
 */
export default function AuthStatusCard({
  icon,
  title,
  description,
  tone,
  className,
}: AuthStatusCardProps) {
  const Icon = SCENE_ICONS[icon];
  const chrome = TONE[tone];

  return (
    <Surface
      className={cn(
        "pointer-events-none flex w-fit items-start gap-2.5 p-2.5 shadow-card",
        chrome.surface,
        className
      )}>
      <span aria-hidden="true" className={cn("mt-px shrink-0", chrome.icon)}>
        <Icon size={16} />
      </span>

      <span className="flex min-w-0 flex-col">
        <span className={cn("truncate text-body-sm font-medium", chrome.title)}>{title}</span>
        {description && (
          <span className="text-caption text-foreground-secondary">{description}</span>
        )}
      </span>
    </Surface>
  );
}
