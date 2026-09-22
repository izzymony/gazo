"use client";

import Link from "next/link";
import { ChevronRight, FaStar, Gift } from "@vibaar/ui/icons";

/**
 * EarningsCard — the rewards balance, linking through to referrals.
 *
 * It existed twice, ~60 lines apart in `selling.tsx` and `buying.tsx`, as two
 * verbatim copies that had already drifted: the amount was `text-body-lg` on
 * the seller tab and `text-h2` on the buyer tab, so switching modes resized the
 * same number. One of them still carried a comment describing a white circle
 * that had been retokenised to `bg-brandInk/20`.
 *
 * Everything on the brand yellow is `brandInk`. White here is 1.28:1.
 */
export default function EarningsCard({
  amount,
  /** Referral total, shown as a footer line when there is one. */
  referralEarnings = 0,
}: {
  amount: number;
  referralEarnings?: number;
}) {
  return (
    <Link
      href="/profile/referrals"
      className="relative block overflow-hidden rounded-card bg-gradient-to-r from-brand to-brand/70 p-4 text-brandInk shadow-card">
      <div aria-hidden="true" className="absolute right-3 top-2 opacity-30">
        <FaStar size={16} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brandInk/20 backdrop-blur-sm">
            <Gift size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-caption font-normal uppercase tracking-wide text-brandInk/80">
              Available earnings
            </p>
            <p className="text-h2 font-semibold">₦{amount.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-body-sm text-brandInk/70">Earn rewards</span>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brandInk/20">
            <ChevronRight size={14} aria-hidden="true" />
          </div>
        </div>
      </div>

      {referralEarnings > 0 && (
        <div className="mt-3 flex justify-between border-t border-brandInk/20 pt-3 text-caption text-brandInk/70">
          <span>Referral earnings</span>
          <span>₦{referralEarnings.toLocaleString()}</span>
        </div>
      )}
    </Link>
  );
}
