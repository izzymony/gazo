import { ReactNode } from "react";
import { cn } from "@vibaar/utils";
import IconButton from "./IconButton";
import { BiArrowBack } from "../icons";

export interface HeaderRowProps {
  /** Renders the standard back control in the leading slot. */
  onBack?: () => void;
  /** Replaces the leading slot outright. Wins over `onBack`. */
  leading?: ReactNode;
  /**
   * A string is rendered as the page heading and gets the responsive type step
   * plus truncation. Any other node is rendered AS GIVEN — see the note below.
   */
  title?: ReactNode;
  /** Right-hand slot: a menu, a bell, a page action group. */
  trailing?: ReactNode;
  className?: string;
}

/**
 * HeaderRow — the row's geometry and typography, owned in one place.
 *
 * Extracted so `Header` and `PageHeaderBand` cannot drift into two desktop
 * header systems: one at 36px/16px and one at 48px/24px. Placement is the
 * consumer's concern; what a header row IS lives here.
 *
 * DESKTOP ADDITIONS ARE `lg:`-PREFIXED, WITHOUT EXCEPTION. Mobile geometry is
 * an acceptance criterion of this work, and two of these would have broken it
 * unprefixed: `shrink-0` has a live effect today (the analytics header puts a
 * date string in `trailing`, which currently compresses on a narrow phone), and
 * a `gap` would separate multi-control groups that today sit flush. If mobile
 * trailing spacing is ever wanted, it is its own change, not a rider on this.
 *
 * NODE TITLES ARE LEFT BARE. A string title gets `flex-1 min-w-0 truncate` and
 * steps up at `lg`; a node does not. Wrapping one would stretch `BrandLogo` on
 * the auth screens and double up `ChatThreadHeader`'s own flex. The visible
 * consequence is real and accepted: a node-title header keeps a 16px desktop
 * title while string-title pages move to 24px.
 */
export default function HeaderRow({
  onBack,
  leading,
  title,
  trailing,
  className,
}: HeaderRowProps) {
  return (
    <div
      className={cn(
        // 36px on mobile, unchanged. `min-h` rather than `h` at lg so a wrapped
        // trailing group grows the row instead of overflowing it.
        "flex flex-row items-center min-w-0 h-9 lg:h-auto lg:min-h-12",
        className
      )}>
      {leading ??
        (onBack && (
          <IconButton icon={BiArrowBack} label="Go back" onClick={onBack} className="mr-1 -ml-2" />
        ))}

      {typeof title === "string" ? (
        // No explicit line-height: each type token carries its own (body-lg
        // 16/24, h1 24/30). The old `leading-[18px]` was an arbitrary value whose
        // only job was fitting a 36px row — which `items-center` already does,
        // and which measured identically with it removed. See the commit.
        <h3 className="font-medium text-body-lg lg:text-h1 text-foreground-primary flex-1 min-w-0 truncate">
          {title}
        </h3>
      ) : (
        title
      )}

      {/* `ml-auto` pins actions right on screens with no title to push them
          there; harmless when a title already fills the row. */}
      {trailing && (
        <div className="ml-auto flex flex-row items-center lg:gap-3 lg:shrink-0 lg:pl-3">
          {trailing}
        </div>
      )}
    </div>
  );
}
