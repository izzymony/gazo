"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, CircleCheck, ChevronRight } from "@/design-system/icons";
import useBusinessStore from "@/store/businessStore";
import useOnboardingStore, {
  computeSellerStage,
  computeChecklistSteps,
  computeCompletionPercent,
  shouldShowChecklist,
} from "@/store/onboardingStore";
import ShareModal from "@/design-system/common/ShareModal";

export default function DashboardWelcome() {
  const router = useRouter();
  const store = useBusinessStore((s) => s.store);
  const salesDashboard = useBusinessStore((s) => s.salesDashboardAnalytics);
  // Use businessProduct (seller-specific) to avoid race condition with marketplace products
  const businessProduct = useBusinessStore((s) => s.businessProduct);
  const bankAccounts = useBusinessStore((s) => s.bankAccounts);
  const { shareLinkClicked, markShareLinkClicked, checklistDismissed, checklistDismissedAt } = useOnboardingStore();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const totalOrders = salesDashboard?.summary?.total_orders ?? 0;
  const stage = useMemo(() => computeSellerStage(businessProduct, totalOrders), [businessProduct, totalOrders]);
  const steps = useMemo(
    () => computeChecklistSteps(store, businessProduct, shareLinkClicked, bankAccounts),
    [store, businessProduct, shareLinkClicked, bankAccounts]
  );
  const percent = useMemo(() => computeCompletionPercent(steps), [steps]);
  const stepsRemaining = steps.filter((s) => !s.completed).length;

  // Share store URL and text
  const storeUrl = `https://myinstashop.co/store/${store?.tag || store?.id}`;
  const shareText = `Check out ${store?.name || "my store"} on Vibaar!`;

  // Activated sellers see the normal dashboard
  if (stage === "activated") return null;

  // For returning sellers, hide this card if SetupChecklist is visible
  // (SetupChecklist already provides the detailed guidance they need)
  const checklistVisible = shouldShowChecklist({ checklistDismissed, checklistDismissedAt } as Parameters<typeof shouldShowChecklist>[0]);
  if (stage === "returning" && checklistVisible && percent < 100) return null;

  const handleShareStore = () => {
    markShareLinkClicked();

    // Only use Web Share API on mobile devices (desktop share sheets aren't useful)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (navigator.share && isMobile) {
      navigator.share({
        title: store?.name || "My Store",
        text: shareText,
        url: storeUrl,
      }).catch(() => {
        // User cancelled share
      });
    } else {
      // Desktop: open share modal
      setIsShareModalOpen(true);
    }
  };

  if (stage === "new") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white border border-ink-10 rounded-xl p-4 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FFEAEE] flex items-center justify-center flex-shrink-0">
            <Heart size={20} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-body text-ink-90 mb-1">
              Welcome, {store?.name || "there"}!
            </h3>
            <p className="text-body-sm text-ink-60 leading-relaxed mb-3">
              You&apos;re {stepsRemaining} step{stepsRemaining !== 1 ? "s" : ""} away
              from your first customer. Add a product to get started!
            </p>
            <button
              onClick={() => router.push("/dashboard/catalog/product/create/manual/new")}
              className="bg-brand text-white text-body-sm font-semibold px-4 py-2.5 rounded-full min-h-[40px] w-full touch-manipulation flex items-center justify-center gap-1"
              style={{ boxShadow: '4px 8px 24px 0px rgb(var(--brand-rgb) / 0.2)' }}
            >
              Add Your First Product
              <ChevronRight size={16} strokeWidth={2} />
            </button>
            <p className="text-caption text-ink-40 mt-2.5">
              💡 Stores with 3+ products get 3x more views
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Returning seller (1+ products, 0 sales)
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white border border-ink-10 rounded-xl p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#E8FFF3] flex items-center justify-center flex-shrink-0">
          <CircleCheck size={20} className="text-[#06C270]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-body text-ink-90 mb-1">
            Your store is live!
          </h3>
          <p className="text-body-sm text-ink-60 leading-relaxed mb-3">
            Share your store link to get your first customer. Vendors who share
            get their first sale within a week.
          </p>
          {percent < 100 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-1.5 bg-ink-10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#06C270] rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-caption font-semibold text-[#06C270]">{percent}%</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleShareStore}
              className="flex-1 bg-brand text-white text-body-sm font-semibold px-4 py-2.5 rounded-full min-h-[40px] touch-manipulation flex items-center justify-center gap-1"
              style={{ boxShadow: '4px 8px 24px 0px rgb(var(--brand-rgb) / 0.2)' }}
            >
              Share Store
              <ChevronRight size={16} strokeWidth={2} />
            </button>
            <button
              onClick={() => router.push("/dashboard/catalog/product/create/manual/new")}
              className="px-4 py-2.5 rounded-full min-h-[40px] border border-brand text-brand text-body-sm font-medium touch-manipulation"
            >
              Add Products
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal for Desktop */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Store"
        shareUrl={storeUrl}
        shareText={shareText}
      />
    </motion.div>
  );
}
