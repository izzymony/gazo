import React from "react";

/**
 * Test stub for @hugeicons/react.
 *
 * That package is ESM-only. Under @swc/jest's CJS output it resolves to an
 * empty module, so `HugeiconsIcon` is undefined and ANY component rendering a
 * real icon dies with "Element type is invalid". The icon module itself is
 * fine — all 91 exports resolve — so only the renderer needs stubbing, which
 * lets components and specimens use the real icon library in tests instead of
 * hand-rolled fakes.
 */
export const HugeiconsIcon = ({
  size,
  className,
  ...rest
}: {
  size?: number | string;
  className?: string;
  [key: string]: unknown;
}) => <svg data-testid="icon" width={size} height={size} className={className} {...rest} />;

export default HugeiconsIcon;
