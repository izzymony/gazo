import React from "react";
import { useRouter } from "next/navigation";
import Tabs from "@vibaar/ui/common/Tabs";
import Wishlist from "./wishlist";
import Vendor from "./vendor";
import Review from "./reviews";
import useAuthStore from "@/store/authStore";
import UserProfileImage from "@vibaar/ui/common/UserProfileImage";
import { useRewardsInfo } from "@/hooks/useRewardsInfo";
import { Gift, FaStar, ChevronRight } from "@vibaar/ui/icons";

// Rewards Access Button Component
const RewardsAccessButton = ({
  creditBalance,
  totalEarned,
  onClick,
}: {
  creditBalance: number;
  totalEarned: number;
  onClick: () => void;
}) => (
  <div onClick={onClick} className="cursor-pointer overflow-hidden">
    {/* Gradient background card */}
    <div className="relative bg-gradient-to-r from-brand to-brand/70 rounded-card p-4 text-white shadow-card">
      {/* Decorative sparkle/star elements (subtle) */}
      <FaStar size={16} className="absolute top-2 right-3 text-white opacity-30" />
      <FaStar size={12} className="absolute bottom-3 right-8 text-white opacity-20" />

      <div className="flex items-center justify-between">
        {/* Left side: Icon + Text */}
        <div className="flex items-center gap-3">
          {/* Gift/Reward icon in white circle */}
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Gift size={20} className="text-white" />
          </div>

          <div>
            <p className="text-white/80 text-caption font-normal uppercase tracking-wide">
              Available Earnings
            </p>
            <p className="text-white text-h2 font-semibold">
              ₦{creditBalance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Right side: CTA indicator */}
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-body-sm">Earn rewards</span>
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <ChevronRight size={14} className="text-white" />
          </div>
        </div>
      </div>

      {/* Optional: Progress bar for referral earnings (if user has referrals) */}
      {totalEarned > 0 && (
        <div className="mt-3 pt-3 border-t border-white/20">
          <div className="flex justify-between text-caption text-white/70 mb-1">
            <span>Referral earnings</span>
            <span>₦{totalEarned.toLocaleString()}</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((totalEarned / 20000) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  </div>
);

const Buying = () => {
  const router = useRouter();
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
      <div className="flex gap-2 items-center py-2">
        <UserProfileImage
          src={user?.profile_image}
          userName={user?.user_name || "User"}
          firstName={user?.firstname}
          lastName={user?.lastname}
          size={48}
        />
        <div className="flex flex-col">
          <p className="font-medium text-body-lg">
            {user?.firstname + " " + user?.lastname}
          </p>
          <p className="font-normal text-body-sm text-ink-40">
            @{user?.user_name}
          </p>
        </div>
      </div>

      {/* Rewards Access Button */}
      <RewardsAccessButton
        creditBalance={creditBalance}
        totalEarned={totalEarned}
        onClick={() => router.push("/profile/referrals")}
      />

      <Tabs tabs={tabs} tabContents={tabContents} />
    </div>
  );
};

export default Buying;
