/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useCallback, useEffect, useState } from "react";
import Product from "@/features/seller-dashboard/products";
import Collections from "@/features/seller-dashboard/collection";
import Discount from "@/features/seller-dashboard/discount";
import Link from "next/link";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@vibaar/ui/common/Button";
import { SquareArrowUpRight, Plus } from "@vibaar/ui/icons";
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
    <>
      <PageShell
        header={
          <Header
            showMenu
            customText="Catalog"
          />
        }>
          <Tabs
            tabs={tabs}
            tabContents={tabContents}
            onTabChange={(value: number) => setActive(value)}
          />

          {/* Floating add button (product / discount) */}
          <Link
            href={active === 0 ? "/dashboard/catalog/product/create" : "/dashboard/catalog/discount/new"}
            aria-label={active === 0 ? "Add product" : "Add discount"}
            className="absolute bottom-28 right-4 lg:right-[calc((100%-64rem)/2+1rem)] w-12 h-12 rounded-full bg-brand flex items-center justify-center z-dropdown"
            style={{ boxShadow: "4px 8px 24px 0px rgb(var(--brand-rgb) / 0.2)" }}>
            <Plus size={24} className="text-white" />
          </Link>
      </PageShell>

      <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 w-full flex justify-center lg:max-w-5xl z-dropdown">
        <Button
          variant="bordered"
          size="sm"
          fullWidth={false}
          loading={isRefreshing}
          loadingText="Loading..."
          onClick={handleViewStorefront}
          className="shadow-pop">
          View store front
          <SquareArrowUpRight size={20} className="text-brand" />
        </Button>
      </div>
    </>
  );
};

export default Page;
