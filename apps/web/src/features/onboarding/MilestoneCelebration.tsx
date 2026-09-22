"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import ConfettiCelebration from "@vibaar/ui/ConfettiCelebration";
import BottomModal from "@vibaar/ui/common/BottomModal";
import useOnboardingStore, {
  computeChecklistSteps,
  computeCompletionPercent,
} from "@/store/onboardingStore";
import useBusinessStore from "@/store/businessStore";
import { toast } from "sonner";

type MilestoneKey =
  | "first_product"
  | "setup_complete"
  | "first_store_view"
  | "first_sale";

interface MilestoneConfig {
  key: MilestoneKey;
  check: () => boolean;
  emoji: string;
  title: string;
  subtitle: string;
  isModal: boolean;
  ctaLabel?: string;
  ctaRoute?: string;
}

export default function MilestoneCelebration() {
  const router = useRouter();
  const { celebrationsShown, shareLinkClicked, markCelebrationShown } = useOnboardingStore();
  const store = useBusinessStore((s) => s.store);
  // Use businessProduct (seller-specific) to avoid race condition with marketplace products
  const businessProduct = useBusinessStore((s) => s.businessProduct);
  const bankAccounts = useBusinessStore((s) => s.bankAccounts);
  const salesDashboard = useBusinessStore((s) => s.salesDashboardAnalytics);
  const totalOrders = salesDashboard?.summary?.total_orders ?? 0;
  const storeVisitors = salesDashboard?.summary?.store_visitors ?? 0;

  const steps = useMemo(
    () => computeChecklistSteps(store, businessProduct, shareLinkClicked, bankAccounts),
    [store, businessProduct, shareLinkClicked, bankAccounts]
  );
  const percent = useMemo(() => computeCompletionPercent(steps), [steps]);

  const [activeModal, setActiveModal] = React.useState<MilestoneConfig | null>(null);
  const [showConfetti, setShowConfetti] = React.useState(false);

  // Track previous values to detect transitions (was false → now true)
  const prevRef = useRef<Record<string, boolean>>({});
  const initializedRef = useRef(false);

  const milestones: MilestoneConfig[] = useMemo(
    () => [
      {
        key: "first_product",
        // Use businessProduct (seller-specific) - already filtered to seller's products
        check: () => businessProduct.length > 0,
        emoji: "🎉",
        title: "Your first product is live!",
        subtitle: "You're building something great. Keep adding products to attract more customers.",
        isModal: false,
      },
      {
        key: "setup_complete",
        check: () => percent === 100,
        emoji: "🚀",
        title: "Setup complete!",
        subtitle: "You're ready to sell. Share your store link and get your first customer!",
        isModal: true,
        ctaLabel: "Share Store",
        ctaRoute: "/dashboard/storefront",
      },
      {
        key: "first_store_view",
        check: () => storeVisitors >= 1,
        emoji: "👀",
        title: "Someone's checking out your store!",
        subtitle: "Your store is getting attention. Keep it up!",
        isModal: false,
      },
      {
        key: "first_sale",
        check: () => totalOrders >= 1,
        emoji: "🎊",
        title: "FIRST SALE!",
        subtitle: "Congratulations! You're officially in business. This is just the beginning!",
        isModal: true,
        ctaLabel: "View Orders",
        ctaRoute: "/dashboard/orders",
      },
    ],
    [businessProduct, percent, storeVisitors, totalOrders]
  );

  useEffect(() => {
    // Don't initialize until store data has loaded — otherwise initial 0→N
    // transitions from data fetching will be mistaken for real milestones
    if (!store?.id) return;

    // On first run after data loads, snapshot current state — don't celebrate
    if (!initializedRef.current) {
      initializedRef.current = true;
      const snapshot: Record<string, boolean> = {};
      for (const m of milestones) {
        snapshot[m.key] = m.check();
      }
      prevRef.current = snapshot;
      return;
    }

    // On subsequent renders, only celebrate transitions (was false → now true)
    for (const milestone of milestones) {
      if (celebrationsShown[milestone.key]) continue;

      const wasFalse = prevRef.current[milestone.key] === false;
      const isNowTrue = milestone.check();

      if (!wasFalse || !isNowTrue) continue;

      markCelebrationShown(milestone.key);

      if (milestone.isModal) {
        setActiveModal(milestone);
        setShowConfetti(true);
      } else {
        setShowConfetti(true);
        toast(
          `${milestone.emoji} ${milestone.title}`,
          {
            duration: 4000,
            style: {
              background: "#FFF7F8",
              border: "1px solid rgb(var(--brand-rgb) / 0.1)",
              color: "#000000E5",
              fontWeight: 500,
              fontSize: "14px",
            },
          }
        );
        setTimeout(() => setShowConfetti(false), 2500);
      }
      break;
    }

    // Update snapshot
    const snapshot: Record<string, boolean> = {};
    for (const m of milestones) {
      snapshot[m.key] = m.check();
    }
    prevRef.current = snapshot;
  }, [milestones, celebrationsShown, markCelebrationShown, store?.id]);

  return (
    <>
      <ConfettiCelebration
        trigger={showConfetti}
        onComplete={() => setShowConfetti(false)}
        duration={3000}
        particleCount={50}
      />

      {activeModal && (
        <BottomModal
          isOpen={!!activeModal}
          onClose={() => {
            setActiveModal(null);
            setShowConfetti(false);
          }}
        >
          <div className="flex flex-col items-center text-center px-4 py-5">
            <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center mb-3">
              <span className="text-2xl">{activeModal.emoji}</span>
            </div>
            <h2 className="text-body-lg font-semibold text-foreground-primary mb-1.5">
              {activeModal.title}
            </h2>
            <p className="text-body-sm text-foreground-secondary mb-5 max-w-[280px] leading-relaxed">
              {activeModal.subtitle}
            </p>
            {activeModal.ctaRoute && (
              <button
                onClick={() => {
                  setActiveModal(null);
                  setShowConfetti(false);
                  router.push(activeModal.ctaRoute!);
                }}
                className="bg-brand text-brandInk text-body-sm font-semibold px-5 py-3 rounded-full min-h-[44px] w-full touch-manipulation"
                style={{ boxShadow: '4px 8px 24px 0px rgb(var(--brand-rgb) / 0.2)' }}
              >
                {activeModal.ctaLabel}
              </button>
            )}
          </div>
        </BottomModal>
      )}
    </>
  );
}
