import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import createQuotaSafeStorage from "@/utils/quotaSafeStorage";
import useBusinessStore, { BusinessProduct } from "./businessStore";

export interface ChecklistStep {
  id: "store_created" | "add_products" | "add_bank" | "set_address" | "share_link";
  label: string;
  completed: boolean;
  route: string;
  ctaLabel: string;
}

export type SellerStage = "new" | "returning" | "activated";

export type NudgeType = "products" | "bank" | "general" | "modal";

export interface NudgeConfig {
  type: NudgeType;
  message: string;
  ctaLabel: string;
  ctaRoute: string;
  isModal: boolean;
}

interface OnboardingState {
  // Persisted UI state
  userId: string | null; // Track which user this state belongs to
  checklistDismissed: boolean;
  checklistDismissedAt: string | null;
  checklistMinimized: boolean;
  tourCompleted: boolean;
  celebrationsShown: Record<string, boolean>;
  lastNudgeDismissedAt: string | null;
  shareLinkClicked: boolean;

  // Actions
  initForUser: (userId: string) => void;
  dismissChecklist: () => void;
  minimizeChecklist: () => void;
  expandChecklist: () => void;
  markTourCompleted: () => void;
  markCelebrationShown: (key: string) => void;
  dismissNudge: () => void;
  markShareLinkClicked: () => void;
}

// Compute checklist steps from store data (pass values from hooks, not getState)
// Uses businessProduct from businessStore (seller-specific) to avoid race condition
// with marketplace products from productStore
export function computeChecklistSteps(
  store: ReturnType<typeof useBusinessStore.getState>["store"],
  businessProduct: BusinessProduct[],
  shareLinkClicked: boolean,
  bankAccounts: { id: string }[] = []
): ChecklistStep[] {
  return [
    {
      id: "store_created",
      label: "Create your store",
      completed: !!store?.id,
      route: "/dashboard/storefront/create-splash",
      ctaLabel: "Create",
    },
    {
      id: "add_products",
      label: "Add your first product",
      // Use businessProduct (seller-specific) - not affected by marketplace product fetches
      completed: businessProduct.length > 0,
      route: "/dashboard/catalog/product/create/manual/new",
      ctaLabel: "Add Product",
    },
    {
      id: "add_bank",
      label: "Add bank account",
      // Check both bankAccounts array and legacy business_bank_account_detail
      completed: bankAccounts.length > 0 || !!store?.business_bank_account_detail?.account,
      route: "/dashboard/payouts/addaccount",
      ctaLabel: "Add Bank",
    },
    {
      id: "set_address",
      label: "Set business address",
      completed: !!store?.address?.address_line,
      route: "/dashboard/storefront/address",
      ctaLabel: "Set Address",
    },
    {
      id: "share_link",
      label: "Share your store link",
      completed: shareLinkClicked,
      route: `/dashboard/storefront`,
      ctaLabel: "Share",
    },
  ];
}

export function computeCompletionPercent(steps: ChecklistStep[]): number {
  if (steps.length === 0) return 0;
  const completed = steps.filter((s) => s.completed).length;
  return Math.round((completed / steps.length) * 100);
}

export function computeSellerStage(
  businessProduct: BusinessProduct[],
  totalOrders: number
): SellerStage {
  if (totalOrders >= 1) return "activated";
  // Use businessProduct (seller-specific) - already filtered to seller's products
  if (businessProduct.length > 0) return "returning";
  return "new";
}

export function getNextStep(steps: ChecklistStep[]): ChecklistStep | null {
  return steps.find((s) => !s.completed) || null;
}

export function shouldShowChecklist(state: OnboardingState): boolean {
  if (!state.checklistDismissed) return true;
  if (!state.checklistDismissedAt) return true;

  const dismissedAt = new Date(state.checklistDismissedAt).getTime();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  return Date.now() - dismissedAt > threeDaysMs;
}

