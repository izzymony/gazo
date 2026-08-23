"use client";

import { useEffect, useRef, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import useOnboardingStore from "@/store/onboardingStore";
import useBusinessStore from "@/store/businessStore";

export default function FirstTimeTour() {
  const { tourCompleted, markTourCompleted } = useOnboardingStore();
  const salesDashboard = useBusinessStore((s) => s.salesDashboardAnalytics);
  const totalOrders = salesDashboard?.summary?.total_orders ?? 0;
  const retryCountRef = useRef(0);

  // Skip tour for activated sellers (they already know the product)
  const isActivatedSeller = totalOrders >= 1;

  const startTour = useCallback(() => {
    // Wait for at least one tour target in the DOM
    const quickActions = document.querySelector('[data-tour="quick-actions"]');

    if (!quickActions) {
      if (retryCountRef.current < 10) {
        retryCountRef.current += 1;
        setTimeout(startTour, 1000);
      }
      return;
    }

    try {
      const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: "rgba(0, 0, 0, 0.5)",
        popoverClass: "driverjs-theme",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        onDestroyed: () => {
          markTourCompleted();
        },
        steps: [
          {
            popover: {
              title: "Welcome to your dashboard! 👋",
              description:
                "This is your command centre. See your sales, orders, and store performance at a glance.",
              side: "bottom" as const,
              align: "center" as const,
            },
          },
          {
            element: '[data-tour="store-link"]',
            popover: {
              title: "View & share your storefront",
              description:
                "Tap here to see your store as customers do. Customise your look and share your link to start getting orders!",
              side: "bottom" as const,
              align: "start" as const,
            },
          },
          {
            element: '[data-tour="sales-analytics"]',
            popover: {
              title: "Track your sales",
              description:
                "Monitor your revenue, orders, and store visitors. All your key numbers in one place.",
              side: "bottom" as const,
              align: "center" as const,
            },
          },
          {
            element: '[data-tour="quick-actions"]',
            popover: {
              title: "Quick actions",
              description:
                "Add products and create discounts right from here. The faster you add products, the sooner you start selling!",
              side: "top" as const,
              align: "center" as const,
            },
          },
          {
            element: '[data-tour="recent-activities"]',
            popover: {
              title: "Stay in the loop",
              description:
                "Track your orders, payments, and store activity. Every sale and visitor shows up here.",
              side: "top" as const,
              align: "center" as const,
            },
          },
        ],
      });

      driverObj.drive();
    } catch (err) {
      console.warn("Failed to start tour:", err);
    }
  }, [markTourCompleted]);

  useEffect(() => {
    // Skip if tour already completed or user is an activated seller
    if (tourCompleted || isActivatedSeller) return;

    // Delay to let dashboard fully render
    const timeout = setTimeout(startTour, 2000);

    return () => {
      clearTimeout(timeout);
      retryCountRef.current = 0;
    };
  }, [tourCompleted, isActivatedSeller, startTour]);

  return null;
}
