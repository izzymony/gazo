import { ReactNode } from "react";
import { cn } from "@vibaar/utils";
import { focusRingInset } from "../styles";

interface ListItemProps {
  /** Left visual — an icon badge / avatar. Rendered in a fixed square slot so
   *  every list row (activity, notification, transaction) shares one rhythm. */
  leading?: ReactNode;
  /**
   * Size of that slot. `md` (40px) suits an icon or an avatar; `lg` (56px) is
   * for a product photo, which needs to be legible as a picture.
   *
   * It matters that the slot and its contents agree: the slot is a flex box, so
   * a thumbnail larger than it SHRINKS to the slot's width while keeping its own
   * height — a 56px product photo in the 40px slot rendered 40 wide by 56 tall,
   * squashed horizontally. Sizing the slot is the only way to change it.
   */
  leadingSize?: "md" | "lg";
  /** Primary line. A ReactNode so callers can colour it (e.g. credit/debit). */
  title: ReactNode;
  /** Secondary line (e.g. a message body). */
  subtitle?: ReactNode;
  /** Tertiary line (e.g. a timestamp). */
  meta?: ReactNode;
  /** Right-hand visual — an amount, a chevron, an action. */
  trailing?: ReactNode;
  /**
   * How `trailing` sits against the text block. `start` (default) lines it up
   * with the title, which is what an amount or a timestamp wants. `center`
   * centres it against the whole block — what an ACTION wants: a "View store"
   * button beside a two-line name/category read as floating above the row when
   * it was pinned to the first line.
   */
  trailingAlign?: "start" | "center";
  /** Small unread dot pinned to the leading badge. */
  showDot?: boolean;
  /**
   * Text announced when `showDot` is set. The dot alone is purely visual, so an
   * unread row read identically to a read one.
   */
  dotLabel?: string;
  /** Render wrapped in an <li> for use inside `List`. */
  asListItem?: boolean;
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
  leadingSize = "md",
  title,
  subtitle,
  meta,
  trailing,
  trailingAlign = "start",
  showDot,
  dotLabel = "Unread",
  asListItem = false,
  onClick,
  ariaLabel,
  className,
}: ListItemProps) {
  // An interactive row renders a real <button>. It was a <div onClick>, which
  // is not focusable, exposes no role and ignores Enter and Space — the same
  // defect Surface and the auth CTAs had.
  const Element = onClick ? "button" : "div";

  const row = (
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
        <div
          className={cn(
            "relative flex flex-shrink-0 items-center justify-center overflow-hidden",
            leadingSize === "lg" ? "h-14 w-14" : "h-10 w-10"
          )}>
          {leading}
          {showDot && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-brand rounded-full border-2 border-white">
              <span className="sr-only">{dotLabel}</span>
            </span>
          )}
        </div>
      )}

      {trailingAlign === "center" ? (
        // The trailing control sits beside the WHOLE text block, vertically
        // centred against it, rather than inside the title's own row.
        <div className="flex flex-1 min-w-0 items-center justify-between gap-3">
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <div className="min-w-0 text-body text-foreground-primary line-clamp-1">{title}</div>
            {subtitle && (
              <p className="text-body-sm text-foreground-secondary line-clamp-2">{subtitle}</p>
            )}
            {meta && <p className="text-caption text-foreground-muted">{meta}</p>}
          </div>
          {trailing && <div className="flex-shrink-0">{trailing}</div>}
        </div>
      ) : (
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
      )}
    </Element>
  );

  return asListItem ? <li>{row}</li> : row;
}
