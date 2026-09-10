"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Tabs from "@vibaar/ui/common/Tabs";
import VendorDataSort from "@/features/storefront/VendorDatatSort";
import AllProducts from "@/features/storefront/AllProducts";
import useScroll from "@/hooks/useScroll";
import { usePathname, useSearchParams, useParams, useRouter } from "next/navigation";
import Loader from "@vibaar/ui/common/Loader";
import StorefrontSkeleton from "./StorefrontSkeleton";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import { Modal } from "@vibaar/ui/modal/Modal";
import Image from "next/image";
import VendorNav from "./VendorNav";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Button from "@vibaar/ui/common/Button";
import { formatNigerianCurrency } from "@/lib/utils";
import { paginatedFetcher } from "@/app/(auth)/welcome/pagination";
import useAuthStore from "@/store/authStore";
import { trackStoreViewed } from "@/lib/analytics";
import { toast } from "sonner";
import { Check, Copy, FaStar, Add } from "@vibaar/ui/icons";
import IconButton from "@vibaar/ui/common/IconButton";
import { getPublicProductUrl, getPublicStoreUrl } from "@/lib/shareUrls";
import Badge from "@vibaar/ui/common/Badge";
import StorefrontHeader from "@/features/storefront/StorefrontHeader";
import KebabMenu from "@vibaar/ui/common/header/KebabMenu";
import Link from "next/link";
import ShareModal from "@vibaar/ui/common/ShareModal";

// One class string for the six stat labels — it was repeated verbatim in each,
// with a hardcoded leading/tracking pair that is not on the type scale.
const STAT_LABEL = "text-caption font-normal text-center text-foreground-secondary";

// ✅ ENHANCED: Added optional props for new store experience
interface VendorStoreFrontProps {
  isNewStore?: boolean;
  storeName?: string;
  // STOREFRONT-URL-REWORK: when rendered by /@{handle}, the vendor is resolved by
  // this stable tag (indexed by-tag lookup) instead of the legacy name-search.
  storeTag?: string;
  // Rev-2 server-prime: the /@{handle} route resolves the store server-side and
  // passes it here so the client renders without a by-tag round-trip.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialStore?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialProducts?: any[];
}

