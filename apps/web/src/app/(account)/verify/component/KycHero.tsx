import type { IconProps } from "@vibaar/ui/icons";
import { VerifiedBadge } from "@vibaar/ui/icons";

/**
 * KycHero — the teal "ripple" illustration for the person/identity + status
 * states (KYC1 §7): intro, processing, awaiting, verified. A ripple backdrop
 * (translucent teal fills + mixBlendMode:multiply for the soft glow) + accent
 * dots + a swappable HugeIcon subject + an optional tokenised status badge.
 * `size` scales it; `pulse` animates the rings for processing.
 *
 * The document/ID states use a separate, cleaner card illustration (IdCardArt
 * in KycFlow) — a ripple isn't the right metaphor for "which ID".
 */

const RING_SCALES = [1, 0.81, 0.58];
const RINGS = [{ border: "#D5FFFD" }, { fill: "#E9FFFE" }, { fill: "#A8FFFC" }];
const CENTER = "#11CBC6";

// Scattered accent dots: [topPct, leftPct, colour].
const DOTS: [number, number, string][] = [
  [8, 26, "#FFCC00"],
  [12, 74, "#FFA24C"],
  [46, 96, "#00C99F"],
  [80, 6, "#00C99F"],
  [90, 68, "#FFA100"],
  [58, 2, "#FFA24C"],
];

type Badge = { label: string; tone: "brand" | "warning" };

export default function KycHero({
  icon: Icon,
  badge,
  pulse = false,
  size = 208,
}: {
  icon: React.ComponentType<IconProps>;
  badge?: Badge;
  pulse?: boolean;
  size?: number;
}) {
  const center = Math.round(size * 0.46);

  return (
    <div className="relative mx-auto" style={{ height: size, width: size }}>
      {/* ripple rings (centred) */}
      {RING_SCALES.map((scale, i) => {
        const r = RINGS[i];
        return (
          <span
            key={i}
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              pulse ? "motion-safe:animate-pulse" : ""
            }`}
            style={{
              height: size * scale,
              width: size * scale,
              backgroundColor: r.fill,
              border: r.border ? `1px solid ${r.border}` : undefined,
              mixBlendMode: r.fill ? "multiply" : undefined,
            }}
          />
        );
      })}

      {/* centre subject */}
      <span
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{ height: center, width: center, backgroundColor: CENTER }}>
        <Icon size={Math.round(size * 0.2)} className="text-white" />
      </span>

      {/* accent dots */}
      {DOTS.map(([top, left, color], i) => (
        <span
          key={i}
          className="absolute h-2.5 w-2.5 rounded-full"
          style={{ top: `${top}%`, left: `${left}%`, backgroundColor: color }}
        />
      ))}

      {/* contextual status badge */}
      {badge && (
        <span
          className={`absolute bottom-9 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-4 py-1.5 shadow-pop ${
            badge.tone === "brand" ? "bg-brand" : "bg-warning-strong"
          }`}>
          {badge.tone === "brand" && <VerifiedBadge size={14} className="text-white" />}
          <span className="whitespace-nowrap text-body-sm font-medium text-white">
            {badge.label}
          </span>
        </span>
      )}
    </div>
  );
}
