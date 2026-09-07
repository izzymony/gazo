/**
 * V1's `star-face` chip icon, lifted path-for-path from the landing hero
 * (16x16, four stroked vectors): a face whose eyes are stars.
 *
 * It is local rather than imported because `@vibaar/ui/icons` has no face,
 * smile or emoji glyph — the set is 72 icons of product furniture. The nearest
 * thing was a plain outline star, which is what the eyebrow was wearing and is
 * a different mark entirely. Adding a face to the shared set is the right home
 * for this; that package is under another workstream, so it lives here for now.
 *
 * Strokes are `currentColor`, so the chip's own colour token drives it.
 */
export default function StarFaceIcon({
  className,
  size = 16,
}: {
  readonly className?: string;
  readonly size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      width={size}
    >
      <path d="M14.6667 8.0026C14.6667 11.6845 11.6819 14.6693 8.00004 14.6693C4.31814 14.6693 1.33337 11.6845 1.33337 8.0026M5.66671 1.75568C6.39293 1.4843 7.17917 1.33594 8.00004 1.33594C8.82091 1.33594 9.60717 1.4843 10.3334 1.75568" />
      <path d="M5.01215 3.62477L5.36411 4.33451C5.41211 4.43331 5.54009 4.52808 5.64809 4.54623L6.28601 4.65309C6.69396 4.72165 6.78996 5.02006 6.49599 5.31444L6.00005 5.81448C5.91605 5.89917 5.87006 6.06249 5.89605 6.17943L6.03804 6.79841C6.15003 7.28841 5.89206 7.47794 5.46211 7.22187L4.86417 6.86501C4.75618 6.80047 4.5782 6.80047 4.46821 6.86501L3.87028 7.22187C3.44233 7.47794 3.18235 7.28641 3.29435 6.79841L3.43633 6.17943C3.46233 6.06249 3.41633 5.89917 3.33234 5.81448L2.83639 5.31444C2.54443 5.02006 2.63841 4.72165 3.04637 4.65309L3.6843 4.54623C3.79029 4.52808 3.91827 4.43331 3.96627 4.33451L4.31823 3.62477C4.51021 3.23966 4.82217 3.23966 5.01215 3.62477Z" />
      <path d="M11.6789 3.62477L12.0308 4.33451C12.0788 4.43331 12.2068 4.52808 12.3148 4.54623L12.9528 4.65309C13.3607 4.72165 13.4567 5.02006 13.1627 5.31444L12.6668 5.81448C12.5828 5.89917 12.5368 6.06249 12.5628 6.17943L12.7048 6.79841C12.8168 7.28841 12.5588 7.47794 12.1288 7.22187L11.5309 6.86501C11.4229 6.80047 11.245 6.80047 11.135 6.86501L10.537 7.22187C10.1091 7.47794 9.8491 7.28641 9.9611 6.79841L10.1031 6.17943C10.129 6.06249 10.0831 5.89917 9.9991 5.81448L9.50316 5.31444C9.21116 5.02006 9.30516 4.72165 9.7131 4.65309L10.351 4.54623C10.457 4.52808 10.585 4.43331 10.633 4.33451L10.985 3.62477C11.177 3.23966 11.4889 3.23966 11.6789 3.62477Z" />
      <path d="M5.33333 10C5.94141 10.8096 6.90953 11.3333 8 11.3333C9.09047 11.3333 10.0586 10.8096 10.6667 10" />
    </svg>
  );
}
