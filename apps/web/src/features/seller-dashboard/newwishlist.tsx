/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import Button from "@vibaar/ui/common/Button";
import EmptyState from "@vibaar/ui/common/EmptyState";
import { useRouter } from "next/navigation";
import useProductStore from "@/store/productStore";
// import useBusinessStore from "@/store/businessStore";
// import { BusinessData } from "@/lib/types";
import Explore from "@/features/shop/explorecard";
import Surface from "@/features/shop/ccard";

const WishlistNew = () => {
  const router = useRouter();
  const { spotlightProduct: products } = useProductStore();
  // const { stores } = useBusinessStore();
  const [liked, setLiked] = useState(true);

  // const getBusinessDetails = (data: BusinessData[], businessId: string) => {
  //   if (!Array.isArray(data) || !businessId) {
  //     return null;
  //   }

  //   const business = data.find((item) => item.id === businessId);
  //   return business || null;
  // };

  // const handleProductClick = (businessName: string, id: string) =>
  //   router.push(`/shop/${businessName}/products/${id}`);

  //(products);

  return (
    <div className="mt-8">
      {products.length > 0 ? (
        <div className="">
          <Explore title="Bags">
            <div className="overflow-y-scroll scrollbar-hide flex flex-row">
              {[1, 2, 3, 4, 5, 6, 7].map((it) => (
                <Surface key={it} liked={liked} setLiked={setLiked} />
              ))}
            </div>
          </Explore>
          <Explore title="Bags">
            <div className="overflow-y-scroll scrollbar-hide flex flex-row">
              {[1, 2, 3, 4, 5, 6, 7].map((it) => (
                <Surface key={it} liked={liked} setLiked={setLiked} />
              ))}
            </div>
          </Explore>
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

export default WishlistNew;
