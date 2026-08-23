"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@/design-system/common/Button";
import EmptyState from "@/design-system/common/EmptyState";
import useAuthStore from "@/store/authStore";
import { toast } from "sonner";
import { Client } from "@/lib/client";
import { useRewardsInfo } from "@/hooks/useRewardsInfo";
import { AxiosResponse } from "axios";
import {
  ShoppingBag,
  Wallet,
  Clock,
  Copy,
  CircleCheck,
  FaStar,
} from "@/design-system/icons";

export default function ReferralsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // W2.5: shared cached query — dedupes with buying + selling; refetch after actions.
  // Referrals are per-user — don't fire /rewards/info for a guest (it 401s and
  // used to leave the page rendering placeholder "--------"/₦0).
  const { data: referralInfo, isLoading, refetch: refetchRewards } = useRewardsInfo(!!user);

  const username = user?.user_name || "";
  // Use referral_id from API if available, otherwise construct from username
  const referralCode = referralInfo?.referral_id || (username ? `@${username}` : "--------");
  const referralLink = referralInfo?.referral_link || `https://vibaar.com/signup?ref=${username}`;

  const copyCode = () => {
    const message = `Join Vibaar using my referral ID: ${referralCode}

Sign up here: ${referralLink}

Enter "${username}" in the Referral ID field when signing up.`;
    navigator.clipboard.writeText(message);
    toast.success("Referral message copied!");
  };

  const handleShare = async () => {
    const message = `Join Vibaar using my referral ID: ${referralCode}\n\nSign up here: ${referralLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Vibaar",
          text: message,
          url: referralLink,
        });
      } catch {
        // User cancelled or error - fall back to copy
        copyCode();
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      copyCode();
    }
  };

  const handleWithdraw = async () => {
    if (!referralInfo?.can_withdraw) {
      toast.error(
        referralInfo?.withdrawal_message || "Withdrawal not available"
      );
      return;
    }

    try {
      setIsWithdrawing(true);
      const response = (await Client({
        path: "/referral/withdraw",
        method: "POST",
        data: { amount: referralInfo.available_to_withdraw },
      })) as AxiosResponse<{ message: string }>;

      if (response.status === 200) {
        toast.success("Withdrawal successful!");
        refetchRewards(); // Refresh data
      }
    } catch (error) {
      console.error("Withdrawal failed:", error);
      toast.error("Withdrawal failed. Please try again.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const referralHeader = (
    <Header
      showBack
      customText="Rewards & Referrals"
      onBackClick={() => router.back()}
    />
  );

  if (!user) {
    return (
      <PageShell header={referralHeader}>
        <div className="py-16">
          <EmptyState
            icon={<FaStar size={28} />}
            title="Sign in to see your rewards"
            subtitle="Earn shopping credit for every friend you refer — sign in to get your referral ID."
          >
            <div className="mt-6 w-full max-w-[220px]">
              <Button onClick={() => router.push("/signin")}>Sign in</Button>
            </div>
          </EmptyState>
        </div>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell header={referralHeader}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      </PageShell>
    );
  }

  const creditBalance = referralInfo?.total_credit || 0;
  const totalEarned = referralInfo?.total_earned || 0;

  return (
    <PageShell
      header={referralHeader}
      footerAction={
        <Button onClick={handleShare}>Share your referral ID</Button>
      }>
      <div className="space-y-4">
        {/* ===== HERO CARD - Available Earnings ===== */}
        <div className="bg-brand rounded-card p-5 text-white relative overflow-hidden">
          {/* Decorative sparkle elements */}
          <div className="absolute top-2 right-3 opacity-30">
            <FaStar size={16} className="text-white" />
          </div>
          <div className="absolute bottom-3 right-8 opacity-20">
            <FaStar size={12} className="text-white" />
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-white/80 text-caption font-normal">
                Available Earnings
              </p>
              <p className="text-white text-h1 font-medium mt-1">
                {formatCurrency(creditBalance)}
              </p>
              {referralInfo?.withdrawal_message && (
                <p className="text-white/60 text-caption mt-1">
                  {referralInfo.withdrawal_message}
                </p>
              )}
            </div>
            {/* Withdraw button - pill style */}
            <button
              onClick={handleWithdraw}
              disabled={!referralInfo?.can_withdraw || isWithdrawing}
              className={`px-4 py-2 rounded-full text-body-sm font-medium border ${
                referralInfo?.can_withdraw
                  ? "bg-transparent border-white text-white"
                  : "bg-white/20 border-white/30 text-white/70 cursor-not-allowed"
              }`}
            >
              {isWithdrawing ? "..." : "Withdraw"}
            </button>
          </div>
        </div>

        {/* ===== CREDIT ROWS - Like Wallet Pending Balance ===== */}
        <div className="flex flex-col text-ink-60">
          <div className="w-full rounded-field bg-ink-3 flex flex-col">
            {/* Shopping Credit Row */}
            <div className="w-full border-b border-ink-10 flex justify-between items-center gap-2 p-3">
              <div className="items-center flex gap-2">
                <ShoppingBag size={18} className="text-ink-60" />
                <p className="text-body-sm font-medium">Shopping Credit</p>
              </div>
              <div className="items-center flex gap-2">
                <p className="text-body-sm font-medium">
                  {formatCurrency(referralInfo?.shopping_credit || 0)}
                </p>
              </div>
            </div>
            {/* Withdrawable Credit Row */}
            <div className="w-full flex justify-between items-center gap-2 p-3">
              <div className="items-center flex gap-2">
                <Wallet size={18} className="text-ink-60" />
                <p className="text-body-sm font-medium">Withdrawable Credit</p>
              </div>
              <div className="items-center flex gap-2">
                <p className="text-body-sm font-medium">
                  {formatCurrency(referralInfo?.withdrawable_credit || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== PENDING EARNINGS - Row style matching above ===== */}
        {referralInfo && referralInfo.pending_earnings > 0 && (
          <div className="flex flex-col text-ink-60">
            <div className="w-full rounded-field bg-ink-3 flex flex-col">
              <div className="w-full flex justify-between items-center gap-2 p-3">
                <div className="items-center flex gap-2">
                  <Clock size={18} className="text-warning" />
                  <p className="text-body-sm font-medium">Pending Earnings</p>
                </div>
                <div className="items-center flex gap-2">
                  <p className="text-body-sm font-medium text-warning-strong">
                    {formatCurrency(referralInfo.pending_earnings)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== REFERRAL SUMMARY - Static ===== */}
        <div className="w-full">
          <p className="text-body text-ink-90 font-medium mb-2">Referral Summary</p>
          <div className="w-full flex gap-2">
            {/* Total Referrals Card */}
            <div className="rounded-field bg-ink-3 p-3 flex-1">
              <p className="text-ink-90 font-medium text-caption">
                Total Referrals
              </p>
              <p className="text-ink-90 font-normal text-h2">
                {referralInfo?.total_referrals || 0}
              </p>
              {referralInfo && referralInfo.pending_referrals > 0 && (
                <p className="text-caption text-ink-40">
                  {referralInfo.pending_referrals} pending
                </p>
              )}
            </div>
            {/* Total Earned Card */}
            <div className="rounded-field bg-ink-3 p-3 flex-1">
              <p className="text-ink-90 font-medium text-caption">
                Total Earned
              </p>
              <p className="text-success-strong font-normal text-h2">
                {formatCurrency(totalEarned)}
              </p>
            </div>
          </div>
        </div>

        {/* ===== REFERRAL ID SECTION ===== */}
        <div className="bg-white border border-ink-10 rounded-card p-4">
          <p className="text-ink-40 text-caption font-normal mb-2">
            Your Referral ID
          </p>
          <div className="flex items-center justify-between">
            <p className="text-h1 font-mono font-semibold tracking-wider text-ink-90">
              {referralCode}
            </p>
            <button
              onClick={copyCode}
              className="text-brand text-body-sm font-medium px-3 py-1.5 border border-brand rounded-full flex items-center gap-1"
            >
              <Copy size={16} />
              Copy
            </button>
          </div>
        </div>

        {/* ===== HOW IT WORKS ===== */}
        <div className="bg-white border border-ink-10 rounded-card p-4">
          <p className="text-body text-ink-90 font-medium mb-3">How Referrals Work</p>
          <div className="space-y-2 text-body-sm text-ink-60">
            <div className="flex gap-2 items-start">
              <span className="w-5 h-5 bg-brand text-white rounded-full flex items-center justify-center text-caption flex-shrink-0">
                1
              </span>
              <p>Share your referral ID with friends and family</p>
            </div>
            <div className="flex gap-2 items-start">
              <span className="w-5 h-5 bg-brand text-white rounded-full flex items-center justify-center text-caption flex-shrink-0">
                2
              </span>
              <p>They sign up and get <strong>₦1,000 instant shopping credit!</strong></p>
            </div>
            <div className="flex gap-2 items-start">
              <span className="w-5 h-5 bg-brand text-white rounded-full flex items-center justify-center text-caption flex-shrink-0">
                3
              </span>
              <p>When they complete their first order, <strong>you earn ₦500!</strong></p>
            </div>
            <div className="flex gap-2 items-start">
              <span className="w-5 h-5 bg-brand text-white rounded-full flex items-center justify-center text-caption flex-shrink-0">
                4
              </span>
              <p><strong>No limits</strong> - the more you share, the more you earn!</p>
            </div>
          </div>
        </div>

        {/* Referred By Section */}
        {referralInfo?.referred_by && (
          <div className="bg-white border border-ink-10 rounded-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-ink-40 uppercase tracking-wide">Referred by</p>
                <p className="text-body text-ink-90 font-medium mt-0.5">
                  {referralInfo.referred_by}
                </p>
              </div>
              <div className="w-8 h-8 bg-green/10 rounded-full flex items-center justify-center">
                <CircleCheck size={16} className="text-green" />
              </div>
            </div>
            {!referralInfo.referral_activated && (
              <p className="text-caption text-ink-60 mt-2">
                Complete your first order to activate rewards!
              </p>
            )}
          </div>
        )}

        {/* ===== TERMS ===== */}
        <p className="text-caption text-ink-40 text-center px-4">
          Credits never expire. No earning limit. 50% of referral earnings
          withdrawable (min ₦10,000).
        </p>
      </div>
    </PageShell>
  );
}
