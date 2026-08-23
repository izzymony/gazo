"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Store } from "@vibaar/ui/icons";
import useOnboardingStore, {
  computeChecklistSteps,
  computeCompletionPercent,
  getNextStep,
  shouldShowChecklist,
} from "@/store/onboardingStore";
import useBusinessStore from "@/store/businessStore";
import ShareModal from "@vibaar/ui/common/ShareModal";

export default function SetupChecklist() {
  const router = useRouter();
  const {
    checklistDismissed,
    checklistDismissedAt,
    checklistMinimized,
    shareLinkClicked,
    minimizeChecklist,
    expandChecklist,
    markShareLinkClicked,
  } = useOnboardingStore();
  const store = useBusinessStore((s) => s.store);
  // Use businessProduct (seller-specific) to avoid race condition with marketplace products
  const businessProduct = useBusinessStore((s) => s.businessProduct);
  const bankAccounts = useBusinessStore((s) => s.bankAccounts);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Share store URL and text
  const storeUrl = `https://vibaar.com/store/${store?.tag || store?.id}`;
  const shareText = `Check out ${store?.name || "my store"} on Vibaar!`;

  const handleShareStore = () => {
    markShareLinkClicked();

    // Only use Web Share API on mobile devices
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

  const steps = useMemo(
    () => computeChecklistSteps(store, businessProduct, shareLinkClicked, bankAccounts),
    [store, businessProduct, shareLinkClicked, bankAccounts]
  );
  const percent = useMemo(() => computeCompletionPercent(steps), [steps]);
  const nextStep = useMemo(() => getNextStep(steps), [steps]);
  const allComplete = percent === 100;

  const visible = shouldShowChecklist({
    checklistDismissed,
    checklistDismissedAt,
  } as Parameters<typeof shouldShowChecklist>[0]);

  // Don't hide if share modal is open (let user complete the share action)
  if ((!visible || allComplete) && !isShareModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="bg-white border border-ink-10 rounded-card overflow-hidden shadow-card"
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
              <Store size={16} className="text-brand" />
            </div>
            <h3 className="font-medium text-body text-ink-90">
              Complete Your Store Setup
            </h3>
          </div>
          <button
            onClick={() =>
              checklistMinimized ? expandChecklist() : minimizeChecklist()
            }
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label={checklistMinimized ? "Expand checklist" : "Minimize checklist"}
          >
            <ChevronDown
              size={16}
              className={`text-ink-40 transition-transform duration-200 ${
                checklistMinimized ? "" : "rotate-180"
              }`}
            />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-caption text-ink-40">
              {steps.filter((s) => s.completed).length} of {steps.length} complete
            </span>
            <span className="text-caption font-semibold text-brand">{percent}%</span>
          </div>
          <div className="h-1.5 bg-ink-10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Steps (collapsible) */}
        <AnimatePresence initial={false}>
          {!checklistMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 flex flex-col gap-3">
                {steps.map((step) => {
                  const isNext = nextStep?.id === step.id;
                  return (
                    <div
                      key={step.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {step.completed ? (
                          <div className="w-5 h-5 rounded-full bg-green flex items-center justify-center flex-shrink-0">
                            <Check size={10} className="text-white" strokeWidth={2.5} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-[1.5px] border-ink-20 flex-shrink-0" />
                        )}
                        <span
                          className={`text-body-sm ${
                            step.completed
                              ? "text-ink-40 line-through"
                              : isNext
                              ? "text-ink-90 font-medium"
                              : "text-ink-60"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {!step.completed && isNext && (
                        <button
                          onClick={() => {
                            if (step.id === "share_link") {
                              handleShareStore();
                            } else {
                              router.push(step.route);
                            }
                          }}
                          className="bg-brand text-white text-caption font-semibold px-3 rounded-full h-7 whitespace-nowrap flex-shrink-0 touch-manipulation inline-flex items-center justify-center gap-0.5 leading-none active:scale-95 transition-transform"
                          style={{ boxShadow: '0px 2px 10px 0px rgb(var(--brand-rgb) / 0.25)' }}
                        >
                          {step.ctaLabel}
                          <ChevronRight size={12} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tip */}
              <div className="mx-4 mb-3 py-2 px-3 bg-warning/10 rounded-field">
                <p className="text-caption text-warning-strong font-medium">
                  💡 Stores with 3+ products get 3x more views
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Share Modal for Desktop */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Store"
        shareUrl={storeUrl}
        shareText={shareText}
      />
    </AnimatePresence>
  );
}
