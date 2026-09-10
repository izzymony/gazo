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
import DataSort from "@/features/seller-dashboard/datasort";

const Page = () => {
  const router = useRouter();
  const { store, fetchBusinessProduct, setBusinessProducts } =
    useBusinessStore();
  const { user } = useAuthStore();
  const tabs = ["Products", "Collections", "Discount"];
  const [active, setActive] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // The Products tab's controls live in the tab bar's row, so the page holds
  // their state alongside the active tab.
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"ascending" | "descending">("ascending");
  // All three tabs are lists of the same store's things, and all three want the
  // same sort + search. They each used to own a copy of the control row, so the
  // row sat in a different place on every tab and its state reset when you
  // switched. One row, in the tab bar's block, driving whichever list is shown.
  const tabContents = [
    <Product key={0} searchTerm={searchTerm} sortOrder={sortOrder} />,
    <Collections key={1} searchTerm={searchTerm} sortOrder={sortOrder} />,
    <Discount key={2} sortOrder={sortOrder} />,
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
          // `size="md"` — text-body (14px), matching every other action in the
          // app. At `sm` it was text-body-sm (12px), noticeably smaller than
          // the title it sits beside.
          trailing={
            <Button
              variant="link"
              size="md"
              fullWidth={false}
              loading={isRefreshing}
              loadingText="Loading…"
              onClick={handleViewStorefront}>
              View store
              <SquareArrowUpRight size={18} aria-hidden="true" />
            </Button>
          }
        />
      }>
      <Tabs
        tabs={tabs}
        tabContents={tabContents}
        onTabChange={(value: number) => setActive(value)}
        // The same slot analytics' period row uses, which is what makes the
        // header → tabs → controls → list rhythm identical on both screens.
        generalContent={
          <DataSort
            sortOrder={sortOrder}
            onSortToggle={() =>
              setSortOrder((order) =>
                order === "ascending" ? "descending" : "ascending"
              )
            }
            onSortOrderChange={setSortOrder}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
          />
        }
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