const VendorStoreFront: React.FC<VendorStoreFrontProps> = ({
  isNewStore = false,
  storeName = "",
  storeTag = "",
  initialStore,
  initialProducts
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  // Owner (the seller's own dashboard) vs public (a shopper on /@handle).
  // Derived from the route, not held in state: it used to be a `useState` filled
  // by an effect, so the first render of every storefront was a `null` mode that
  // forced a skeleton even for the owner. A `pro` flag rode along hardcoded
  // `true`, making every branch on it unreachable.
  const isOwnerView = pathname.includes("/dashboard");
  const [isFollowed, setIsFollowed] = useState(false);
  const [smallHeaderEl, setSmallHeaderEl] = useState<HTMLDivElement | null>(null);
  const [smallHeaderHeight, setSmallHeaderHeight] = useState(52);
  const tab = ["Products", "Deals", "Reviews"];
  const { isScrolled, scrollRef } = useScroll(20);
  const searchParams = useSearchParams();
  const { stor: viewedStore, store: ownStore, storeStats, fetchStoreStats, theme, stores, getStoreById, fetchStores, fetchStoresBySearch, fetchStoreByTag, setStore, businessProduct, getAuthenticatedUserStore, fetchBusinessProduct, setBusinessProducts } = useBusinessStore();
  const { user } = useAuthStore();
  const [isPublishSuccessful, setIsPublishSuccessful] = useState(
    searchParams.get("status") === "new-product"
  );
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchValue, setSearchValue] = useState("");
  const [sortToggle, setSortToggle] = useState(false);
  const [isLoadingVendor, setIsLoadingVendor] = useState(true);

  const [copied, setCopied] = useState(false);
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
  const [isHeroMenuOpen, setIsHeroMenuOpen] = useState(false);
  const [isShareStoreOpen, setIsShareStoreOpen] = useState(false);

  const handleCopyLink = (shareLink: string) => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink).then(() => {
        setCopied(true);
        toast.success("Link copied!", { duration: 2000 });
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        toast.error("Failed to copy link");
      });
    }
  };

  // Default stats display
  const stats = [
    {
      // A brand-new store used to be given a fabricated 5.0. It has no ratings;
      // it shows none.
      value: (
        <span className="flex items-center gap-1">
          {storeStats.ratings ? Number(storeStats.ratings).toFixed(1) : "—"}
          <FaStar size={14} className="text-warning-foreground" aria-hidden="true" />
        </span>
      ),
      label: (
        <p className={STAT_LABEL}>
          Store Ratings
        </p>
      ),
    },
    {
      value: formatNigerianCurrency(storeStats.products_sold),
      label: (
        <p className={STAT_LABEL}>
          Products Sold
        </p>
      ),
    },
    {
      value: formatNigerianCurrency(storeStats.followers_count),
      label: (
        <p className={STAT_LABEL}>
          Followers
        </p>
      ),
    },
    {
      // Rounded: the API returns a raw float, and the card rendered
      // "550.74335 hours".
      value: storeStats.avg_order_prep_time
        ? `${Math.round(storeStats.avg_order_prep_time)} hrs`
        : "N/A",
      label: (
        <p className={STAT_LABEL}>
          Average Order <br />
          Preparation Time
        </p>
      ),
    },
    {
      value: storeStats.avg_delivery_time
        ? `${Math.round(storeStats.avg_delivery_time)} days`
        : "N/A",
      label: (
        <p className={STAT_LABEL}>
          Average <br />
          Delivery Time
        </p>
      ),
    },
    {
      value: storeStats.fulfilment_rate || "0%",
      label: (
        <p className={STAT_LABEL}>
          Fulfillment Rate
        </p>
      ),
    },
  ];

  const { fetchProducts, setProducts } = useProductStore();

  // ONE resolved vendor for the whole screen. The owner surface reads the
  // signed-in user's own business; the public surface reads the vendor resolved
  // from the URL tag. Every effect and every child now keys off this single
  // value — the effects below used to read the public slot unconditionally,
  // which only worked because the owner's business was being written into it
  // too (the leak that showed a seller their own store on other vendors' pages).
  const currentStore = isOwnerView ? ownStore : viewedStore;
  const currentStoreId = currentStore?.id;

  // Rev-2 server-prime: seed the vendor's products from the server-resolved initial
  // data so AllProducts renders on first paint (before/instead of the client fetch).
  useEffect(() => {
    if (initialProducts?.length) setProducts(initialProducts);
  }, [initialStore?.id]);

  // Fetch analytics + the vendor's products when the store resolves.
  useEffect(() => {
    if (!currentStoreId) return;
    fetchStoreStats(currentStoreId);
    // Cold-deep-link fix (URL rework): on a direct /@{handle} visit the global
    // `products` is empty, so AllProducts has nothing to filter. Load THIS vendor's
    // products (targeted /products?business_id, not the 250-row marketplace pull) —
    // UNLESS the server already primed them for this exact store.
    if (!isOwnerView) {
      const productsPrimed =
        !!initialProducts?.length && initialStore?.id === currentStoreId;
      if (!productsPrimed) fetchProducts(currentStoreId);
    }
  }, [currentStoreId, isOwnerView]);

  // P16: server-side storefront search + tag filter — refetch page 1 with the current
  // search term AND active tag when either changes (debounced), so filtering stays
  // consistent with pagination instead of only filtering the loaded pages. Skips the
  // first run (the initial/primed load covers the empty search + "All" tag).
  const filterInitRef = useRef(false);
  useEffect(() => {
    if (!currentStoreId || isOwnerView) return;
    if (!filterInitRef.current) {
      filterInitRef.current = true;
      return;
    }
    const tag = activeFilter === "All" ? "" : activeFilter;
    const t = setTimeout(() => fetchProducts(currentStoreId, searchValue, tag), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, activeFilter, currentStoreId]);

  // Rev-2 server-prime: seed the store from the server-resolved initial data so the
  // first paint has the vendor without a by-tag round-trip (runs before the loader).
  useEffect(() => {
    if (initialStore?.id) setStore(initialStore, true);
  }, [initialStore?.id]);

  // CONSOLIDATED EFFECT: Load store and products based on mode (seller vs buyer)
  useEffect(() => {
    const loadStoreData = async () => {
      setIsLoadingVendor(true);

      const vendorName = params.vendor as string;

      try {
        if (isOwnerView) {
          // Seller mode: load the authenticated user's store + all product pages.
          await getAuthenticatedUserStore();
          await paginatedFetcher(fetchBusinessProduct, setBusinessProducts, user);
        } else if (storeTag) {
          // Buyer mode, /@{handle}: resolve by the stable tag — ONE indexed lookup.
          // Rev-2 server-prime: skip the fetch when the server already resolved this
          // exact store (initialStore seeded below).
          const primed =
            initialStore?.tag?.toLowerCase() === storeTag.toLowerCase();
          if (!primed) await fetchStoreByTag(storeTag);
        } else if (vendorName) {
          // Legacy /shop/[vendor]: exact-match the marketplace store by name/tag.
          await fetchStoresBySearch(decodeURIComponent(vendorName));
        }
      } catch (error) {
        console.error("Error loading store data:", error);
      } finally {
        setIsLoadingVendor(false);
      }
    };

    // Only run when the tag/vendor or path changes
    loadStoreData();
  }, [storeTag, params.vendor, pathname, getAuthenticatedUserStore, fetchStoreByTag, fetchStoresBySearch, fetchBusinessProduct, setBusinessProducts, user]);

  // Measure the compact header so the sticky tab bar and filter row sit exactly
  // below it (its height varies with the store's theme/name) — no gap, no overlap.
  //
  // Driven by a CALLBACK ref. It used to read a RefObject in a mount effect with
  // `[]` deps: this screen renders a skeleton first, so the header did not exist
  // when that effect ran, and a ref object's identity never changes, so it never
  // ran again. The height stayed at its 64px guess forever while the real header
  // measured 52 — the tab bar stuck 12px too low and content showed through.
  useEffect(() => {
    if (!smallHeaderEl) return;
    const measure = () => setSmallHeaderHeight(smallHeaderEl.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(smallHeaderEl);
    return () => ro.disconnect();
  }, [smallHeaderEl]);

  // Track store view for buyer mode (not for sellers viewing their own store)
  useEffect(() => {
    if (!isOwnerView && currentStore?.id && currentStore?.name && !isLoadingVendor) {
      trackStoreViewed(currentStore.id, currentStore.name, currentStore.category);
    }
  }, [currentStore?.id, currentStore?.name, isLoadingVendor, isOwnerView]);

  // Check if store not found (hot-fix for store switching bug)
  const storeNotFound = !isLoadingVendor && !currentStore && !isOwnerView;

  // Get the most recently created product for sharing
  const newestProduct = businessProduct && businessProduct.length > 0 ? businessProduct[0] : null;
  // URL rework: share the canonical tag/slug--id product URL (or the store URL).
  const productUrl = newestProduct && currentStore?.tag
    ? getPublicProductUrl(newestProduct, currentStore)
    : getPublicStoreUrl(currentStore || {});

  const shareText = newestProduct
    ? `Check out my new product: ${newestProduct.title} on Vibaar!`
    : `Check out my store on Vibaar!`;

  const shareOptions = [
    {
      name: "WhatsApp",
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${productUrl}`)}`,
      bg: "#25D366",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="white"/>
        </svg>
      ),
    },
    {
      name: "Facebook",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}&quote=${encodeURIComponent(shareText)}`,
      bg: "#1877F2",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12Z" fill="white"/>
        </svg>
      ),
    },
    {
      name: "X",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`,
      bg: "#000000",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" fill="white"/>
        </svg>
      ),
    },
    {
      name: "Telegram",
      url: `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}`,
      bg: "#0088CC",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0Zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635Z" fill="white"/>
        </svg>
      ),
    },
  ];

  if (isLoadingVendor && !isOwnerView) {
    // Rev-2 (R2e): a layout-matching skeleton instead of a full-page blank loader.
    return <StorefrontSkeleton />;
  }

  // Handle store not found error
  if (storeNotFound) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏪</div>
          <h2 className="text-h2 font-semibold text-foreground-primary mb-2">
            Store not found
          </h2>
          <p className="text-body text-foreground-secondary mb-6">
            The store you&apos;re looking for doesn&apos;t exist or may have been
            removed.
          </p>
          <Button
            variant="filled"
            onClick={() => router.push("/shop")}
            className="max-w-[max-content] mx-auto">
            Browse all stores
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={scrollRef}
        // h-full, not h-screen: the buyer frame above is `h-dvh overflow-hidden`,
        // and on mobile 100vh exceeds 100dvh by the browser chrome. This element
        // was therefore taller than the box clipping it, so the bottom band of
        // its own scrollport was cut off and the end of the store could never be
        // shown. Matches Product.tsx, which already used h-full.
        className="w-full max-w-full lg:max-w-5xl lg:mx-auto h-full overflow-y-scroll scrollbar-hide relative">
        {/* Compact header — overlays the top and fades in on scroll. It takes
            no flow space (negative margin pulls the hero up underneath it), so
            nothing is added/removed on collapse: the hero simply scrolls away
            and this fades in over it. No swap = no scroll jump. */}
        <div
          ref={setSmallHeaderEl}
          style={{ marginBottom: -smallHeaderHeight }}
          className={`sticky top-0 z-sticky transition-opacity duration-200 ${
            isScrolled ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}>
          <StorefrontHeader
            variant="compact"
            store={currentStore}
            backMaskId="storefront-header-compact"
            trailing={
              isOwnerView ? (
                <KebabMenu
                  isOpen={isStoreMenuOpen}
                  setIsOpen={setIsStoreMenuOpen}
                  store={currentStore}
                />
              ) : (
                <Button
                  size="sm"
                  variant="filled"
                  aria-pressed={isFollowed}
                  onClick={() => setIsFollowed(!isFollowed)}
                  className="w-auto">
                  {isFollowed ? "Unfollow" : "Follow"}
                </Button>
              )
            }
          />
        </div>

        <div className="relative z-10">
          <StorefrontHeader
            variant="hero"
            store={currentStore}
            backMaskId="storefront-header-hero"
            onBack={() =>
              isOwnerView ? router.push("/dashboard/catalog") : router.back()
            }
            trailing={
              <KebabMenu
                isOpen={isHeroMenuOpen}
                setIsOpen={setIsHeroMenuOpen}
                store={currentStore}
              />
            }
            actions={
              isOwnerView ? (
                <>
                  <Link
                    href="/dashboard/storefront/details"
                    prefetch
                    className="flex min-h-9 items-center rounded-pill bg-brand px-4 text-body-sm font-medium text-brandInk">
                    Edit store
                  </Link>
                  <Button
                    size="sm"
                    variant="filled"
                    onClick={() => setIsShareStoreOpen(true)}
                    className="w-auto">
                    Share store
                  </Button>
                </>
              ) : undefined
            }
          />
          {isNewStore && (
            <div className="absolute top-4 right-4 z-10">
              <Badge
                tone="success"
                variant="solid"
                className="shadow-card"
                icon={
                  <span className="w-1.5 h-1.5 bg-surface rounded-full animate-pulse motion-reduce:animate-none" />
                }>
                LIVE
              </Badge>
            </div>
          )}
        </div>

        <div className="relative z-20 -top-6 mt-2 grid grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 bg-surface shadow-card mx-4 lg:mx-6 rounded-card">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center">
              <div className="flex gap-2 items-center">
                <span className="font-medium text-body-sm">{stat.value}</span>
              </div>
              {stat.label}
            </div>
          ))}
        </div>
        <div>
          <Tabs
            tabs={tab}
            // Only the vendor header pins. Two stacked fixed bars is clutter,
            // and the header's rounded bottom left a notch of page background at
            // each end where a square tab bar met its curve.
            sticky={false}
            // The tab row keeps the page gutter, like every other surface. The
            // storefront renders Tabs straight into its scroll container with no
            // padding of its own, so the row — and its underline — ran flush to
            // both screen edges here and nowhere else.
            tabClass="px-4 md:px-6 lg:px-8"
            tabContents={[
              <AllProducts
                key={0}
                isOwnerView={isOwnerView}
                filter={activeFilter}
                searchValue={searchValue}
                sortToggle={sortToggle}
                isNewStore={isNewStore}
              />,
              <EmptyState
                key={1}
                image="/images/emptystate/products_empty_state.svg"
                title="No deals listed yet."
              />,
              <EmptyState
                key={2}
                image="/images/emptystate/products_empty_state.svg"
                title="No reviews listed yet."
              />,
            ]}
            generalContent={
              <VendorDataSort
                onFilterChange={(filter) => setActiveFilter(filter)}
                onSortToggle={() => setSortToggle(!sortToggle)}
                searchValue={searchValue}
                onSearchChange={(value) => setSearchValue(value)}
              />
            }
          />
        </div>
      </div>

      {isPublishSuccessful && (
        <Modal
          imageSrc="/images/success.svg"
          imageAlt="Success"
          title="Product is live"
          onClose={() => {
            setIsPublishSuccessful(false);
            // Clean up URL parameter to prevent modal from reappearing on refresh
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('status');
              window.history.replaceState({}, '', url.toString());
            }
          }}>
          <div className="w-full">
            <h3 className="font-semibold text-foreground-primary text-body-lg text-center mb-6">
              Share product
            </h3>

            {/* Social Share Icons - Horizontal Rail */}
            <div className="flex justify-center items-center gap-8 mb-6">
              {shareOptions.map((option) => (
                <a
                  key={option.name}
                  href={option.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 touch-manipulation"
                >
                  <div
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center transition-transform active:scale-95"
                    style={{ backgroundColor: option.bg }}
                  >
                    {option.icon}
                  </div>
                  <span className="text-body-sm text-foreground-secondary">
                    {option.name}
                  </span>
                </a>
              ))}
            </div>

            {/* Copy Link Section */}
            <div className="bg-surface-subtle rounded-full flex items-center gap-3 pl-5 pr-1.5 py-1.5">
              <span className="text-body text-foreground-secondary truncate flex-1">
                {productUrl}
              </span>
              <button
                onClick={() => handleCopyLink(productUrl)}
                className={`flex items-center justify-center gap-1.5 px-5 py-3 rounded-full min-h-[44px] font-semibold text-body transition-all touch-manipulation ${
                  copied
                    ? "bg-success-foreground text-foreground-primary"
                    : "bg-brand text-brandInk active:scale-95"
                }`}
                style={{
                  boxShadow: !copied ? '4px 8px 24px 0px rgb(var(--brand-rgb) / 0.2)' : undefined
                }}
              >
                {copied ? (
                  <>
                    <Check size={18} strokeWidth={2.5} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={18} strokeWidth={2} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Floating Add Product Button — show when seller has products */}
      {isOwnerView && businessProduct && businessProduct.length > 0 && (
        <IconButton
          icon={Add}
          label="Add product"
          variant="filled"
          size="lg"
          onClick={() => router.push("/dashboard/catalog/product/create")}
          className="fixed bottom-20 right-4 z-sticky shadow-pop"
        />
      )}

      <ShareModal
        isOpen={isShareStoreOpen}
        onClose={() => setIsShareStoreOpen(false)}
        title="Share store"
        shareUrl={getPublicStoreUrl(currentStore || {})}
        shareText={`Check out ${currentStore?.name || "my store"} on Vibaar!`}
      />

      <VendorNav isOwnerView={isOwnerView} />
    </>
  );
};

export default VendorStoreFront;
