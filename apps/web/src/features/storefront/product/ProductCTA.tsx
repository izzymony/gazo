import Button from "@/design-system/common/Button";
import IconButton from "@/design-system/common/IconButton";
import { PiShareFatThin, Minus, Plus, ShoppingCartAdd } from "@/design-system/icons";

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
  onIncrement,
  onDecrement,
  onBuyNow,
  onAddToCart,
  onEdit,
  onShare,
}: {
  isSeller: boolean;
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onBuyNow: () => void;
  onAddToCart: () => void;
  onEdit: () => void;
  onShare: () => void;
}) {
  return (
    <div className="z-30 absolute bottom-0 pb-2 lg:pb-6 bg-white w-full px-2.5 md:px-6 lg:px-8 border-t pt-2.5 lg:pt-6 flex gap-2 items-center lg:max-w-5xl lg:left-1/2 lg:-translate-x-1/2">
      {isSeller ? (
        <div className="flex justify-center gap-4 w-full">
          <Button onClick={onEdit} variant="bordered" className="!mt-2 my-5 ">
            Edit Product
          </Button>

          <Button onClick={onShare} variant="filled" className=" !mt-2 my-5 ">
            <PiShareFatThin className="text-h2 fill-[white]" />
            Share Product
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center space-x-3 ">
            <IconButton
              icon={Minus}
              label="Decrease quantity"
              onClick={onDecrement}
              size="lg"
              className="bg-ink-3"
            />
            <span className="text-sm font-normal">{count}</span>
            <IconButton
              icon={Plus}
              label="Increase quantity"
              onClick={onIncrement}
              size="lg"
              className="bg-ink-3"
            />
          </div>

          <Button onClick={onBuyNow} className="!m-0 !mx-auto">
            Buy now
          </Button>

          <IconButton
            icon={ShoppingCartAdd}
            label="Add to cart"
            onClick={onAddToCart}
            size="lg"
            className="bg-ink-3"
          />
        </>
      )}
    </div>
  );
}
