"use client";
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from "sonner";
import VendorStoreFront from "@/features/storefront";
import ConfettiCelebration from "@vibaar/ui/ConfettiCelebration";

const StoreFrontPage = () => {
  const searchParams = useSearchParams();
  const [isNewStore, setIsNewStore] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    // ✅ SAFE: Check if this is a new store from multiple sources
    const newStoreParam = searchParams.get('newStore') === 'true';
    const newStoreFlag = localStorage.getItem('newStoreCreated') === 'true';
    const isNewStoreDetected = newStoreParam || newStoreFlag;

    if (isNewStoreDetected) {
      setIsNewStore(true);

      // Get store name for personalized messaging
      const savedStoreName = localStorage.getItem('newStoreName') || '';
      setStoreName(savedStoreName);

      // Simple success toast using design system
      toast.success(
        savedStoreName ? `${savedStoreName} is now live!` : 'Your store is now live!',
        {
          duration: 3000,
          position: 'top-center',
        }
      );

      // Trigger confetti after a brief delay
      setTimeout(() => {
        setShowConfetti(true);
      }, 500);

      // ✅ SAFE: Clean up flags and URL parameter
      localStorage.removeItem('newStoreCreated');
      localStorage.removeItem('newStoreName');
      localStorage.removeItem('newStoreTag');

      // Clean URL parameter without page reload
      if (newStoreParam && typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('newStore');
        window.history.replaceState({}, '', url.toString());
      }

      // Reset new store state after 30 seconds
      setTimeout(() => {
        setIsNewStore(false);
      }, 30000);
    }
  }, [searchParams]);

  return (
    <>
      {/* No wrapper. The storefront owns its own scroll region and needs the
          frame's height to resolve against; a height-less div in between is
          what stopped `h-full` resolving and killed the collapse-on-scroll.
          The old `.new-store-context` class also made this a conditional
          positioned ancestor, so the page's absolute children changed their
          containing block depending on whether the store was newly created. */}
      <VendorStoreFront
        isNewStore={isNewStore}
        storeName={storeName}
      />

      {/* ✅ SAFE: Confetti Animation */}
      <ConfettiCelebration
        trigger={showConfetti}
        onComplete={() => setShowConfetti(false)}
        duration={3000}
        particleCount={50}
      />

      {/* ✅ SAFE: Global styles for enhanced new store experience */}
      <style jsx global>{`
        @keyframes enter {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes leave {
          0% {
            transform: translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        .animate-enter {
          animation: enter 0.35s ease-out;
        }
        
        .animate-leave {
          animation: leave 0.2s ease-in forwards;
        }
      `}</style>
    </>
  );
};

export default StoreFrontPage;