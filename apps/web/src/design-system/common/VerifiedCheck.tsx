import { VerifiedBadge } from "@/design-system/icons";

/**
 * Buyer-facing seller trust mark (KYC1 §5). Renders a trust-blue verified check
 * ONLY when the seller is KYC-approved (`verified`). Trust-blue (`text-info`) is
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
      className={`inline-flex shrink-0 ${className}`}>
      <VerifiedBadge size={size} className="text-info" />
    </span>
  );
}
