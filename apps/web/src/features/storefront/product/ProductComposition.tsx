import { ReactNode } from "react";

/**
 * ProductComposition — the product page's two-column desktop layout, once.
 *
 * This markup lived inside `Product.tsx` and nowhere else, so the seller's
 * Product Preview re-implemented the whole screen by hand: 402 lines with no
 * `lg:` class anywhere in the file, which is why it rendered a phone layout in
 * a 1024px column. It had also drifted — hardcoded "(5 sold)", a fake
 * "5.4 · 100k" vendor line, and a hand-rolled 22px variant chip that is the
 * exact markup `ProductVariants` documents as removed for having no type and
 * no `aria-pressed`. `Preview.tsx` even imported `ImageCarousel` and never used
 * it, under an `eslint-disable` on line 1.
 *
 * So this owns LAYOUT and nothing else. Every piece of content arrives as a
 * slot, already built by the caller from the same presentational primitives
 * (`ProductInfo`, `ProductVariants`, `DeliveryCard`, `ProductCTA`, …). The
 * storefront passes real data and a purchase action; the preview passes draft
 * data and no action, because its Publish button lives in the page header.
 *
 * The grid is `1fr 380px` (`lg:grid-cols-product`). Below `lg` it is not a grid
 * at all: the gallery is the full-bleed band it has always been, the aside is
 * `contents` so it contributes no box, and the action falls through to the
 * `absolute` bottom bar it owns itself.
 */
export interface ProductCompositionProps {
  /** Drives the header overhang pull only; the caller owns the scroll listener. */
  overhang?: string;
  /** Gallery for row 1 of the left column. Full-bleed below `lg`. */
  gallery: ReactNode;
  /** Title, price, rating, share/like. */
  info: ReactNode;
  /**
   * Rendered TWICE — in the left column below `lg`, and inside the aside panel
   * at `lg` — so it is a render function rather than a node: the two copies are
   * the same component with different padding, and one element cannot be in two
   * places. Omit it when the product has no variants.
   */
  renderVariants?: (className: string) => ReactNode;
  /**
   * Same two-place rule as variants. Omitted for the owner's own view, which
   * has no delivery to quote.
   */
  renderDelivery?: (opts: { className?: string; returnRowClassName: string }) => ReactNode;
  /** Description, vendor, reviews — left column, below the fold. */
  sections?: ReactNode;
  /** The aside's action cell: `ProductCTA` on the storefront, nothing in preview. */
  action?: ReactNode;
}

export default function ProductComposition({
  overhang = "",
  gallery,
  info,
  renderVariants,
  renderDelivery,
  sections,
  action,
}: ProductCompositionProps) {
  return (
    <div
      className={`transition-spacing duration-300 ease-out lg:grid lg:grid-cols-product lg:gap-x-8 lg:gap-y-2 lg:px-8 ${overhang}`}>
      {/* Below lg the gallery is exactly the full-bleed band it has always
          been; at lg it is row 1 of the left column and the grid supplies the
          gutter. `z-10` keeps it painting over the banner it sits on. */}
      <div className="relative z-10 px-4 md:px-6 mb-0 lg:col-start-1 lg:row-start-1 lg:px-0">
        {gallery}
      </div>

      {/* Left Column - Main Content */}
      <div className="lg:col-start-1 lg:row-start-2">
        {info}

        <hr className="lg:hidden" />

        {/* Variants - mobile copy. The desktop copy lives in the aside panel. */}
        {renderVariants?.("w-full px-5 py-5 lg:hidden")}

        {/* Delivery - mobile copy. */}
        {renderDelivery && (
          <>
            <hr className="lg:hidden" />
            {renderDelivery({ className: "py-5 px-5 lg:hidden", returnRowClassName: "px-5 py-5" })}
          </>
        )}

        <hr className="lg:hidden" />

        {sections}
        {/* End Left Column */}
      </div>

      {/* Right Column - the desktop aside.
          `contents` below lg so this column has no box there: the reference
          panel inside it is `hidden`, and the action falls through as the
          `absolute` bottom bar it has always been.

          At lg it spans BOTH rows of the left column — the gallery's and the
          details' — so the sticky box inside it can travel the full height of
          the page rather than only the part beside the details.

          The sticky box is a flex column capped at the viewport height. Its
          reference half (variants, delivery, returns) scrolls INTERNALLY when
          the options are long; the purchase action is `shrink-0`, so it stays
          in the panel and on screen instead of being pushed under the fold by
          a product with many variants. */}
      <div className="contents lg:relative lg:z-10 lg:block lg:col-start-2 lg:row-start-1 lg:row-end-3">
        <div className="contents lg:sticky lg:top-4 lg:flex lg:max-h-aside lg:flex-col lg:gap-4">
          {/* Matches the purchase panel below it exactly — same radius, same
              border, same shadow. Two cards stacked in one column at two
              different roundnesses read as a mistake. */}
          {(renderVariants || renderDelivery) && (
            <div className="hidden lg:block lg:min-h-0 lg:overflow-y-auto bg-surface rounded-panel shadow-card p-6 border border-outline">
              {renderVariants?.("w-full")}

              {renderDelivery && (
                <>
                  {/* Only show a divider if variants exist above it. */}
                  {renderVariants && <hr className="my-4" />}
                  {renderDelivery({ returnRowClassName: "px-2 mt-4" })}
                </>
              )}
            </div>
          )}

          {/* ONE action node. Rendered here rather than as a sibling of the
              grid, because at lg it has to be a cell of the aside column and
              CSS cannot move a node between subtrees. Its mobile presentation
              is unaffected: `absolute` resolves against the shell frame, not
              against this parent. */}
          {action}
        </div>
        {/* End Right Column - the desktop aside */}
      </div>
      {/* End 2-Column Layout */}
    </div>
  );
}
