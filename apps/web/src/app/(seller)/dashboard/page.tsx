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
    isLoading,
  } = useBusinessStore();

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
    // Wallet balance + dashboard analytics for the home cards. NOTE: the
    // /business/dashboard-summary aggregate exists but is NOT wired here yet — wiring
    // it regressed these cards to zero (the aggregate errored for real seller data),
    // so the home stays on the proven individual fetches until the endpoint is
    // verified against a live seller. Store context is hydrated by getMe at bootstrap;
    // getBankAccounts is covered by DetailFetcher (the dashboard layout).
    fetchWalletAnalytics();
    fetchSalesDashboardAnalytics();
  }, [user?.business?.id]); // refetch when the business changes

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
