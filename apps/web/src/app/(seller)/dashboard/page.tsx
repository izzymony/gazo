/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Home.js
"use client";
import React, { useCallback, useEffect } from "react";
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
    fetchDiscount,
    setDiscount,
    fetchSalesDashboardAnalytics,
    fetchBanks,
    setBanks: setBank,
    fetchWalletAnalytics,
    fetchWalletTransactions,
    fetchBusinessById,
    fetchStores,
    stores,
    setStore,
    isLoading,
    getBankAccounts,
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

  const fetchBanksDetails = async () => {
    try {
      const totalPages = 3; // 3 pages x 100 banks = 300 banks (covers all Nigerian banks)
      const requests = Array.from({ length: totalPages }, (_, i) =>
        fetchBanks(i + 1)
      );
      const responses: any = await Promise.all(requests);

      const bank = responses.flat(); // Merge all responses into one array

      //("data10 ", bank);
      setBank(bank);
    } catch (error) {
      console.error("Error fetching bank details:", error);
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
    fetchBanksDetails();
    fetchWalletAnalytics();
    fetchWalletTransactions();
    fetById();
    getBankAccounts(); // Fetch user's saved bank accounts for checklist
    // W2.4: no cleanup-refetch — cleanups are for cancellation, not re-fetching
    // (re-firing here doubled requests and let late responses clobber the next page)
  }, [user?.business?.id]); // Add dependency to refetch when business ID changes

  const discountGetter = useCallback(async () => {
    try {
      const totalPages = 10; // Define the total number of pages
      const requests = Array.from({ length: totalPages }, (_, i) =>
        fetchDiscount(i + 1)
      );
      const responses: any = await Promise.all(requests);

      const bank = responses.flat(); // Merge all responses into one array

      //("discounts ", bank);
      setDiscount(bank);
    } catch (error) {
      console.error("Error fetching bank details:", error);
    }
  }, [fetchDiscount, setDiscount]);

  useEffect(() => {
    discountGetter();
    fetchSalesDashboardAnalytics();
    // W2.4: no cleanup-refetch
  }, [discountGetter, fetchSalesDashboardAnalytics]);

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
