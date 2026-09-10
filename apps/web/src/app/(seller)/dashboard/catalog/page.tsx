/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useCallback, useEffect, useState } from "react";
import Product from "@/features/seller-dashboard/products";
import Collections from "@/features/seller-dashboard/collection";
import Discount from "@/features/seller-dashboard/discount";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Button from "@vibaar/ui/common/Button";
import FloatingAction from "@/design-system/common/FloatingAction";
import { SquareArrowUpRight } from "@vibaar/ui/icons";
import Tabs from "@vibaar/ui/common/Tabs";
import { useRouter } from "next/navigation";
import useBusinessStore from "@/store/businessStore";
import { paginatedFetcher } from "@/app/(auth)/welcome/pagination";
import useAuthStore from "@/store/authStore";
// import Spotlights from "@/features/seller-dashboard/spotlight"; // Hidden for v2

const Page = () => {
  const router = useRouter();
  const { store, fetchBusinessProduct, setBusinessProducts } =
    useBusinessStore();
  const { user } = useAuthStore();
  const tabs = ["Products", "Collections", "Discount"];
  const [active, setActive] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const tabContents = [
    <Product key={0} />,
    <Collections key={1} />,
    <Discount key={2} />,
    // <Spotlights key={3} />, // Hidden for v2
  ];

  const fetcher = useCallback(
    () => paginatedFetcher(fetchBusinessProduct, setBusinessProducts, user),
    [active, fetchBusinessProduct, setBusinessProducts]
  );

  useEffect(() => {
    fetcher();
    // W2.4: no cleanup-refetch
  }, []);

  const handleViewStorefront = async () => {
    setIsRefreshing(true);
    try {
      // Force refresh products before navigation
      await fetcher();
    } finally {
      setIsRefreshing(false);
      router.push(`/dashboard/storefront`);
    }
  };

  return (
    <PageShell
      header={
        <Header
          title="Catalog"
          // "View store front" was a second floating bar, pinned over the page
          // beside the add button — two controls competing for the same corner
          // of the screen, each with its own hand-picked offset above the nav.
          // It is a navigation, not an action, so it belongs in the header.
          trailing={
            <Button
              variant="link"
              size="sm"
              fullWidth={false}
              loading={isRefreshing}
              loadingText="Loading…"
              onClick={handleViewStorefront}>
              View store
              <SquareArrowUpRight size={18} />
            </Button>
          }
        />
      }>
      <Tabs
        tabs={tabs}
        tabContents={tabContents}
        onTabChange={(value: number) => setActive(value)}
      />

      {/* The add action. `fixed`, like every other floating control: it is
          pinned to the viewport, not to a position inside the scrolling page.
          As an absolute it resolved against the old layout's scroll container
          and drifted away with the content. One shared offset (bottom-20) and
          one z (below the nav's) — see FloatingAction. */}
      <FloatingAction
        href={active === 0 ? "/dashboard/catalog/product/create" : "/dashboard/catalog/discount/new"}
        label={active === 0 ? "Add product" : "Add discount"}
      />
    </PageShell>
  );
};

export default Page;
