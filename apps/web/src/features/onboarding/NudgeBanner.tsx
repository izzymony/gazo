"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "@vibaar/ui/icons";
import BottomModal from "@vibaar/ui/common/BottomModal";
import useOnboardingStore, {
  computeChecklistSteps,
  getCurrentNudge,
} from "@/store/onboardingStore";
import useBusinessStore from "@/store/businessStore";

/**
 * NudgeBanner - Shows a modal nudge after 7 days if setup is incomplete.
 * Inline banners were removed as the SetupChecklist already provides guidance.
 */
export default function NudgeBanner() {
  const router = useRouter();
  const { lastNudgeDismissedAt, shareLinkClicked, dismissNudge } = useOnboardingStore();
  const store = useBusinessStore((s) => s.store);
  // Use businessProduct (seller-specific) to avoid race condition with marketplace products
  const businessProduct = useBusinessStore((s) => s.businessProduct);
  const bankAccounts = useBusinessStore((s) => s.bankAccounts);

  const steps = useMemo(
    () => computeChecklistSteps(store, businessProduct, shareLinkClicked, bankAccounts),
    [store, businessProduct, shareLinkClicked, bankAccounts]
  );
  const allComplete = steps.every((s) => s.completed);

  const nudge = useMemo(
    () => getCurrentNudge(steps, store?.created_at, lastNudgeDismissedAt),
    [steps, store?.created_at, lastNudgeDismissedAt]
  );

  // Only show the 7-day modal nudge, not inline banners
  if (!nudge || allComplete || !nudge.isModal) return null;

  return (
    <BottomModal isOpen={true} onClose={dismissNudge}>
      <div className="flex flex-col items-center text-center px-4 py-6">
        <div className="w-14 h-14 rounded-full bg-[#FFEAEE] flex items-center justify-center mb-4">
          <ShoppingBag size={28} className="text-brandDeep" />
        </div>
        <h2 className="text-body-lg font-semibold text-foreground-primary mb-2">
          Ready to start selling?
        </h2>
        <p className="text-body-sm text-foreground-secondary mb-5 max-w-[280px] leading-relaxed">
          {nudge.message}
        </p>
        <button
          onClick={() => {
            dismissNudge();
            router.push(nudge.ctaRoute);
          }}
          className="bg-brand text-brandInk text-body-sm font-semibold px-5 py-3 rounded-full min-h-[44px] w-full mb-2 touch-manipulation"
          style={{ boxShadow: '4px 8px 24px 0px rgb(var(--brand-rgb) / 0.2)' }}
        >
          {nudge.ctaLabel}
        </button>
        <button
          onClick={dismissNudge}
          className="text-body-sm text-foreground-muted min-h-[40px] px-4 touch-manipulation"
        >
          Remind me later
        </button>
      </div>
    </BottomModal>
  );
}
