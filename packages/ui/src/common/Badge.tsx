import { ReactNode } from "react";
import { cn } from "@vibaar/utils";

/**
 * Semantic tones MEAN something; categorical hues only DISTINGUISH.
 *
 * Reach for a semantic tone whenever one applies — a failed payment is `error`
 * whatever screen it is on. The categorical hues exist for sets that need to be
 * told apart without implying success or failure, which in this app is the
 * order timeline: "in transit" is not a warning, it is simply a different stage
 * from "out for delivery".
 */
export type BadgeTone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "teal"
  | "orange"
  | "purple"
  | "sky"
  | "indigo"
  | "emerald";

export type BadgeSize = "sm" | "md";

/**
 * `soft` is the chip — tinted surface, hairline border. `solid` is the filled
 * counterpart, for a mark that has to win against a photo or a busy row (a
 * discount flag on a product image, an unread count). `plain` is the same tone
 * as bare text with no container, for inline meaning inside a sentence or a
 * metric (a trend percentage next to its figure).
 */
export type BadgeVariant = "soft" | "solid" | "plain";

/**
 * Tone -> token classes. Written as complete literal strings on purpose:
 * Tailwind's JIT only keeps classes it can see in the source, so a composed
 * `bg-${tone}-surface` would compile to nothing and the badge would render
 * untinted. Every value here is a token — no palette classes, no hex.
 */
const TONE: Record<BadgeTone, { soft: string; solid: string; plain: string; dot: string }> = {
  neutral: {
    soft: "bg-surface-subtle text-foreground-secondary border-outline",
    solid: "bg-surface-inverse text-foreground-inverse",
    plain: "text-foreground-secondary",
    dot: "bg-foreground-muted",
  },
  /**
   * The brand marker — "Default", "Selected", a discount flag. Brand yellow
   * carries `brandInk` (near-black), never white: white on the brand is
   * 1.28:1. `brandDeep` is the brand AS text on a light surface, where the
   * yellow itself would be invisible.
   */
  brand: {
    soft: "bg-brand-50 text-brandDeep border-brand-200",
    solid: "bg-brand text-brandInk",
    plain: "text-brandDeep",
    dot: "bg-brandDeep",
  },
  info: {
    soft: "bg-info-surface text-info-foreground border-info-border",
    solid: "bg-info-foreground text-white",
    plain: "text-info-foreground",
    dot: "bg-info-foreground",
  },
  success: {
    soft: "bg-success-surface text-success-foreground border-success-border",
    solid: "bg-success-foreground text-white",
    plain: "text-success-foreground",
    dot: "bg-success-foreground",
  },
  warning: {
    soft: "bg-warning-surface text-warning-foreground border-warning-border",
    solid: "bg-warning-foreground text-white",
    plain: "text-warning-foreground",
    dot: "bg-warning-foreground",
  },
  error: {
    soft: "bg-error-surface text-error-foreground border-error-border",
    solid: "bg-error-foreground text-white",
    plain: "text-error-foreground",
    dot: "bg-error-foreground",
  },
  teal: {
    soft: "bg-hue-teal-surface text-hue-teal-foreground border-hue-teal-border",
    solid: "bg-hue-teal-foreground text-white",
    plain: "text-hue-teal-foreground",
    dot: "bg-hue-teal-foreground",
  },
  orange: {
    soft: "bg-hue-orange-surface text-hue-orange-foreground border-hue-orange-border",
    solid: "bg-hue-orange-foreground text-white",
    plain: "text-hue-orange-foreground",
    dot: "bg-hue-orange-foreground",
  },
  purple: {
    soft: "bg-hue-purple-surface text-hue-purple-foreground border-hue-purple-border",
    solid: "bg-hue-purple-foreground text-white",
    plain: "text-hue-purple-foreground",
    dot: "bg-hue-purple-foreground",
  },
  sky: {
    soft: "bg-hue-sky-surface text-hue-sky-foreground border-hue-sky-border",
    solid: "bg-hue-sky-foreground text-white",
    plain: "text-hue-sky-foreground",
    dot: "bg-hue-sky-foreground",
  },
  indigo: {
    soft: "bg-hue-indigo-surface text-hue-indigo-foreground border-hue-indigo-border",
    solid: "bg-hue-indigo-foreground text-white",
    plain: "text-hue-indigo-foreground",
    dot: "bg-hue-indigo-foreground",
  },
  emerald: {
    soft: "bg-hue-emerald-surface text-hue-emerald-foreground border-hue-emerald-border",
    solid: "bg-hue-emerald-foreground text-white",
    plain: "text-hue-emerald-foreground",
    dot: "bg-hue-emerald-foreground",
  },
};

