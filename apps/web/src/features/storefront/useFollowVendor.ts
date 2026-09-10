"use client";

import { useCallback } from "react";
import useAuthStore from "@/store/authStore";
import useBusinessStore from "@/store/businessStore";
import { paginatedFetcher } from "@/app/(auth)/welcome/pagination";

/**
 * Following a vendor — the whole of it, once.
 *
 * Every card that offers a Follow button used to bring its own. The marketplace
 * card's version worked but refreshed the list by firing **ten pages in
 * parallel** on every single tap. The profile page's version did not call the
 * API at all: it toggled a local array, so "Follow" appeared to work and was
 * forgotten on navigation — and it defaulted its label to "Following", so every
 * vendor in the list claimed to be followed whether they were or not.
 *
 * The refresh goes through `paginatedFetcher`, which walks pages in order and
 * stops at the first empty one, so a shopper following two vendors costs two
 * requests rather than ten.
 */
export function useFollowVendor(vendorId: string | undefined) {
  const { followedBusinesses, fetchFollowedBusinessess, setFollowedBusinessess } =
    useBusinessStore();
  const { followBusiness, unfollowBusiness, user } = useAuthStore();

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setFollowedBusinessess([]);
      return;
    }
    await paginatedFetcher(
      // paginatedFetcher expects the action to RESOLVE the page's rows; the
      // store action sets state and returns void, so read it back after.
      async (page: number) => {
        await fetchFollowedBusinessess(page);
        return useBusinessStore.getState().followedBusinesses;
      },
      setFollowedBusinessess,
      user
    );
  }, [fetchFollowedBusinessess, setFollowedBusinessess, user]);

  const isFollowing = Boolean(
    vendorId && followedBusinesses.some((item) => item?.id === vendorId)
  );

  const toggle = useCallback(() => {
    if (!vendorId) return;
    if (isFollowing) unfollowBusiness(vendorId, refresh);
    else followBusiness(vendorId, refresh);
  }, [vendorId, isFollowing, followBusiness, unfollowBusiness, refresh]);

  return { isFollowing, toggle, canFollow: Boolean(vendorId) };
}

export default useFollowVendor;
