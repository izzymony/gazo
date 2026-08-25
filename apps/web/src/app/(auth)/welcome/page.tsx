/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import Loader from "@vibaar/ui/common/Loader";
import useAuthStore from "@/store/authStore";
import useProductStore from "@/store/productStore";
import useShippingStore from "@/store/shippingStore";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { paginatedFetcher } from "./pagination";
import Image from "next/image";
import Button from "@vibaar/ui/common/Button";
import { toast } from "sonner";
import ComingSoonPill from "@vibaar/ui/common/ComingSoonPill";
import { CircleCheck } from "@vibaar/ui/icons";

export default function Welcome() {
  const [activeTab, setActiveTab] = useState("sell");
  const searchParams = useSearchParams();
  const { socialCallback, user, authtypes, isAuthenticated } = useAuthStore();
  const { setAllProducts, fetchAllProduct } = useProductStore();
  const router = useRouter();
  const code = searchParams.get("code") as string;
  const [loading, setLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const caller = async () => {
    try {
      await socialCallback(code, authtypes as any, () => {
        setLoading(false);
        router.replace("/welcome?type=manual");
      });
    } catch (error) {
      console.error("Social auth callback failed:", error);
    } finally {
      // Always clear the loader — a failed OAuth exchange previously left the
      // user stranded on an infinite spinner (W1.7). socialCallback surfaces its
      // own error toast, so clearing here drops them back to this screen to retry.
      setLoading(false);
    }
  };
  const { fetchShippings } = useShippingStore();

  useEffect(() => {
    fetchShippings();
    // W2.4: no cleanup-refetch
  }, [fetchShippings, user]);

  useEffect(() => {
    if (code) {
      setLoading(true);
      caller();
    }
  }, [code]);

  useEffect(() => {
    paginatedFetcher(fetchAllProduct, setAllProducts, user);
  }, []);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };

  const handleNavigation = async () => {
    if (isNavigating) return;

    setIsNavigating(true);

    try {
      if (activeTab === "buy") {
        // TEMPORARY: Marketplace disabled - coming soon
        // DISABLED: router.push("/shop");
        toast.error("Marketplace coming soon!");
        setIsNavigating(false);
        return;
      }

      // For seller flow, check if navigation will go to protected routes
      console.log('🔍 Navigation decision logic:', {
        isAuthenticated,
        hasUser: !!user,
        hasBusinessId: !!user?.business?.id,
        userBusinessObject: user?.business,
        userObject: user ? {id: user.id, user_id: user.user_id, email: user.email} : null
      });
      
      // Check if user is authenticated (cookies are set) rather than checking for ID
      if (!isAuthenticated || !user) {
        // Not authenticated - redirect to signup
        console.log('🔄 Not authenticated - redirecting to signup');
        router.push("/signup?intent=seller");
        setIsNavigating(false);
        return;
      }

      // isAuthenticated + user are verified above, and getMe() succeeded with the
      // cookie, so it IS set and IS sent to the server. Do NOT pre-bounce on a raw
      // client-side Cookies.get() here — on mobile Safari that read false-negatives
      // right after login, stranding authenticated users on /signin (the
      // "log in twice" bug). The middleware re-verifies the cookie server-side on
      // /dashboard from the real request, so that stays the actual gate.
      // Navigate with window.location so the cookie is sent for the SSR request.
      if (!user?.business?.id) {
        console.log('🏪 No business ID - redirecting to create store');
        window.location.href = "/dashboard/storefront/create?step=1";
        // Don't set isNavigating(false) - let the loading persist until page navigates
        return;
      } else {
        console.log('📊 Has business - redirecting to dashboard');
        window.location.href = "/dashboard";
        // Don't set isNavigating(false) - let the loading persist until page navigates
        return;
      }

    } catch (error) {
      console.error('❌ Navigation error:', error);
      toast.error('Navigation failed. Please try again.');
      setIsNavigating(false);
    }
  };

  // Extract username from user object - TypeScript safe
  const getUserName = () => {
    if (!user) return "there";

    // Try existing fields in order of preference (TypeScript safe)
    if (user.user_name) return user.user_name;
    if (user.firstname) return user.firstname;
    if (user.email) {
      // Extract name from email (before @)
      const emailName = user.email.split("@")[0];
      // Capitalize first letter and remove numbers/special chars
      const cleanName = emailName.replace(/[0-9]/g, '').replace(/[^a-zA-Z]/g, '');
      if (cleanName.length > 0) {
        return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
      }
    }

    return "there"; // Fallback
  };

  const userName = getUserName();

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="h-screen w-full max-w-full lg:max-w-5xl lg:mx-auto flex flex-col overflow-hidden">
      {/* Hero Section - Better balanced */}
      <div className="h-[38vh] sm:h-[42vh] md:h-[45vh] relative flex-shrink-0">
        {/* Background Image */}
        <Image
          src="/images/welcome-bg.webp"
          fill
          alt="Welcome background"
          priority
          className="object-cover"
        />

        {/* Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/70 to-transparent z-10" />
      </div>

      {/* Content Section - Strictly controlled height */}
      <div className="flex-1 bg-white flex flex-col min-h-0">
        {/* Scrollable Content Area - Better spaced */}
        <div className="flex-1 px-4 md:px-6 lg:px-8 pb-2 overflow-y-auto min-h-0">
          <div className="max-w-md mx-auto space-y-5">

            {/* Welcome Text */}
            <div className="text-center">
              <h1 className="text-h1 font-medium text-ink-90 leading-tight">
                Welcome to <span className="text-brand font-bold">Vibaar</span>, <span className="font-bold">{userName}</span>! 👋
              </h1>
            </div>

            {/* Tab Switcher */}
            <div className="flex justify-center">
              <div className="flex bg-ink-5 rounded-full p-1 w-full max-w-sm">
                {[
                  { key: "sell", label: "I want to sell", disabled: false },
                  { key: "buy", label: "I want to buy", disabled: true }
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => !option.disabled && handleTabClick(option.key)}
                    disabled={option.disabled}
                    className={`flex-1 py-2 px-3 rounded-full text-body-sm font-medium transition-all duration-200 relative flex items-center justify-center gap-1 ${
                      activeTab === option.key
                        ? "bg-white text-brand shadow-card"
                        : "text-ink-60"
                    } ${option.disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <span>{option.label}</span>
                    {option.disabled && <ComingSoonPill />}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic subtitle */}
            <div className="text-center">
              <h2 className="text-body-lg font-medium text-ink-90">
                {activeTab === "sell" ? "Why sellers choose Vibaar" : "Why buyers love Vibaar"}
              </h2>
            </div>

            {/* Features List */}
            <div className="bg-brand/10 border border-brand/20 rounded-card p-4">
              <ul className="space-y-3">
                {(activeTab === "sell"
                  ? [
                    "Set Up Your Store in Minutes",
                    "Reach more buyers at zero cost",
                    "Manage Orders and Shipping Easily",
                    "Grow Your Business With Vibaar",
                  ]
                  : [
                    "Shop from verified Instagram sellers",
                    "Safe payments with buyer guarantee",
                    "Free shipping on verified orders",
                    "Track orders & connect with sellers",
                  ]
                ).map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <CircleCheck size={18} className="text-brand" />
                    </div>
                    <span className="text-body-sm font-medium text-ink-80">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Fixed Button at Bottom - Guaranteed space */}
        <div className="flex-shrink-0 pb-3 px-4 md:px-6 lg:px-8 bg-white border-t border-ink-10">
          <div className="max-w-md mx-auto">
            <Button
              onClick={handleNavigation}
              loading={isNavigating}
              loadingText={activeTab === "buy" ? "Loading marketplace..." : "Launching store..."}
              variant="filled"
              className="text-body-sm sm:text-body-lg font-semibold">
              {activeTab === "buy" ? "Start shopping" : "Launch your store"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}