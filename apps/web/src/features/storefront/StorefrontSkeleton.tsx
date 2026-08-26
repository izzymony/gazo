"use client";

// STOREFRONT-URL-REWORK Rev 2 (R2e) — replaces the full-page blank <Loader/> on the
// storefront with a layout-matching skeleton (cover + logo/name + tabs + product
// grid) so a cold /@{handle} load feels instant instead of empty.
export default function StorefrontSkeleton() {
  return (
    <div className="w-full h-full overflow-hidden animate-pulse">
      {/* cover + header */}
      <div className="h-28 w-full bg-gray-200" />
      <div className="px-4 -mt-8">
        <div className="h-16 w-16 rounded-full bg-gray-300 border-4 border-white" />
        <div className="mt-3 h-4 w-40 bg-gray-200 rounded" />
        <div className="mt-2 h-3 w-24 bg-gray-100 rounded" />
      </div>

      {/* tabs */}
      <div className="px-4 mt-5 flex gap-4">
        <div className="h-3 w-16 bg-gray-200 rounded" />
        <div className="h-3 w-12 bg-gray-100 rounded" />
        <div className="h-3 w-14 bg-gray-100 rounded" />
      </div>

      {/* product grid */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square w-full bg-gray-200 rounded-lg" />
            <div className="h-3 w-3/4 bg-gray-200 rounded" />
            <div className="h-3 w-1/2 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
