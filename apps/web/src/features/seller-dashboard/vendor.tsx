import React, { useEffect } from "react";
import Button from "@vibaar/ui/common/Button";
import { storePath, productPath } from "@/lib/urlHelpers";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import { useRouter } from "next/navigation";
import EmptyState from "@vibaar/ui/common/EmptyState";
import { BusinessData, ProductData } from "@/lib/types";
import VendorCard from "@/features/storefront/VendorCard";

type BusinessDetails = (
  data: BusinessData[],
  businessId: string
) => BusinessData | null;

/**
 * "Vendors you follow" on the buyer profile.
 *
 * The card here used to be a second, unfinished drawing of the marketplace's
 * vendor card, wired to real store names on top of hardcoded everything else —
 * category "fashion", rating 5.4, 100k followers, a stock logo, one shared
 * background image, every product rated 4.5, and a Follow button that only
 * touched local state and labelled every vendor "Following". It is the shared
 * VendorCard now, on the vendor's real values.
 */
const Vendor = () => {
  const router = useRouter();
  const { products, spotlightProduct, addWishlist } = useProductStore();
  const { fetchStores, stores, store } = useBusinessStore();

  useEffect(() => {
    fetchStores();
  }, [fetchStores, store?.id]);

  const groupedData = Object.values(
    products.reduce(
      (
        acc: Record<
          string,
          { business: string; products: ProductData[]; id: string }
        >,
        item
      ) => {
        const { business_id, ...productDetails } = item;
        if (business_id && !acc[business_id]) {
          acc[business_id] = {
            business: business_id,
            id: business_id,
            products: [],
          };
        }
        if (business_id) {
          acc[business_id].products.push(productDetails);
        }
        return acc;
      },
      {}
    )
  );

  const getBusinessDetails: BusinessDetails = (
    data: BusinessData[],
    businessId: string
  ) => {
    if (!Array.isArray(data) || !businessId) {
      return null;
    }

    const business = data.find((item) => item.id === businessId);
    return business || null;
  };

  return (
    <div>
      <p className="text-body-sm font-medium mb-3">Vendors you follow</p>
      {groupedData.length === 0 ||
        groupedData.every((group) => group.products.length === 0) ? (
        <EmptyState
          title="No followed vendors yet."
          subtitle="Start following a vendor to see their products and storefront here."
          image="/images/cart/empty_cart_state.svg">
          <Button
            variant="bordered"
            type="button"
            onClick={() => router.push("/shop")}
            size="sm"
            fullWidth={false}>
            Explore vendors
          </Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedData?.slice(0, 5)?.map((group) => {
            const businessDetails = getBusinessDetails(stores, group.business);
            if (!businessDetails) return null;
            return (
              <VendorCard
                key={group.business}
                href={storePath(businessDetails)}
                vendorId={businessDetails.id}
                name={businessDetails.name || ""}
                logo={businessDetails.logo as string | undefined}
                category={businessDetails.category}
                rating={Number(businessDetails.average_rating) || 0}
                followers={Number(businessDetails.followers_count) || 0}
                backgroundImage={
                  group.products.find((p) => p.image?.[0])?.image?.[0]
                }
                products={group.products.map((item) => ({
                  id: item.id,
                  title: item.title,
                  image: item.image,
                  price: item.price,
                  old_price: item.old_price,
                  rating: item.product_rating?.length
                    ? Math.round(
                        item.product_rating.reduce((a, b) => a + b.rate, 0) /
                          item.product_rating.length
                      )
                    : 0,
                }))}
                productHref={(product) => productPath(businessDetails, product)}
                savedProductIds={spotlightProduct.map((s) => s.product_id)}
                onSaveProduct={(product) => product.id && addWishlist(product.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Vendor;
