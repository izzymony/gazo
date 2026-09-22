/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, Suspense } from "react";
import useAuthStore from "@/store/authStore";
import Cookies from "js-cookie";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import QueryProvider from "./providers";

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuthStore();

  // Initialize auth state on app load - sync cookies with store
  useEffect(() => {
    // P2: removed the vestigial localStorage cleanup (it scanned all storage ×3
    // on every cold start to remove keys that no longer exist — the stores now
    // partialize to near-nothing) and the always-on-backend healthcheck ping.
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

  // P3: removed the app-wide product prefetch (was paginatedFetcher = 4 parallel
  // /products requests fired from the root shell on every authed route) — and P10,
  // the eager businessStore/productStore imports it required. Product data is now
  // fetched only by the routes that render it (shop / dashboard).

  return (
    <QueryProvider>
      <div
        className={`antialiased h-dvh overflow-hidden bg-surface`}>
        {/* Google Analytics page view tracking */}
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <div className="relative w-full flex flex-col items-center h-full bg-surface overflow-y-auto">
          {children}
        </div>
      </div>
    </QueryProvider>
  );
}
