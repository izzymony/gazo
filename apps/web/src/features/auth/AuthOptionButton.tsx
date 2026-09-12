"use client";

import type { ReactNode } from "react";
import Button from "@vibaar/ui/common/Button";
import { cn } from "@vibaar/utils";

/**
 * The auth entry CTA — "Create my account", "Login to my account", "Continue
 * with Google".
 *
 * This existed four times (signin + signup, each with a mobile and a desktop
 * block) as a styled <div> wrapping a second <div> that carried the onClick.
 * AuthSplitShell collapsed that fork to one tree, so the `layout` prop that
 * selected between the two blocks' sizing went with it — the two sizes are now
 * one responsive class.
 * That shape had three defects, all fixed here by rendering a real Button:
 *
 *   1. Not a button. A clickable <div> is not keyboard focusable, exposes no
 *      button role, and does not respond to Enter or Space.
 *   2. Dead tap zone on mobile. The pill was full-width but the inner clickable
 *      div was `w-[180px]`, so only a narrow centre strip responded. (The
 *      desktop block used `w-full` and was unaffected.)
 *   3. White label on brand yellow. The primary option's <p> carried
 *      `text-white` over `bg-brand` — 1.28:1, the exact combination the token
 *      contract calls unreadable. The filled Button uses brandInk instead.
 */
export type AuthOption = {
  title: string;
  image?: ReactNode;
  type?: string;
  url?: string;
  isPrimary?: boolean;
  isSecondary?: boolean;
};

export default function AuthOptionButton({
  option,
  loading = false,
  onSelect,
}: {
  option: AuthOption;
  loading?: boolean;
  onSelect: (option: AuthOption) => void;
}) {
  return (
    <Button
      onClick={() => onSelect(option)}
      loading={loading}
      loadingText={option.title}
      fullWidth={false}
      // `filled` already carries bg-brand + text-brandInk. `bordered` is the
      // base for both outlined cases; the neutral (social) one overrides the
      // border and text colour, since Button has no neutral-outline variant.
      // Two demonstrated call sites — a variant candidate, not added here.
      variant={option.isPrimary ? "filled" : "bordered"}
      className={cn(
        "w-full rounded-full",
        "h-[52px] text-body font-normal md:h-14 md:text-body-lg md:font-medium",
        option.isSecondary && "md:border-2",
        option.isSecondary && "hover:bg-brand hover:text-brandInk",
        !option.isPrimary &&
          !option.isSecondary &&
          "border-outline text-foreground-primary bg-transparent hover:border-brandDeep hover:bg-transparent"
      )}>
      {option.image}
      <span>{option.title}</span>
    </Button>
  );
}