export function getCurrentNudge(
  steps: ChecklistStep[],
  storeCreatedAt: string | undefined,
  lastNudgeDismissedAt: string | null
): NudgeConfig | null {
  // Respect dismiss for 3 days
  if (lastNudgeDismissedAt) {
    const dismissedAt = new Date(lastNudgeDismissedAt).getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    if (Date.now() - dismissedAt < threeDaysMs) return null;
  }

  if (!storeCreatedAt) return null;

  const daysSinceSignup = Math.floor(
    (Date.now() - new Date(storeCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const hasProducts = steps.find((s) => s.id === "add_products")?.completed;
  const hasBank = steps.find((s) => s.id === "add_bank")?.completed;

  if (!hasProducts && daysSinceSignup >= 7) {
    return {
      type: "modal",
      message: "Complete your store setup and start earning. Vendors who set up this week get their first sale faster.",
      ctaLabel: "Complete Setup",
      ctaRoute: "/dashboard/catalog/product/create/manual/new",
      isModal: true,
    };
  }
  if (!hasProducts && daysSinceSignup >= 2) {
    return {
      type: "products",
      message: "Add your first product to start selling. It takes less than 2 minutes.",
      ctaLabel: "Add Product",
      ctaRoute: "/dashboard/catalog/product/create/manual/new",
      isModal: false,
    };
  }
  if (hasProducts && !hasBank && daysSinceSignup >= 3) {
    return {
      type: "bank",
      message: "Add your bank details so you can receive payments when customers order.",
      ctaLabel: "Add Bank",
      ctaRoute: "/dashboard/payouts/addaccount",
      isModal: false,
    };
  }
  if (!hasProducts && daysSinceSignup >= 1) {
    return {
      type: "general",
      message: "Vendors who complete setup this week get 3x more store views.",
      ctaLabel: "Continue Setup",
      ctaRoute: "/dashboard/catalog/product/create/manual/new",
      isModal: false,
    };
  }

  return null;
}

const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      userId: null,
      checklistDismissed: false,
      checklistDismissedAt: null,
      checklistMinimized: false,
      tourCompleted: false,
      celebrationsShown: {},
      lastNudgeDismissedAt: null,
      shareLinkClicked: false,

      initForUser: (newUserId: string) =>
        set((state) => {
          // If same user, keep state
          if (state.userId === newUserId) return state;
          // Different user — reset all onboarding state
          return {
            userId: newUserId,
            checklistDismissed: false,
            checklistDismissedAt: null,
            checklistMinimized: false,
            tourCompleted: false,
            celebrationsShown: {},
            lastNudgeDismissedAt: null,
            shareLinkClicked: false,
          };
        }),

      dismissChecklist: () =>
        set({
          checklistDismissed: true,
          checklistDismissedAt: new Date().toISOString(),
        }),

      minimizeChecklist: () => set({ checklistMinimized: true }),
      expandChecklist: () => set({ checklistMinimized: false }),

      markTourCompleted: () => set({ tourCompleted: true }),

      markCelebrationShown: (key: string) =>
        set((state) => ({
          celebrationsShown: { ...state.celebrationsShown, [key]: true },
        })),

      dismissNudge: () =>
        set({ lastNudgeDismissedAt: new Date().toISOString() }),

      markShareLinkClicked: () => set({ shareLinkClicked: true }),
    }),
    {
      name: "onboarding-store",
      storage: createJSONStorage(() => createQuotaSafeStorage()),
      partialize: (state) => ({
        userId: state.userId,
        checklistDismissed: state.checklistDismissed,
        checklistDismissedAt: state.checklistDismissedAt,
        checklistMinimized: state.checklistMinimized,
        tourCompleted: state.tourCompleted,
        celebrationsShown: state.celebrationsShown,
        lastNudgeDismissedAt: state.lastNudgeDismissedAt,
        shareLinkClicked: state.shareLinkClicked,
      }),
    }
  )
);

export default useOnboardingStore;
