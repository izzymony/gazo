"use client";

// STOREFRONT-URL-REWORK Rev 2 (R2e) — replaces the full-page blank <Loader/> on the
// storefront with a layout-matching skeleton (cover + logo/name + tabs + product
// grid) so a cold /@{handle} load feels instant instead of empty.
//
// On the design-system tokens. Every block used to be a raw Tailwind palette
// grey (bg-gray-100/200/300) — ten of them, the largest single cluster of
// off-system colour on this surface — and the radii were `rounded`/`rounded-lg`
// rather than the field/card scale. The shapes now match what actually renders:
// a 52px compact header, a 16px card radius on the tiles.
export default function StorefrontSkeleton() {
  return (
    <div className="h-full w-full animate-pulse overflow-hidden motion-reduce:animate-none">
      {/* cover + header */}
      <div className="h-28 w-full rounded-b-card bg-surface-muted" />
      <div className="-mt-8 px-4">
        <div className="h-16 w-16 rounded-pill border-4 border-surface bg-surface-strong" />
        <div className="mt-3 h-4 w-40 rounded-field bg-surface-muted" />
        <div className="mt-2 h-3 w-24 rounded-field bg-surface-subtle" />
      </div>

      {/* tabs */}
      <div className="mt-5 flex gap-4 px-4">
        <div className="h-3 w-16 rounded-field bg-surface-muted" />
        <div className="h-3 w-12 rounded-field bg-surface-subtle" />
        <div className="h-3 w-14 rounded-field bg-surface-subtle" />
      </div>

      {/* product grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square w-full rounded-card bg-surface-muted" />
            <div className="h-3 w-3/4 rounded-field bg-surface-muted" />
            <div className="h-3 w-1/2 rounded-field bg-surface-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}
