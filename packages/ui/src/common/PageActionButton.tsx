"use client";

import React from "react";
import Button from "./Button";
import { cn } from "@vibaar/utils";

type Kind = "primary" | "secondary" | "link";

const VARIANT: Record<Kind, "filled" | "bordered" | "link"> = {
  primary: "filled",
  secondary: "bordered",
  link: "link",
};

export interface PageActionButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "variant" | "fullWidth" | "size"> {
  /** primary = the commit · secondary = cancel/back · link = a text action. */
  kind?: Kind;
}

/**
 * PageActionButton — a page-level action that is full-width in the mobile bar
 * and hugs its content in a desktop header, inline row or dialog footer.
 *
 * A SEPARATE COMPONENT RATHER THAN A `Button` VARIANT. The obvious move was
 * `fullWidth="responsive"` on Button, which was rejected for good reason: it
 * turns a boolean-named prop into a boolean/string hybrid, and it puts
 * page-layout breakpoint behaviour inside a primitive that is also used for
 * buttons inside cards, sheets and rows that have nothing to do with page
 * actions. `Button.fullWidth` stays `true | false`.
 *
 * ONE NODE, NOT TWO. The same element is the mobile bar's full-width CTA and
 * the desktop action; only width and top-margin change. That is what keeps
 * loading, disabled, validation and focus in one place — there is no second
 * copy to drift out of sync, and no duplicate accessible name.
 *
 * `size="md"` is 44px, which fits the 48px desktop row with 2px either side, so
 * the node is the SAME SIZE in both positions.
 *
 * The 160–200px minimum belongs to INLINE actions and is applied by the shell's
 * desktop fallback, not here: header actions stay compact, dialog buttons are
 * intrinsic, and a panel action fills its bounded panel.
 */
export default function PageActionButton({
  kind = "primary",
  className,
  ...rest
}: PageActionButtonProps) {
  return (
    <Button
      {...rest}
      variant={VARIANT[kind]}
      size="md"
      fullWidth={false}
      className={cn(
        // Mobile keeps the bar's historic geometry verbatim — `w-full mt-4` is
        // what `fullWidth` emitted, restated here so the desktop half can be
        // added without making Button's own prop responsive.
        kind === "link" ? "w-full lg:w-fit" : "w-full mt-4 lg:w-fit lg:mt-0",
        className
      )}
    />
  );
}
