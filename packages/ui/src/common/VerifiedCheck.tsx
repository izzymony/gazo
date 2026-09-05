import { VerifiedBadge } from "../icons";
import { cn } from "@vibaar/utils";

/**
 * Buyer-facing seller trust mark (KYC1 §5). Renders a trust-blue verified check
 * ONLY when the seller is KYC-approved (`verified`). Trust-blue (`text-info-foreground`) is
 * deliberate — the app's brand red is its action/sale colour, blue reads as
 * "verified" universally.
 */
export default function VerifiedCheck({
  verified,
  size = 16,
  className = "",
}: {
  verified?: boolean;
  size?: number;
  className?: string;
}) {
  if (!verified) return null;
  return (
    <span
      title="Verified seller"
      aria-label="Verified seller"
      className={cn("inline-flex shrink-0", className)}>
      <VerifiedBadge size={size} className="text-info-foreground" />
    </span>
  );
}
