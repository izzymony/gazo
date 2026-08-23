"use client";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import EmptyState from "@vibaar/ui/common/EmptyState";
import { BusinessData } from "@/lib/types";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import img1 from "../../../../../public/PRODUCT IMAGE (2).png";
import ExploreCard from "@/features/storefront/explorecard";
import {
  generateSessionSeed,
  createVendorBackgroundMap,
} from "@/utils/vendorBackgroundHelper";

const Page = () => {
  const router = useRouter();
  const [likedItems] = useState<number[]>([]);
  const { recent, addWishlist } = useProductStore();
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
          showBack
          customText="Recently viewed vendors"
          onBackClick={() => router.back()}
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
              <ExploreCard
                key={items.id}
                cardAction={() => {
                  if (businessDetails) {
                    setStore(businessDetails);
                  }
                  router.push(`/shop/${items.business.name}`);
                }}
                smallCardAction={(e, item) => {
                  e.stopPropagation();
                  if (items.business) {
                    router.push(
                      `/shop/${items.business.name}/products/${item.id}`
                    );
                  }
                }}
                likedItems={likedItems}
                handleLikeClick={(ite) => handleLikeClick(ite)}
                image={img1.src}
                bussinessName={items.business.name}
                id={items.id}
                store={items.products}
                category=""
                vendorTheme={{
                  backgroundColor:
                    businessDetails?.business_setting?.personalised_settings
                      ?.background_color,
                  backgroundImage:
                    businessDetails?.business_setting?.personalised_settings
                      ?.background_image,
                  backgroundType:
                    businessDetails?.business_setting?.personalised_settings
                      ?.background_state,
                }}
                dynamicBackgroundImage={vendorBackgroundMap.get(
                  items.business_id
                )}
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
