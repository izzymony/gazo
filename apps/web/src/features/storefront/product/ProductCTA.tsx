import Button from "@vibaar/ui/common/Button";
import IconButton from "@vibaar/ui/common/IconButton";
import { PiShareFatThin, Minus, Plus, ShoppingCartAdd } from "@vibaar/ui/icons";

/**
 * The product-page sticky bottom action bar (W4.4).
 *
 * Presentational — seller mode shows Edit/Share; buyer mode shows the quantity
 * stepper + Buy now + add-to-cart. ALL logic (checkout guards, cart, routing,
 * analytics, loading) stays in Product.tsx and arrives via callbacks, so the
 * money path is untouched. Systemised in the same pass: the hand-rolled 40px
 * inline-SVG circle buttons (minus/plus/cart) → the shared `IconButton`.
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
    <div className="absolute bottom-0 z-sticky flex w-full items-center gap-3 border-t border-outline bg-surface px-4 py-3 md:px-6 lg:left-1/2 lg:max-w-5xl lg:-translate-x-1/2 lg:px-8 lg:py-6">
      {isSeller ? (
        <div className="flex justify-center gap-4 w-full">
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
          <div className="flex items-center gap-2">
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
            className="m-0 mx-auto">
            {isOutOfStock ? "Out of stock" : "Buy now"}
          </Button>

          <IconButton
            icon={ShoppingCartAdd}
            label="Add to cart"
            onClick={onAddToCart}
            size="lg"
            className="bg-surface-subtle"
            disabled={isOutOfStock}
          />
        </>
      )}
    </div>
  );
}
