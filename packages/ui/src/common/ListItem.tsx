import { ReactNode } from "react";
import { cn } from "@vibaar/utils";
import { focusRingInset } from "../styles";

interface ListItemProps {
  /** Left visual — an icon badge / avatar. Rendered in a fixed 40px slot so
   *  every list row (activity, notification, transaction) shares one rhythm. */
  leading?: ReactNode;
  /** Primary line. A ReactNode so callers can colour it (e.g. credit/debit). */
  title: ReactNode;
  /** Secondary line (e.g. a message body). */
  subtitle?: ReactNode;
  /** Tertiary line (e.g. a timestamp). */
  meta?: ReactNode;
  /** Right-hand visual — an amount, a chevron, an action. Top-aligned with title. */
  trailing?: ReactNode;
  /** Small unread dot pinned to the leading badge. */
  showDot?: boolean;
  /**
   * Text announced when `showDot` is set. The dot alone is purely visual, so an
   * unread row read identically to a read one.
   */
  dotLabel?: string;
  onClick?: () => void;
  /** Accessible name when the row is interactive and `title` is not a string. */
  ariaLabel?: string;
  className?: string;
}

/**
 * ListItem — the single information-list row primitive.
 *
 * One `[leading] [title / subtitle / meta] [trailing]` skeleton behind every
 * list row in the app (recent activities, notifications, transactions). It owns
 * the shared concerns that used to drift per-copy: the 40px leading slot, the
 * title/subtitle/meta type scale + tokens, vertical rhythm, and the tap state.
 *
 * It deliberately owns NO horizontal padding — the page/section provides `px`
 * (same rule as FilterBar), so rows align to content edges on every screen.
 */
export default function ListItem({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  showDot,
  dotLabel = "Unread",
  onClick,
  ariaLabel,
  className,
}: ListItemProps) {
  // An interactive row renders a real <button>. It was a <div onClick>, which
  // is not focusable, exposes no role and ignores Enter and Space — the same
  // defect Surface and the auth CTAs had.
  const Element = onClick ? "button" : "div";

  return (
    <Element
      {...(onClick
        ? { type: "button" as const, onClick, "aria-label": ariaLabel }
        : {})}
      className={cn(
        "flex items-start gap-3 py-3 bg-surface transition-colors w-full",
        onClick && cn("cursor-pointer text-left hover:bg-surface-subtle", focusRingInset),
        className
      )}>
      {leading && (
        <div className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center">
          {leading}
          {showDot && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-brand rounded-full border-2 border-white">
              <span className="sr-only">{dotLabel}</span>
            </span>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 text-body text-foreground-primary line-clamp-1">{title}</div>
          {trailing && <div className="flex-shrink-0">{trailing}</div>}
        </div>
        {subtitle && (
          <p className="text-body-sm text-foreground-secondary line-clamp-2">{subtitle}</p>
        )}
        {meta && <p className="text-caption text-foreground-muted">{meta}</p>}
      </div>
    </Element>
  );
}
