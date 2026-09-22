/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React from "react";
import { ProductData } from "@/lib/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getMobileCompatibleImageUrl } from "@/lib/utils";
import { buildSimpleCartItem, productHasVariants, trackSimpleAddToCart } from "@/lib/cart";
import useOrderStore from "@/store/orderStore";
import { FaStar, ShoppingCartAdd, HeartFilled, MdFavoriteBorder } from "@vibaar/ui/icons";

export default function WishlistComponent({
  item,
  handleLikeClick,
  handleProductClick,
  index,
  liked,
  base = true,
}: {
  item: ProductData;
  handleLikeClick: (index: number) => void;
  handleProductClick: () => void;
  index: number;
  liked: boolean;
  base?: boolean;
}) {
  const router = useRouter();
  const { cart, addToCarts } = useOrderStore();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Variant products can't be priced/added from a card — open the detail page.
    // Delegate to the parent's handler (it builds the canonical /store/{tag}/... URL).
    if (productHasVariants(item)) {
      handleProductClick();
      return;
    }
    addToCarts([buildSimpleCartItem(item), ...cart]);
    trackSimpleAddToCart(item);
    toast.success("Added to cart");
  };
  //(item);
  return (
    <div
      className={
        base
          ? "cursor-pointer relative min-w-[148px] p-2 rounded-card backdrop-blur-sm bg-surface/10 shadow-md"
          : "cursor-pointer relative min-w-[148px] p-2 rounded-card"
      }
      onClick={handleProductClick}>
      <img
        src={item?.image ? getMobileCompatibleImageUrl(item?.image[0]) : "/images/product-placeholder.svg"}
        alt={item.title ?? ""}
        className="w-full h-[160px] object-cover rounded-card border"
        width={140}
        height={160}
      />
      <button type="button" aria-label="Add to wishlist"
        className={`text-left absolute top-5 right-5 cursor-pointer`}
        onClick={(e) => {
          e.stopPropagation();
          handleLikeClick(index);
        }}>
        {liked ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/15">
            <HeartFilled size={14} className="text-brandDeep" />
          </span>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/15">
            <MdFavoriteBorder size={14} className="text-white" />
          </span>
        )}
      </button>
      <button type="button" aria-label="Add to cart"
        onClick={handleAddToCart}
        className="text-left absolute bottom-[70px] right-5 cursor-pointer">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/20">
          <ShoppingCartAdd size={18} className="text-brandDeep" />
        </span>
      </button>
      <p
        className={
          base
            ? "text-caption w-full font-medium mt-1 line-clamp-1 text-white"
            : "text-caption w-full font-medium mt-1 line-clamp-1 text-foreground-primary"
        }>
        {item.title}
      </p>
      <p className="text-caption text-white/50 font-normal line-through">
        ₦{item.old_price ? item?.old_price.toLocaleString() : 0}
      </p>
      <div className="flex justify-between">
        <p
          className={
            base
              ? "text-body-sm text-white font-medium"
              : "text-body-sm text-foreground-primary font-medium"
          }>
          ₦{item?.price?.toLocaleString()}
        </p>
        <div className="flex gap-1">
          {base ? (
            <FaStar size={13} className="text-white" />
          ) : (
            <FaStar size={14} className="text-foreground-primary" />
          )}

          <p
            className={
              base
                ? "text-caption text-white/60 font-normal"
                : "text-caption text-foreground-secondary font-normal"
            }>
            {item.rating || 0}
          </p>
        </div>
      </div>
    </div>
  );
}
