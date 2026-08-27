/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Home.js
"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import useBusinessStore from "@/store/businessStore";
import Loader from "@vibaar/ui/common/Loader";
import SalesBody from "@/features/seller-shell/sales";
import useAuthStore from "@/store/authStore";
import useProductStore from "@/store/productStore";
import useOnboardingStore from "@/store/onboardingStore";
import MilestoneCelebration from "@/features/onboarding/MilestoneCelebration";
import dynamic from "next/dynamic";

const FirstTimeTour = dynamic(
  () => import("@/features/onboarding/FirstTimeTour"),
  { ssr: false }
);

const Home = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const {
    fetchSalesDashboardAnalytics,
    fetchWalletAnalytics,
    fetchStores,
    stores,
    setStore,
    isLoading,
  } = useBusinessStore();

  const fetById = async () => {
    try {
      await fetchStores(); // Use the same approach as storefront for consistency

      // Set the primary store (same logic as auth store)
      if (stores.length > 0) {
        const primaryStore = stores.find(s => s.id === user?.business?.id) || stores[0];
        setStore(primaryStore);
      }
    } catch (error) {
      console.error("Dashboard fetchStores failed:", error);
    }
  };

  // Initialize onboarding state for current user + fetch products
  const { initForUser } = useOnboardingStore();
  const { fetchProducts } = useProductStore();

  useEffect(() => {
    if (user?.id) {
      initForUser(user.id);
    }
    if (user?.business?.id) {
      fetchProducts(user.business.id);
    }
  }, [user?.id, user?.business?.id, initForUser, fetchProducts]);

  useEffect(() => {
    // Wallet balance feeds the home wallet card, so keep it. The bank DIRECTORY moved
    // to the add-account form and wallet TRANSACTIONS to the wallet/transactions pages
    // (P12) — neither is rendered on home, and those pages now self-fetch.
    fetchWalletAnalytics();
    fetById();
    // getBankAccounts is already fetched by DetailFetcher (the dashboard layout),
    // which runs on the home route too — the home-level call was a duplicate (P12).
    // W2.4: no cleanup-refetch — cleanups are for cancellation, not re-fetching
  }, [user?.business?.id]); // Add dependency to refetch when business ID changes

  useEffect(() => {
    // Discounts now load on the catalog/discounts page (their only render site) —
    // the home fetched 10 pages on every visit but never displayed them (P12).
    fetchSalesDashboardAnalytics();
    // W2.4: no cleanup-refetch
  }, [fetchSalesDashboardAnalytics]);

  return isLoading ? (
    <Loader />
  ) : (
    <>
      <MilestoneCelebration />
      <FirstTimeTour />
      <SalesBody action={() => router.push("/dashboard/wallet")} />
    </>
  );
};

export default Home;