/** `chip` covers both container variants (soft and solid share their metrics). */
const SIZE: Record<BadgeSize, { chip: string; plain: string; dot: string }> = {
  sm: { chip: "text-caption px-2 py-[1px]", plain: "text-caption", dot: "w-2 h-2" },
  md: { chip: "text-body-sm px-2.5 py-0.5", plain: "text-body-sm", dot: "w-2.5 h-2.5" },
};

export interface BadgeProps {
  children: ReactNode;
  /** Semantic meaning, or a categorical hue for sets that only need telling apart. */
  tone?: BadgeTone;
  size?: BadgeSize;
  /** `soft` = tinted chip (default), `solid` = filled, `plain` = bare toned text. */
  variant?: BadgeVariant;
  /** Leading status dot, tinted to match the tone. */
  dot?: boolean;
  /** Leading glyph. Pass an already-sized icon; the badge only positions it. */
  icon?: ReactNode;
  /**
   * Extra context announced to screen readers but not shown — for when the
   * visible label is not self-describing out of context ("12%" needs to say
   * whether it is a rise or a fall, since colour alone does not carry that).
   */
  srLabel?: string;
  className?: string;
}

/**
 * Badge — the one origin for every small tone-carrying label.
 *
 * This replaces four separate components that were each a single hardcoded
 * instance of the same idea: `StoreStatusBadge` (a dot plus the literal string
 * "Live"), `ComingSoonPill` (the literal string "Soon"), `TrendIndicator`
 * (toned text), and the app's own `StatusBadge`, which was the only one with a
 * real variant system and was the one NOT in the design system.
 *
 * They fragmented because there was no shared tone vocabulary to reach for:
 * each carried its own tone-to-colour mapping, so four independent and
 * mutually inconsistent colour systems grew — some drawing on tokens, some on
 * raw palette classes. `TONE` above is now the single mapping, and the tokens
 * behind it are contrast-checked at build time.
 *
 * Domain wrappers (order status, store status) stay thin: they own the
 * value-to-tone decision, and Badge owns how a tone looks.
 */
export default function Badge({
  children,
  tone = "neutral",
  size = "sm",
  variant = "soft",
  dot = false,
  icon,
  srLabel,
  className,
}: BadgeProps) {
  const toneStyles = TONE[tone] ?? TONE.neutral;
  const sizeStyles = SIZE[size] ?? SIZE.sm;

  return (
    <span
      className={cn(
        // gap is unconditional: it only acts between children, so it is a
        // no-op on a text-only badge and the spacing for a dot, an icon, or
        // a trailing node (the TrendIndicator arrow) without the caller
        // knowing which slot it landed in.
        "inline-flex w-fit items-center gap-1 whitespace-nowrap leading-none",
        variant === "soft" && cn("rounded-pill border border-solid", toneStyles.soft, sizeStyles.chip),
        variant === "solid" && cn("rounded-pill font-medium", toneStyles.solid, sizeStyles.chip),
        variant === "plain" && cn(toneStyles.plain, sizeStyles.plain),
        className
      )}>
      {dot && (
        <span
          aria-hidden="true"
          className={cn("rounded-full flex-shrink-0", toneStyles.dot, sizeStyles.dot)}
        />
      )}
      {icon}
      {children}
      {srLabel && <span className="sr-only">{srLabel}</span>}
    </span>
  );
}
