import React from "react";
import { cn } from "@vibaar/utils";

export type H1Props = React.HTMLAttributes<HTMLHeadingElement>;

/** Semantic page heading using the system h1 type and foreground tokens. */
const H1 = React.forwardRef<HTMLHeadingElement, H1Props>(function H1(
  { children, className, ...props },
  ref
) {
  return (
    <h1
      ref={ref}
      className={cn(
        "text-center text-h1 font-medium text-foreground-primary",
        className
      )}
      {...props}>
      {children}
    </h1>
  );
});

export default H1;
