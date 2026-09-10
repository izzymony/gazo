"use client";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import EmptyState from "@vibaar/ui/common/EmptyState";
import { BusinessData } from "@/lib/types";
import { storePath, productPath } from "@/lib/urlHelpers";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import img1 from "../../../../../public/PRODUCT IMAGE (2).png";
import VendorCard from "@/features/storefront/VendorCard";
import {
  generateSessionSeed,
  createVendorBackgroundMap,
} from "@/utils/vendorBackgroundHelper";

const Page = () => {
  const router = useRouter();
  const [likedItems] = useState<number[]>([]);
  const { recent, addWishlist, spotlightProduct } = useProductStore();
  const { fetchStores, stores, store, setStore } = useBusinessStore();

  useEffect(() => {
    fetchStores();
  }, [fetchStores, store?.id]);

  // Session-consistent seed so each vendor keeps a stable background per visit.
  const sessionSeed = useMemo(() => generateSessionSeed(), []);

  const vendorBackgroundMap = useMemo(() => {
    if (!recent || recent.length === 0 || !stores || stores.length === 0) {
      return new Map<string, string>();
    }
    const vendorsWithProducts = recent.map((item) => ({
      id: item.business_id,
      products: item.products || [],
    }));
    return createVendorBackgroundMap(vendorsWithProducts, sessionSeed);
  }, [recent, stores, sessionSeed]);

  const getBusinessDetails = (data: BusinessData[], businessId: string) => {
    if (!Array.isArray(data) || !businessId) {
      return null;
    }
    return data.find((item) => item.id === businessId) || null;
  };

  const handleLikeClick = async (id: string) => {
    await addWishlist(id);
  };

  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Recently viewed vendors"
        />
      }>
      {recent.length > 0 ? (
        <div className="flex flex-col gap-4">
          {recent.map((items) => {
            const businessDetails = getBusinessDetails(
              stores,
              items.business_id
            );
            return (
              <VendorCard
                key={items.id}
                href={storePath(items.business)}
                vendorId={items.business_id}
                name={items.business?.name || ""}
                logo={businessDetails?.logo as string | undefined}
                category={businessDetails?.category}
                rating={businessDetails?.average_rating}
                followers={businessDetails?.followers_count}
                backgroundImage={(items.products || []).find((p: any) => p.image?.[0])?.image?.[0]}
                products={(items.products || []).map((item: any) => ({
                  id: item.id,
                  title: item.title,
                  image: item.image,
                  price: item.price,
                  old_price: item.old_price,
                  rating: item.product_rating?.length
                    ? Math.round(
                        item.product_rating.reduce(
                          (a: number, b: { rate: number }) => a + b.rate,
                          0
                        ) / item.product_rating.length
                      )
                    : 0,
                }))}
                productHref={(product) => productPath(items.business, product)}
                savedProductIds={spotlightProduct.map((sp: { product_id?: string }) => sp.product_id)}
                onSaveProduct={(product) => product.id && handleLikeClick(product.id)}
                onPrefetch={() => {
                  if (businessDetails) setStore(businessDetails);
                }}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          image="/images/emptystate/products_empty_state.svg"
          title="No recently viewed vendors"
          subtitle="Vendors you view will show up here."
        />
      )}
    </PageShell>
  );
};

export default Page;
