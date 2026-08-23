import { useQuery } from "@tanstack/react-query";
import { Client } from "@/lib/client";
import { unwrap } from "@/lib/api/unwrap";
import type { RewardsInfo } from "@/lib/types";

/**
 * Shared rewards/referral info (W2.5/W2.6). `buying`, `selling` and the referrals
 * page each used to fetch /rewards/info independently on mount; as one query they
 * dedupe into a single cached request. Pass `enabled: false` for guests.
 */
export function useRewardsInfo(enabled = true) {
  return useQuery({
    queryKey: ["rewards-info"],
    enabled,
    queryFn: async () => {
      const res = await Client<{ data?: RewardsInfo }>({
        path: "/rewards/info",
        method: "GET",
      });
      return unwrap<RewardsInfo | null>(res.data, null);
    },
  });
}
