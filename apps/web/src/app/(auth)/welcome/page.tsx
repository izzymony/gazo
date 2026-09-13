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
import { SIGNUP_PATH, resolveSellerDestination } from "@/lib/sellerDestination";
import Image from "next/image";
import Button from "@vibaar/ui/common/Button";
import { toast } from "sonner";
import { CircleCheck } from "@vibaar/ui/icons";
import AuthSplitShell from "@vibaar/ui/AuthSplitShell";
import BrandLogo from "@vibaar/ui/common/BrandLogo";
import useMediaActive from "@vibaar/ui/common/useMediaActive";

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
        router.push("/shop");
        return;
      }

      // Seller flow. The signed-out / no-store / has-store branch is shared with
      // the marketing site's CTAs — see resolveSellerDestination. It used to be
      // written out here, and a second copy of it on the home page would drift.
      const { href, isSignedIn } = resolveSellerDestination(user, isAuthenticated);

      if (!isSignedIn) {
        router.push(`${SIGNUP_PATH}?intent=seller`);
        setIsNavigating(false);
        return;
      }

      // isAuthenticated + user are verified above, and getMe() succeeded with the
      // cookie, so it IS set and IS sent to the server. Do NOT pre-bounce on a raw
      // client-side Cookies.get() here — on mobile Safari that read false-negatives
      // right after login, stranding authenticated users on /signin (the
      // "log in twice" bug). The middleware re-verifies the cookie server-side on
      // /dashboard from the real request, so that stays the actual gate.
      // Navigate with window.location so the cookie is sent for the SSR request,
      // and leave isNavigating set so the loader holds until the page changes.
      window.location.href = href;

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

  // Desktop wordmark: a mount, not a `hidden` class — see the slot below.
  const showWordmark = useMediaActive("md");

  if (loading) {
    return <Loader />;
  }

  return (
    <AuthSplitShell
      media={
        <>
          <Image
            src="/images/welcome-bg-v3.webp"
            fill
            alt=""
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />

          {/* One complete artwork, rendered edge to edge, with the crop left
              to object-cover. The fade is CSS and mobile-only: it joins the
              band to the content beneath it, which the detached desktop pane
              has no need of — there the image shows uninterrupted. Kept out
              of the asset deliberately, so the two crops stay independent. */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface via-surface/70 to-transparent md:hidden" />
        </>
      }
      contentClassName="gap-5"
      footerAction={
        <Button
          onClick={handleNavigation}
          loading={isNavigating}
          loadingText={activeTab === "buy" ? "Loading marketplace..." : "Launching store..."}
          variant="filled"
          className="text-body-sm sm:text-body-lg font-semibold">
          {activeTab === "buy" ? "Start shopping" : "Launch your store"}
        </Button>
      }>
      <div className="text-center">
{/* Desktop wordmark, so this column opens the way the auth screens
            do — they share a frame and should start the same way.

            Gated on a MOUNT rather than `hidden md:block`: a display:none
            image is still fetched, so the class alone shipped it to every
            phone. `useMediaActive` is false on the server, so it never reaches
            the mobile HTML.

            Not on mobile by design either: the greeting already reads
            "Welcome to Vibaar", so a wordmark directly above it says the brand
            twice inside 80px. (Unlike the auth artwork, welcome's hero carries
            no mark of its own — the headline is what carries it.)

            The box is reserved at its rendered height, because this column is
            vertically centred and a post-hydration mount would otherwise shift
            everything beneath it. */}
        <div className="hidden md:flex md:h-14 md:mb-8 md:items-center md:justify-center">
          {showWordmark && <BrandLogo width={180} />}
        </div>

        {/* Matches SlideContent's scale exactly. It was `text-h1` at every
            width, so beside a 40px auth headline in the same frame this one
            read as a different screen. */}
        <h1 className="text-h1 md:text-display md:leading-[44px] font-medium text-foreground-primary leading-tight text-balance">
          Welcome to <span className="text-brandDeep font-bold">Vibaar</span>, <span className="font-bold">{userName}</span>! 👋
        </h1>
      </div>

      <div className="flex justify-center">
        <div className="flex bg-surface-muted rounded-full p-1 w-full max-w-sm">
          {[
            { key: "sell", label: "I want to sell" },
            { key: "buy", label: "I want to buy" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleTabClick(option.key)}
              aria-pressed={activeTab === option.key}
              className={`relative flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2 text-body-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40 ${
                activeTab === option.key
                  ? "bg-surface text-brandDeep shadow-card"
                  : "text-foreground-secondary"
              }`}>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-body-lg font-medium text-foreground-primary">
          {activeTab === "sell" ? "Why sellers choose Vibaar" : "Why buyers love Vibaar"}
        </h2>
      </div>

      <div className="bg-brand/10 border border-brandDeep/20 rounded-card p-4">
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
                <CircleCheck size={18} className="text-brandDeep" />
              </div>
              <span className="text-body-sm font-medium text-foreground-primary">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </AuthSplitShell>
  );
}
