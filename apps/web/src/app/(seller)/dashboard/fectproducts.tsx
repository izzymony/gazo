/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import useBusinessStore from "@/store/businessStore";
import { ReactNode, useCallback, useEffect } from "react";
import { paginatedFetcher } from "@/app/(auth)/welcome/pagination";
import useAuthStore from "@/store/authStore";

export default function DetailFetcher({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const {
    fetchCustomerAnalytics,
    fetchCustomersRanking,
    setCustomerRanking,
    setProductRanking,
    fetchProductRanking,
    fetchSalesAnalytics,
    fetchFollowedBusinessess,
    setFollowedBusinessess,
    getBankAccounts,
    fetchBusinessProduct,
    setBusinessProducts,
    fetchCollection,
    setCollection,
  } = useBusinessStore();
  const coll = useCallback(
    async (id: number) => {
      fetchCollection(id, user?.business?.id + "");
    },
    [fetchCollection, user?.business?.id]
  );

  const fetchCustomer = () =>
    paginatedFetcher(fetchCustomersRanking, setCustomerRanking, user);

  const fetchBusinessProducts = () =>
    paginatedFetcher(fetchBusinessProduct, setBusinessProducts, user);

  const fetchProductRankings = () =>
    paginatedFetcher(fetchProductRanking, setProductRanking, user);
  const fetchFollowedBusiness = () =>
    paginatedFetcher(fetchFollowedBusinessess, setFollowedBusinessess, user);
  const fetchBusinessCollection = () =>
    paginatedFetcher(coll, setCollection, user);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    fetchSalesAnalytics(today);
    fetchCustomerAnalytics(today);
    fetchCustomer();
    fetchProductRankings();
    fetchFollowedBusiness();
    getBankAccounts();
    fetchBusinessProducts();
    fetchBusinessCollection();
    // W2.4: no cleanup-refetch — cleanups are for cancellation, not re-fetching
  }, []);

  return <div className="w-full">{children}</div>;
}
