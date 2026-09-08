"use client";

import { cn } from "@/lib/utils";

const TABS = ["Spotlights", "Shop"] as const;

/**
 * The Spotlights / Shop switcher that floats over the marketplace hero.
 *
 * Not a header despite the name — it is a two-option toggle, so it renders as
 * a group of real buttons carrying `aria-pressed`. It was a pair of `<div
 * onClick>`: not focusable, no role, and ignoring Enter and Space, so the
 * marketplace could not be switched from the keyboard at all.
 *
 * Its `z-[999999999999999999px]` also did nothing. A length unit on an integer
 * property is invalid, so browsers dropped the declaration and the element fell
 * back to `z-index: auto` — and because the class DOES compile, the drift audit
 * could not see it either. It stacks on the `sticky` token now.
 */
export default function FloatingHeader({
  show,
  setShow,
}: {
  show: string;
  setShow: (val: string) => void;
}) {
  return (
    <div className="w-full flex justify-center items-center gap-5 absolute right-0 left-0 z-sticky">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          aria-pressed={show === tab}
          onClick={() => setShow(tab)}
          className={cn(
            "px-1 pt-4 pb-2 text-center justify-center items-center border-b-2 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40",
            show === tab
              ? "border-b-outline-contrast text-foreground-primary"
              : "border-b-transparent text-foreground-disabled hover:border-b-outline-contrast hover:text-foreground-primary"
          )}>
          {tab}
        </button>
      ))}
    </div>
  );
}
