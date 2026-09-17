import { cn } from "@vibaar/utils";

export interface AuthSceneChipProps {
  /** One phrase. "Saved", "Checkout safely". Never a sentence. */
  label: string;
  /** Merged last, so the overlay layer can hand down the entrance opacity. */
  className?: string;
}

/**
 * The composition's smallest object: one phrase on a glass pill.
 *
 * ## Why this exists when `Badge` is the consolidated chip
 *
 * `AuthStatusCard` used to argue the opposite — that a short tinted line is a
 * Badge and a third chip component would be exactly the drift Badge's own
 * docblock warns about. That was right, and it stopped being right when the
 * cards became a MATERIAL rather than a tint.
 *
 * Badge is a tinted surface with a hairline border and no relationship to what
 * is behind it. This samples and blurs the artwork. Two objects sitting on one
 * photograph, made of two different materials, read as a rendering fault rather
 * than as a hierarchy — and making Badge glass would mean widening a primitive
 * used across the whole app for one decorative panel, which is the drift its
 * docblock actually warns about.
 *
 * So the justification is the material, not the shape. It is also why there is
 * still no fourth variant: anything needing an icon, a figure or a second line
 * is an `AuthOverlayCard`.
 */
export default function AuthSceneChip({ label, className }: AuthSceneChipProps) {
  return (
    <span
      className={cn(
        "glass pointer-events-none block w-fit rounded-pill px-3 py-1.5 text-body-sm font-medium text-foreground-primary shadow-card",
        className
      )}>
      {label}
    </span>
  );
}
