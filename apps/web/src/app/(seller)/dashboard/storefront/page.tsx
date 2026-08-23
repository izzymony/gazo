"use client";
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from "sonner";
import VendorStoreFront from "@/features/storefront";
import BottomNav from "@/features/seller-shell/BottomNav";
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
      {/* ✅ SAFE: Enhanced VendorStoreFront with optional props */}
      <div className={isNewStore ? 'new-store-context w-full' : 'w-full'}>
        <VendorStoreFront
          isNewStore={isNewStore}
          storeName={storeName}
        />
      </div>

      <BottomNav />

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
        
        /* New store context styling */
        .new-store-context {
        position: relative;
        }

        /* Enhanced styles for new stores - target AllProducts component */
        .new-store-context .add-product-btn,
        .new-store-context [class*="add-product"] {
          background: linear-gradient(135deg, #ff4757, #ff3742) !important;
          box-shadow: 0 4px 15px rgba(255, 71, 87, 0.3) !important;
          animation: gentle-pulse 2s infinite;
        }
        
        @keyframes gentle-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
      `}</style>
    </>
  );
};

export default StoreFrontPage;