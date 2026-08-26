/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { productPath } from "@/lib/urlHelpers";
import Button from "@vibaar/ui/common/Button";
import EmptyState from "@vibaar/ui/common/EmptyState";
import { useRouter } from "next/navigation";
import WishlistComponent from "@/app/(buyer)/shop/spotlights/wishlistcomponent";
import useProductStore from "@/store/productStore";
import useBusinessStore from "@/store/businessStore";
import { BusinessData } from "@/lib/types";

const Wishlist = () => {
  const router = useRouter();
  const { spotlightProduct: products } = useProductStore();
  const { stores } = useBusinessStore();

  const getBusinessDetails = (data: BusinessData[], businessId: string) => {
    if (!Array.isArray(data) || !businessId) {
      return null;
    }

    const business = data.find((item) => item.id === businessId);
    return business || null;
  };

  const handleProductClick = (
    business: { tag?: string } | null,
    product: { id?: string; slug?: string; title?: string }
  ) => router.push(productPath(business ?? undefined, product));

  //(products);

  return (
    <div className="mt-1">
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 w-full items-end">
          {products.map((item, index) => {
            if (!item.product) return null;

            const businessDetails = getBusinessDetails(
              stores,
              item.product.business_id
            );
            return (
              <WishlistComponent
                item={item.product as any}
                handleProductClick={() =>
                  handleProductClick(businessDetails, item.product)
                }
                index={index}
                liked={true}
                key={index}
                handleLikeClick={() => { }}
                base={false}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No items in your wishlist."
          subtitle="Explore the store pages and like products to add them to your wishlist."
          image="/images/emptystate/wishlist_empty_state.svg">
          <Button
            variant="bordered"
            type="button"
            onClick={() => router.push("/shop")}
            className="text-body-sm !px-5 py-1 !w-[max-content]">
            Explore vendors
          </Button>
        </EmptyState>
      )}
    </div>
  );
};

export default Wishlist;
