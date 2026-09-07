import { ReactNode } from "react";
import { cn } from "@vibaar/utils";
import IconButton from "./IconButton";
import { BiArrowBack } from "../icons";

export interface HeaderProps {
  /**
   * Renders the standard back control in the leading slot. This is what 53 of
   * the 59 call sites want, so it stays a handler rather than making every
   * screen construct the same button.
   */
  onBack?: () => void;
  /** Replaces the leading slot outright, for the rare screen that needs
   *  something other than a back button there. Wins over `onBack`. */
  leading?: ReactNode;
  /**
   * A string is rendered as the page heading. Any other node is rendered as
   * given — which is how a chat thread puts an avatar beside a name, and how
   * the auth screens show the brand mark. The old `customText: string` could
   * not express either, so screens that needed them forked the whole header.
   */
  title?: ReactNode;
  /** Right-hand slot: a menu, a notification bell, actions. */
  trailing?: ReactNode;
  /** Progress rendered beneath the bar — `StepNavigation` on wizard flows. */
  progress?: ReactNode;
  className?: string;
}

/**
 * Header — the app's page header.
 *
 * Five slots replacing 29 props, 16 of which no caller ever set. Behind those
 * dead props sat a whole in-header tab bar, a pill bar and two search modes,
 * all unreachable, one wired to the wrong handler. Their removal is also what
 * let this move into the design system at all: the only thing coupling it to
 * the app was a `SearchInput` import that existed solely for dead `showInput`.
 *
 * POSITIONING CONTRACT — do not change without changing PageShell.
 * The outer wrapper is `absolute` on mobile and `sticky` on desktop, and
 * `PageShell` offsets its content by `mt-16 lg:mt-4` on the assumption that the
 * header takes itself out of flow. Alter these classes and 54 pages shift. The
 * test suite asserts them exactly for that reason.
 */
export default function Header({
  onBack,
  leading,
  title,
  trailing,
  progress,
  className,
}: HeaderProps) {
  return (
    <div
      className={cn(
        "absolute lg:sticky lg:top-0 bg-surface w-full flex flex-col z-sticky",
        className
      )}>
      {/* Desktop max-width wrapper */}
      <div className="w-full lg:max-w-5xl lg:mx-auto pt-3 pb-0 px-4 lg:px-5">
        <div className="flex flex-row items-center bg-surface h-[36px]">
          {leading ??
            (onBack && (
              <IconButton
                icon={BiArrowBack}
                label="Go back"
                onClick={onBack}
                className="mr-1 -ml-2"
              />
            ))}

          {typeof title === "string" ? (
            <h3 className="font-medium text-body-lg text-foreground-primary leading-[18px] flex-1 min-w-0 truncate">
              {title}
            </h3>
          ) : (
            title
          )}

          {/* `ml-auto` pins actions right on screens with no title to push
              them there; harmless when a title already fills the row. */}
          {trailing && <div className="ml-auto flex flex-row items-center">{trailing}</div>}
        </div>

        {progress}
      </div>
    </div>
  );
}
