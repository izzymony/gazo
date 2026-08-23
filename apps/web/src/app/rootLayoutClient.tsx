/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { DM_Sans } from "next/font/google";
import { useEffect, Suspense } from "react";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import useAuthStore from "@/store/authStore";
import Cookies from "js-cookie";
import { paginatedFetcher } from "./(auth)/welcome/pagination";
import { emergencyStorageCleanup, getStorageStats } from "@/utils/quotaSafeStorage";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import QueryProvider from "./providers";

const dm_Sans = DM_Sans({
  weight: "500",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getStoreMetrics } = useBusinessStore();
  const { setAllProducts, fetchAllProduct } = useProductStore();
  const token = Cookies.get("accessToken");
  const { isAuthenticated, user } = useAuthStore();

  // Initialize auth state on app load - sync cookies with store
  useEffect(() => {
    // EMERGENCY: Clean up localStorage to prevent QuotaExceededError crashes
    if (typeof window !== 'undefined') {
      try {
        console.log('[RootLayoutClient] Starting emergency localStorage cleanup...');
        const statsBefore = getStorageStats();
        if (statsBefore) {
          console.log('[RootLayoutClient] Storage before cleanup:', statsBefore);
        }

        emergencyStorageCleanup();

        const statsAfter = getStorageStats();
        if (statsAfter) {
          console.log('[RootLayoutClient] Storage after cleanup:', statsAfter);
        }
      } catch (error) {
        console.warn('[RootLayoutClient] Emergency cleanup failed:', error);
      }

      // Wake up backend immediately to avoid cold start delays
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '')}/api/v1/healthcheck`)
        .catch(() => {}); // Fire and forget - just wake up the backend
    }

    const initializeAuth = async () => {
      const storedToken = Cookies.get("accessToken");

      // W2.7: on load with a token, one deterministic /me call restores the
      // user + business (and hydrates the store/theme) — no setTimeout waiting
      // on rehydration, no /business retry loop. If the token is invalid, the
      // client's 401 interceptor handles refresh/redirect.
      if (storedToken) {
        try {
          await useAuthStore.getState().getMe();
        } catch (error) {
          console.warn("Auth bootstrap (/me) failed:", error);
        }
      } else if (isAuthenticated) {
        // Token gone but the store still thinks we're authed — clear it.
        useAuthStore.getState().clearUserState();
      }
    };
    
    initializeAuth();
  }, [isAuthenticated]); // Dependencies: isAuthenticated

  // (W2.7) The seller store/theme is now hydrated by getMe() in initializeAuth
  // above — no separate getAuthenticatedUserStore effect needed.

  // Fetch store metrics and products when token is available and user is authenticated
  useEffect(() => {
    if (token && isAuthenticated) {
      // getStoreMetrics(user?.business?.id);
      paginatedFetcher(fetchAllProduct, setAllProducts, user);
    }
  }, [
    isAuthenticated,
    fetchAllProduct,
    setAllProducts,
    user,
    getStoreMetrics,
    token,
    user?.business?.id,
  ]);

  return (
    <QueryProvider>
      <div
        className={`${dm_Sans.className} antialiased h-dvh overflow-hidden bg-white`}>
        {/* Google Analytics page view tracking */}
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <div className="relative w-full flex flex-col items-center h-full bg-white overflow-y-auto">
          {children}
        </div>
      </div>
    </QueryProvider>
  );
}
