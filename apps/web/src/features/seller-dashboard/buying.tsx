import React from "react";
import Tabs from "@vibaar/ui/common/Tabs";
import Wishlist from "./wishlist";
import Vendor from "./vendor";
import Review from "./reviews";
import useAuthStore from "@/store/authStore";
import UserProfileImage from "@vibaar/ui/common/UserProfileImage";
import { useRewardsInfo } from "@/hooks/useRewardsInfo";
import ListItem from "@vibaar/ui/common/ListItem";
import EarningsCard from "@/features/wallet/EarningsCard";

const Buying = () => {
  const tabs = ["Wishlists", "Vendors", "Reviews"];
  const tabContents = [
    <Wishlist key={0} />,
    <Vendor key={1} />,
    <Review key={2} />,
  ];
  const { user } = useAuthStore();
  // W2.5: shared cached query — dedupes with selling + referrals into one request.
  const { data: rewardsInfo } = useRewardsInfo(!!user);
  // Use fresh rewards info if available, otherwise fallback to user object
  const creditBalance = rewardsInfo
    ? rewardsInfo.total_credit
    : (user?.shopping_credit || 0) + (user?.withdrawable_credit || 0);
  const totalEarned = rewardsInfo?.total_earned || user?.total_referral_earned || 0;
  return (
    <div className="w-full space-y-6">
      {/* The identity row, on the same primitive as the seller tab's store row
          — the two used to be hand-rolled separately with a 48px avatar here
          and a 36px one there, for the same row in the same screen. */}
      <ListItem
        leading={
          <UserProfileImage
            src={user?.profile_image}
            userName={user?.user_name || "User"}
            firstName={user?.firstname}
            lastName={user?.lastname}
            size={40}
          />
        }
        title={[user?.firstname, user?.lastname].filter(Boolean).join(" ")}
        subtitle={user?.user_name ? `@${user.user_name}` : undefined}
      />
      <EarningsCard amount={creditBalance} referralEarnings={totalEarned} />
      <Tabs tabs={tabs} tabContents={tabContents} />
    </div>
  );
};
export default Buying;
