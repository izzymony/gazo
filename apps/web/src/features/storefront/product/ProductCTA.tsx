import Button from "@vibaar/ui/common/Button";
import IconButton from "@vibaar/ui/common/IconButton";
import { PiShareFatThin, Minus, Plus, ShoppingCartAdd } from "@vibaar/ui/icons";

/**
 * The product's purchase action: a bottom bar on a phone, a panel in the
 * desktop aside.
 *
 * Presentational — seller mode shows Edit/Share; buyer mode shows the quantity
 * stepper + Buy now + add-to-cart. ALL logic (checkout guards, cart, routing,
 * analytics, loading) stays in Product.tsx and arrives via callbacks, so the
 * money path is untouched. Systemised in the same pass: the hand-rolled 40px
 * inline-SVG circle buttons (minus/plus/cart) → the shared `IconButton`.
 *
 * THE DESKTOP CHANGE. This was `absolute bottom-0` + `lg:max-w-5xl` +
 * `lg:left-1/2 lg:-translate-x-1/2`: a 1024px-wide bar, horizontally centred,
 * pinned to the bottom of the viewport. It read as compliant to any check that
 * greps for `fixed` and was the exact thing the desktop rule exists to remove —
 * a page-wide action floating at the viewport floor, a thousand pixels from the
 * variants and delivery options it commits.
 *
 * At lg it is now a bounded panel in the product's aside column, stacked under
 * the variants and delivery it belongs with, and sticky with them so it stays
 * reachable at short heights. A panel action may fill its bounded panel, which
 * is why there is no width floor or right-alignment here.
 *
 * Below lg NOTHING changes. The bar stays `absolute bottom-0`, which resolves
 * against the shell frame rather than its DOM parent — so moving this node into
 * the aside column moved its desktop pixels without moving its mobile ones.
 */
export default function ProductCTA({
  isSeller,
  count,
  isOutOfStock = false,
  onIncrement,
  onDecrement,
  onBuyNow,
  onAddToCart,
  onEdit,
  onShare,
}: {
  isSeller: boolean;
  count: number;
  isOutOfStock?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onBuyNow: () => void;
  onAddToCart: () => void;
  onEdit: () => void;
  onShare: () => void;
}) {
  return (
    // At lg this becomes a two-row grid rather than one long row: quantity and
    // add-to-cart share the top row, Buy now takes the bottom one at full width.
    // A 380px panel is not a 1024px bar — four controls abreast in it squeezes
    // the commit down to the width of the stepper beside it, and the thing a
    // buyer is looking for ends up the smallest target in the panel.
    //
    // Placed by grid rather than reordered, so the DOM stays stepper → Buy now →
    // cart and the tab order is unchanged at both breakpoints.
    <div className="absolute bottom-0 z-sticky flex w-full items-center gap-3 border-t border-outline bg-surface px-4 py-3 md:px-6 lg:static lg:grid lg:grid-cols-2 lg:shrink-0 lg:rounded-panel lg:border lg:p-5 lg:shadow-card">
      {isSeller ? (
        <div className="flex justify-center gap-4 w-full lg:col-span-2">
          <Button onClick={onEdit} variant="bordered">
            Edit product
          </Button>

          <Button onClick={onShare} variant="filled">
            <PiShareFatThin size={18} aria-hidden="true" />
            Share product
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 lg:col-start-1 lg:row-start-1">
            <IconButton
              icon={Minus}
              label="Decrease quantity"
              onClick={onDecrement}
              size="lg"
              className="bg-surface-subtle"
              disabled={isOutOfStock}
            />
            <span className="min-w-6 text-center text-body font-medium tabular-nums">{count}</span>
            <IconButton
              icon={Plus}
              label="Increase quantity"
              onClick={onIncrement}
              size="lg"
              className="bg-surface-subtle"
              disabled={isOutOfStock}
            />
          </div>

          <Button
            onClick={onBuyNow}
            disabled={isOutOfStock}
            className="m-0 mx-auto lg:col-span-2 lg:row-start-2 lg:mx-0 lg:w-full">
            {isOutOfStock ? "Out of stock" : "Buy now"}
          </Button>

          <IconButton
            icon={ShoppingCartAdd}
            label="Add to cart"
            onClick={onAddToCart}
            size="lg"
            className="bg-surface-subtle lg:col-start-2 lg:row-start-1 lg:justify-self-end"
            disabled={isOutOfStock}
          />
        </>
      )}
    </div>
  );
}
