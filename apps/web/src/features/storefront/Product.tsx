/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { Variation, Variant } from "@/lib/types";
import { calculateDiscountPercentage, formatCurrency } from "@/lib/utils";
import Image from "next/image";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import SelectVariants from "@/design-system/VariantSelector";
import { calculateSelectedVariant, generateVariantSelectionString } from "@/utils/variantCalculations";
import Accordion from "@vibaar/ui/common/Accordion";
import { ProductDescription, ProductVendorInfo } from "./product/ProductInfoSections";
import ProductInfo from "./product/ProductInfo";
import ProductVariants from "./product/ProductVariants";
import useScroll from "@/hooks/useScroll";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import useOrderStore from "@/store/orderStore";
import DeliverySheet from "./product/DeliverySheet";
import DeliveryCard from "./product/DeliveryCard";
import ProductCTA from "./product/ProductCTA";
import { FaStar } from "@vibaar/ui/icons";
import ShareModal from "@vibaar/ui/common/ShareModal";
import Loader from "@vibaar/ui/common/Loader";
import Button from "@vibaar/ui/common/Button";
import ReviewCard from "@vibaar/ui/common/ReviewCard";
import StarRating from "@vibaar/ui/common/StarRating";
import { toast } from "sonner";
import useAuthStore from "@/store/authStore";
import { CartsItems } from "@/lib/newinterface";
import { generateRandomHexId } from "@/lib/generator";
import ImageCarousel from "./carousel";
import LocationModal from "@/hooks/locationmodal";
import { useDelivery } from "./useDelivery";
import { trackViewItem, trackAddToCart, trackProductShared } from "@/lib/analytics";
import { getPublicProductUrl, canShareProduct } from "@/lib/shareUrls";
import { parseStoreHandle } from "@/lib/urlHelpers";
import StorefrontHeader, {
  HEADER_COLLAPSE_MS,
  HEADER_OVERHANG_PULL,
} from "@/features/storefront/StorefrontHeader";
import KebabMenu from "@vibaar/ui/common/header/KebabMenu";

type VariantOption = string | number | boolean;

// URL rework Rev 2 — server-prime: the /@{handle}/p/{slug}-{publicId} route resolves
// the product + store server-side and passes them here so the client renders on the
// first paint without a duplicate fetch. Absent (seller/legacy) → normal client fetch.
const Product = ({
  initialProduct,
  initialStore,
}: { initialProduct?: any; initialStore?: any } = {}) => {
  const router = useRouter();
  const path = usePathname();
  const params = useParams();
  // URL rework Rev 2: the buyer route /@{handle}/p/{slug}-{publicId} carries the
  // product's PUBLIC id as the token after the last '-'; the handle is @-prefixed.
  // parseStoreHandle DECODES first — `useParams` hands back the raw segment, so
  // this is "%40localstore2". Stripping '@' without decoding left the '%40' in
  // place, and the re-encoded lookup 404'd on every product view: a "store not
  // found" toast, and the correctly-resolved vendor wiped from state.
  const handleFromRoute = parseStoreHandle(params.handle as string | undefined) ?? undefined;
  const slugAndId = params.slugAndId as string | undefined;
  const routePublicId = slugAndId
    ? slugAndId.slice(slugAndId.lastIndexOf("-") + 1)
    : undefined;
  // Legacy /store/[storeTag]/products/[slug--uuid] + seller routes carry the
  // INTERNAL id directly (bare, or after '--').
  const rawLegacyParam = (params.productSlugAndId ?? params.productId) as
    | string
    | undefined;
  const legacyProductId = rawLegacyParam?.includes("--")
    ? rawLegacyParam.slice(rawLegacyParam.lastIndexOf("--") + 2)
    : rawLegacyParam;
  const storeTag = handleFromRoute ?? ((params.storeTag as string | undefined) ?? "");
  // `stor` is the vendor being viewed, `store` is the signed-in user's own
  // business. Aliased at the boundary so the two can never be mixed up below.
  const {
    stor: viewedStore,
    store: ownStore,
    stores,
    theme,
    fetchStores,
    fetchStoreByTag,
    setStore,
    getAuthenticatedUserStore,
  } = useBusinessStore();


  const {
    product: storeProduct,
    isLoading: isProductLoading,
    getProductById,
    getProductByPublicId,
    setProduct,
    spotlightProduct,
  } = useProductStore();

  // Render the server-resolved product on the FIRST paint.
  //
  // Rev-2 resolves the product and its vendor server-side, but the only thing
  // that consumed them was an effect — which runs after the first render, so the
  // server HTML shipped an empty title and "₦0.00" and the real values appeared
  // a beat later. Falling back to the primed objects here means the markup is
  // correct from the start; the effect below still seeds the store so the rest
  // of the app (cart, analytics) sees the same product.
  const product = storeProduct?.id ? storeProduct : (initialProduct ?? storeProduct);

  // The internal product id used across the component. The Rev-2 route only carries a
  // PUBLIC id, so fall back to the resolved product's id once it loads.
  const productId = (product?.id as string | undefined) ?? legacyProductId;
  const { user } = useAuthStore();

  // Transform variant_combinations into proper Variant structure for calculations
  const transformToProperVariants = useMemo(() => {
    if (!product?.variant_combinations?.length) return null;

    // Build variation map to understand structure
    const variationsMap: Record<string, Set<string>> = {};
    const combinationsData: Array<{ key: string; price?: number; stock?: number; images?: string[] }> = [];

    product.variant_combinations.forEach((combination: any) => {
      if (!combination.combination_key) return;

      const parts = combination.combination_key.split('-').map((part: string) => part.trim());

      // Store combination data for property analysis
      combinationsData.push({
        key: combination.combination_key,
        price: combination.price ? parseFloat(combination.price) : undefined,
        stock: combination.stock ? parseInt(combination.stock) : undefined,
        images: combination.images || []
      });

      parts.forEach((part: string, index: number) => {
        let variationName = '';
        if (index === 0) variationName = 'Color';
        else if (index === 1) variationName = 'Size';
        else if (index === 2) variationName = 'Material';
        else variationName = `Option ${index + 1}`;

        if (!variationsMap[variationName]) {
          variationsMap[variationName] = new Set();
        }
        variationsMap[variationName].add(part);
      });
    });

    // Convert to proper Variant structure with property ownership analysis
    const properVariants: Variant[] = Object.entries(variationsMap).map(([name, valuesSet], index) => {
      const values = Array.from(valuesSet);

      // Analyze which properties this variant should own
      const owned_properties: string[] = [];
      const price_values: { [value: string]: number } = {};
      const stock_values: { [value: string]: number } = {};
      const image_values: { [value: string]: string } = {};

      // Check if this variant position affects prices, stock, or images
      let hasPriceVariation = false;
      let hasStockVariation = false;
      let hasImageVariation = false;

      values.forEach(value => {
        // Find combinations that include this value in this variant position
        const matchingCombinations = combinationsData.filter(combo => {
          const parts = combo.key.split('-').map(p => p.trim());
          return parts[index] === value;
        });

        if (matchingCombinations.length > 0) {
          // Check for price variations
          const prices = matchingCombinations.map(c => c.price).filter(p => p !== undefined);
          if (prices.length > 0) {
            const basePrice = parseFloat(product.price?.toString() || '0');
            const variantPrice = prices[0] as number;
            if (Math.abs(variantPrice - basePrice) > 0.01) {
              price_values[value] = variantPrice - basePrice;
              hasPriceVariation = true;
            }
          }

          // Check for stock variations
          const stocks = matchingCombinations.map(c => c.stock).filter(s => s !== undefined);
          if (stocks.length > 0) {
            stock_values[value] = stocks[0] as number;
            hasStockVariation = true;
          }

          // Check for image variations
          const images = matchingCombinations.flatMap(c => c.images || []).filter(img => img);
          if (images.length > 0) {
            image_values[value] = images[0];
            hasImageVariation = true;
          }
        }
      });

      // Assign property ownership based on analysis
      if (hasPriceVariation) owned_properties.push('price');
      if (hasStockVariation) owned_properties.push('stock');
      if (hasImageVariation) owned_properties.push('image');

      return {
        id: `variant-${index}`,
        name,
        types: values,
        owned_properties,
        price_values: Object.keys(price_values).length > 0 ? price_values : undefined,
        stock_values: Object.keys(stock_values).length > 0 ? stock_values : undefined,
        image_values: Object.keys(image_values).length > 0 ? image_values : undefined,
      };
    });

    return properVariants;
  }, [product?.variant_combinations, product?.price]);

  // Build display variants for UI: prefer API variants (correct name→types), fallback to reconstructed
  const reconstructedVariations = useMemo(() => {
    const apiVariants = product?.variants;
    if (apiVariants && apiVariants.length > 0) {
      return apiVariants.map((variant: any, index: number) => ({
        id: `variation-${index}`,
        name: variant.name,
        option: variant.name,
        types: variant.types,
        values: variant.types
      }));
    }

    if (!transformToProperVariants) return null;

    return transformToProperVariants.map((variant, index) => ({
      id: `variation-${index}`,
      option: variant.name,
      values: variant.types
    }));
  }, [product?.variants, transformToProperVariants]);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);



  // Image carousel state now handled by ImageCarousel component
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  // The owner viewing their own catalogue vs the public viewing a storefront.
  // (A `pro` flag used to ride along here, hardcoded `true` at both producers —
  // so every `isSeller.pro &&` guard was unreachable and one of them leaked the
  // string "false" into a className. Removed.)
  const isOwnerView = path.includes("/dashboard");

  // Owner view reads the authenticated user's own business; the public view reads
  // the vendor resolved from the URL tag. Legacy /shop/[vendor] has no tag, so it
  // still finds the vendor in the pulled list by business_id.
  const store = isOwnerView
    ? ownStore
    : storeTag
      ? // Same first-paint rule as the product: the resolved vendor, or the
        // server-primed one until the store catches up.
        (viewedStore?.id ? viewedStore : (initialStore ?? viewedStore))
      : stores?.find((s) => s.id === product?.business_id) || null;

  // NOTE: the vendor's name now comes from the resolved store, inside
  // StorefrontHeader. It used to be `path.split("/")[2]`, which on
  // /@{handle}/p/{slug}-{id} is the literal segment "p" — every buyer product
  // page showed a store called "p", and that same string seeded the banner's
  // fallback colour hash.

  const [isLiked, setIsLiked] = useState(false);
  const [count, setCount] = useState(1);
  const { isScrolled, scrollRef } = useScroll(20);
  // The banner has to finish shrinking BEHIND the gallery before it becomes the
  // bar that sits in front of it. Flipping the stack the instant the scroll
  // threshold trips put a full-height banner over the product image for the
  // length of the collapse — a flash of colour across the photo on every scroll.
  // Expanding is the other way round: drop behind immediately, then grow.
  const [headerAboveGallery, setHeaderAboveGallery] = useState(false);
  useEffect(() => {
    if (!isScrolled) {
      setHeaderAboveGallery(false);
      return;
    }
    const settle = setTimeout(() => setHeaderAboveGallery(true), HEADER_COLLAPSE_MS);
    return () => clearTimeout(settle);
  }, [isScrolled]);
  const [loading, setLoading] = useState(false);
  const [search, setSeacrh] = useState("");
  const {
    shippingOptions,
    singleShippingDetails,
    selectedDeliveryLocation,
    location,
    setLocation,
    selectedDelivery,
    selectedOption,
    isLocationModalOpen: isLoctionModalOpen,
    openLocationModal,
    closeLocationModal,
    isDeliveryModalOpen,
    openDeliveryModal,
    closeDeliveryModal,
    handleLocationSelect,
    handleSelect,
  } = useDelivery({ product, productId, count, user, setLoading });


  // `is_blocked` is moderation. It arrives on every rating and was ignored
  // here, so a review taken down for abuse still showed on the product page —
  // it was only filtered when the ratings endpoint was queried directly.
  const productRatings: { rate: number; is_blocked?: boolean }[] = (
    product?.product_rating ?? []
  ).filter((r: { is_blocked?: boolean }) => !r?.is_blocked);
  const ratings =
    productRatings.length > 0
      ? Math.round(
          productRatings.reduce((sum, r) => sum + (r?.rate ?? 0), 0) / productRatings.length
        )
      : 0;


  const { addToCart, addToCarts, cart, removeFromCart, setCheckoutCart } = useOrderStore(); // Access the cart methods from the store


  // Increment Count and Add to Cart
  const increment = () => {
    setCount((prev) => {
      const newCount = prev + 1;
      // addToCart({
      //   product_id: productId as string,
      //   business_id: product?.business_id as string,
      //   quantity: newCount,
      //   price: product?.price as number,
      //   variants: [],
      // });

      return newCount; // Return updated count
    });
  };

  // Out of stock when the product's (top-level) stock is depleted — matches the
  // server-side listing filter + checkout gate (COALESCE(stock,0) > 0).
  const isOutOfStock = Number(product?.stock ?? 0) <= 0;

  // Decrement Count and Update Cart (never below 1)
  const decrement = () => {
    setCount((prev) => {
      if (prev > 1) {
        const newCount = prev - 1;

        // if (newCount > 0) {
        //   // Update the cart with decremented count
        //   addToCart({
        //     product_id: productId as string,
        //     business_id: product?.business_id as string,
        //     quantity: newCount,
        //     price: product?.price as number,
        //     variants: [],
        //   });
        // } else {
        //   removeFromCart(productId as string);
        // }

        return newCount;
      }

      return prev;
    });
  };
  const liked = spotlightProduct.find((it) => it.product_id === product?.id)
    ? true
    : false;


  // The product, with variants normalised for the price/選択 calculations.
  //
  // This used to be `segments[2] === "seller" ? productPreview : enhanced`. The
  // seller route is /dashboard/catalog/product/[id], so segments[2] is
  // "catalog" — the branch was never taken, `productPreview` was unreachable,
  // and the same check elsewhere silently routed the OWNER's page through the
  // buyer data path. `isOwnerView` is the real signal and is used throughout.
  const prod: any = {
    ...product,
    variants: transformToProperVariants || product?.variants || [],
  };

  // Server-prime (Rev 2): seed the stores from the server-resolved initial data so
  // the first paint has the product + vendor with no client round-trip.
  useEffect(() => {
    if (initialProduct?.id) setProduct(initialProduct);
    if (initialStore?.id) setStore(initialStore, true);
  }, [initialProduct?.id, initialStore?.id]);

  useEffect(() => {
    // Skip the client fetch when the server already resolved THIS route's product
    // (server-prime). On client-nav the RSC re-runs the page, so initialProduct is
    // always fresh for the current route — the fetch below only covers seller/legacy.
    const primed =
      !!initialProduct?.public_id && initialProduct.public_id === routePublicId;
    if (primed) return;
    if (routePublicId && getProductByPublicId) {
      // Rev-2 buyer route /@{handle}/p/{slug}-{publicId}: resolve by public id.
      getProductByPublicId(routePublicId);
    } else if (legacyProductId && getProductById) {
      // Legacy /store buyer route + seller route: resolve by the internal id.
      getProductById(legacyProductId, isOwnerView ? "sell" : "buy");
    }
    // Depend on the ROUTE ids (stable), not the derived `productId` (which becomes the
    // resolved product's id and would re-trigger the fetch).
  }, [routePublicId, legacyProductId, getProductByPublicId, getProductById, isOwnerView, initialProduct?.public_id]);

  // Track product view in Google Analytics (buyer mode only)
  useEffect(() => {
    if (product?.id && product?.title && !isOwnerView) {
      trackViewItem({
        id: product.id,
        name: product.title,
        price: Number(product.price) || 0,
        quantity: 1,
        category: product.category?.name,
      });
    }
  }, [product?.id, product?.title, product?.price, product?.category?.name, isOwnerView]);

  // Fetch stores data for buyer mode or authenticated store for seller mode
  useEffect(() => {

    if (isOwnerView) {
      // Owner view: load the authenticated user's own business.
      getAuthenticatedUserStore?.();
    } else if (storeTag) {
      // Public view: resolve the vendor by the stable tag in the URL — ONE indexed
      // lookup, replacing the 500-row `fetchStores()` pull that existed only to
      // find this one vendor by product.business_id.
      //
      // Skipped when the server already resolved THIS vendor (server-prime), the
      // same guard the storefront uses. Without it every product view re-fetched a
      // store it had just been handed.
      const primed = initialStore?.tag?.toLowerCase() === storeTag.toLowerCase();
      if (!primed) fetchStoreByTag?.(storeTag);
    } else {
      // Legacy /shop/[vendor]: pull the store list to find the vendor by business_id.
      fetchStores?.();
    }
  }, [isOwnerView, storeTag, initialStore?.tag]);  // re-resolve when the tag/mode changes

  const [selectedVariant, setSelectedVariant] = useState<
    Record<string, VariantOption>
  >({});
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  // Initialize current images when product loads
  useEffect(() => {
    if (prod?.image) {
      setCurrentImages(prod.image);
    }
  }, [prod?.image]);

  // Image navigation now handled by ImageCarousel component

  // Touch handling now managed by ImageCarousel component

  const handleLikeClick = () => {
    setIsLiked(!isLiked);
  };

  // Calculate current price based on selected variants
  const calculateVariantPrice = () => {
    // If no variants, return base price
    if (!prod?.variants) {
      return prod?.price ? +prod.price : 0;
    }

    // Start with base price
    let calculatedPrice = prod?.price ? +prod.price : 0;

    // ENHANCEMENT 1: Apply price adjustments from any selected variant that owns price
    if (Object.keys(selectedVariant).length > 0) {
      prod.variants.forEach((variant: Variant) => {
        const selectedValue = selectedVariant[variant.name];
        if (selectedValue && variant.owned_properties?.includes('price')) {
          const priceAdjustment = variant.price_values?.[String(selectedValue)];
          if (priceAdjustment !== undefined) {
            calculatedPrice += priceAdjustment;
          }
        }
      });
    }

    return calculatedPrice;
  };

  const handleVariantClick = (variantName: string, option: VariantOption) => {
    const newSelection = {
      ...selectedVariant,
      [variantName]: option,
    };

    setSelectedVariant(newSelection);

    // ENHANCEMENT 2: Smart image handling - add variant images contextually
    if (prod?.variants) {
      const clickedVariant = prod.variants.find((v: Variant) => v.name === variantName);

      if (clickedVariant?.owned_properties?.includes('image')) {
        // This variant controls images - always add variant image to the end for auto-scroll
        const variantImage = clickedVariant.image_values?.[option as string];
        if (variantImage) {
          const baseImages = prod.image || [];
          // Remove variant image if it exists, then add it at the end
          const filteredImages = baseImages.filter((img: string) => img !== variantImage);
          const updatedImages = [...filteredImages, variantImage];
          setCurrentImages(updatedImages);
        } else {
          // Variant selected but no image - keep base images
          setCurrentImages(prod.image || []);
        }
      } else {
        // Non-image variant selected, preserve current images if they exist
        if (currentImages.length === 0) {
          setCurrentImages(prod.image || []);
        }
      }
    }
  };

  const handleShareClick = () => {
    if (typeof window === 'undefined') return;

    // No handle, no public address. This used to build and share
    // `vibaar.com/@/p/slug-` without a word — a dead link, handed to whoever
    // the seller sent it to.
    if (!canShareProduct(product, store || {})) {
      toast.error(
        isOwnerView
          ? "Set your store handle before sharing — Storefront → Store details."
          : "This product doesn't have a public link yet."
      );
      return;
    }

    const publicUrl = getPublicProductUrl(product, store || {});

    // Only use Web Share API on mobile devices (desktop share sheets aren't useful)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (navigator.share && isMobile) {
      navigator
        .share({
          title: product?.title,
          url: publicUrl,
        })
        .then(() => {
          // Track successful share
          if (product?.id && product?.name) {
            trackProductShared(product.id, product.name, 'native_share');
          }
        })
        .catch(console.error);
    } else {
      // Desktop: open share modal
      setIsShareModalOpen(true);
      if (product?.id && product?.name) {
        trackProductShared(product.id, product.name, 'share_modal');
      }
    }
  };

  const truncatedDescription =
    product?.description &&
      product?.description?.length > 100 &&
      !isDescriptionExpanded
      ? `${product?.description.substring(0, 100)}...`
      : product?.description;

  // ENHANCEMENT 3: Helper function for variant selection string
  const getVariantString = () => {
    if (!prod?.variants || Object.keys(selectedVariant).length === 0) {
      return product?.color as string || "";
    }
    return generateVariantSelectionString(prod, selectedVariant as { [variantName: string]: string });
  };

  // ENHANCEMENT 4: Variant validation with auto-scroll
  const validateVariantSelection = () => {
    if (!prod?.variants || prod.variants.length === 0) return true;

    const requiredVariants = prod.variants.length;
    const selectedCount = Object.keys(selectedVariant).length;

    if (selectedCount < requiredVariants) {
      const missingVariant = prod.variants.find((v: Variant) => !selectedVariant[v.name]);
      toast.error(`Please select ${missingVariant?.name} to continue`);

      // Auto-scroll to variant section
      const variantSection = document.querySelector('[data-variant-section]');
      if (variantSection) {
        variantSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    return true;
  };

  // ENHANCEMENT 3: Cart data integrity - use variant price and selection
  const cartState: CartsItems = {
    product_id: productId as string,
    business_id: product?.business_id,
    price: calculateVariantPrice(), // USE VARIANT PRICE, NOT BASE PRICE
    quantity: count,
    title: product?.title as string,
    image: currentImages[0] || product?.image?.[0] || "", // USE CURRENT IMAGE
    color: getVariantString(), // STORE VARIANT SELECTION
    shippingPrice: selectedDelivery?.price + "",
    shippingEstimate: selectedDelivery?.delivery_days + "",
    shippingName: selectedDelivery?.delivery_type + "",
    shippingId: selectedDelivery?.id + "",
    id: generateRandomHexId(16),
  };

  // Checkout guards shared by Buy-now + add-to-cart: variant selection ->
  // delivery location -> shipping option. Returns false (and opens the relevant
  // step) when a guard blocks; extracted so the two buttons can't drift.
  const passesCheckoutGuards = (): boolean => {
    if (!validateVariantSelection()) return false;
    if (!location?.properties?.full_address && !selectedDeliveryLocation?.full_address) {
      toast.error("Please select a delivery location first.");
      openLocationModal();
      return false;
    }
    if (!selectedDelivery?.id) {
      openDeliveryModal();
      return false;
    }
    return true;
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    if (!passesCheckoutGuards()) return;
    addToCarts([cartState, ...cart]);
    setCheckoutCart([]); // fresh checkout — a stale cart-page selection must not be read at review
    trackAddToCart({
      id: product?.id || (productId as string),
      name: product?.name || product?.title || "",
      price: calculateVariantPrice(),
      quantity: count,
      category: product?.category?.name,
    });
    setLoading(true);
    // Guest-first checkout: skip the auth screen for guests
    return user?.id
      ? singleShippingDetails?.id
        ? router.push("/cart/complete-order/review")
        : router.push("/cart/shipping-profile/new")
      : router.push("/cart/shipping-profile/new");
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if (!passesCheckoutGuards()) return;
    addToCarts([cartState, ...cart]);
    trackAddToCart({
      id: product?.id || (productId as string),
      name: product?.name || product?.title || "",
      price: calculateVariantPrice(),
      quantity: count,
      category: product?.category?.name,
    });
  };

  if (loading || isProductLoading) {
    return <Loader />;
  }

  // Nothing resolved. The page had no branch for this at all: a failed fetch —
  // an expired token or an id the seller does not own, both of which the
  // dashboard route hits — used to leave the previous product on screen, and
  // once that was fixed it would have rendered an empty shell instead.
  if (!product?.id) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h2 className="mb-2 text-h2 font-semibold text-foreground-primary">
            Product not found
          </h2>
          <p className="mb-6 text-body text-foreground-secondary">
            {isOwnerView
              ? "We couldn't load this product. Check your connection and try again."
              : "This product isn't available any more."}
          </p>
          <Button
            variant="filled"
            fullWidth={false}
            onClick={() =>
              isOwnerView ? router.push("/dashboard/catalog") : router.push("/shop")
            }
            className="mx-auto">
            {isOwnerView ? "Back to catalog" : "Browse products"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-col bg-surface w-full max-w-full lg:max-w-5xl lg:mx-auto h-full overflow-y-scroll scrollbar-hide pb-28 lg:pb-8 focus:outline-none">
      {/* ONE header, always present.
          It used to render ProductHeader OR SmallHeader across a scroll
          threshold — two different components with two different positioning
          models (absolute vs sticky), so crossing it added and removed layout
          and the page jumped. A product page is about the product; the vendor
          bar is secondary and persistent, which also means the back control is
          always reachable rather than appearing only once you scroll. (The
          storefront keeps its hero → compact transition: a STORE page leads
          with the store's identity.) */}
      {/* While expanded the banner is a BACKDROP: the gallery rides on its
          overhang and must paint over it, so the header sits below the gallery
          in the stack. Once collapsed — and only once the collapse has finished
          — it is a bar again and has to sit above everything scrolling beneath. */}
      <div className={`sticky top-0 ${headerAboveGallery ? "z-sticky" : "z-0"}`}>
        <StorefrontHeader
          variant="compact"
          store={store}
          expanded={!isScrolled}
          backMaskId="product-header-compact"
          trailing={
            <KebabMenu isOpen={isStoreMenuOpen} setIsOpen={setIsStoreMenuOpen} store={store} />
          }
        />
      </div>

      {/* 2-Column Layout for Desktop.
          THE GALLERY IS INSIDE IT. It used to be a full-width band ABOVE this
          grid, which pushed the aside — and therefore the purchase action — a
          clear 900px down the page: measured at 1024x640, Buy now sat at y=936
          against a 640px viewport, so a buyer had to scroll past the whole
          gallery before they could see the control that buys the thing. Moving
          the gallery into the left column is what makes the panel reachable on
          arrival; keeping the gallery where it was and calling the action
          "reachable after a scroll" was answering a different question. */}
      <div className="lg:grid lg:grid-cols-product lg:gap-8 lg:px-8">
        {/* The gallery rides on the banner's overhang and rises with it as the
            header collapses — same duration, so the two read as one motion.
            Below lg this is exactly the full-bleed band it has always been; at
            lg it is row 1 of the left column and the grid supplies the gutter. */}
        <div
          className={`relative z-10 px-4 md:px-6 mb-0 transition-spacing duration-300 ease-out lg:col-start-1 lg:row-start-1 lg:mb-4 lg:px-0 ${
            !isScrolled ? HEADER_OVERHANG_PULL : ""
          }`}>
          <ImageCarousel
            product={{ ...prod, images: currentImages.length > 0 ? currentImages : prod?.image }}
            isScrolled={isScrolled}
          />
        </div>

        {/* Left Column - Main Content */}
        <div className="lg:col-start-1 lg:row-start-2">
          {/* Product Info */}
          <ProductInfo
            title={prod?.title}
            price={calculateVariantPrice()}
            oldPrice={prod?.old_price}
            sales={prod?.sales}
            ratings={ratings}
            liked={liked}
            onShare={handleShareClick}
            onLike={handleLikeClick}
          />

          <hr className="lg:hidden" />

          {/* Variants Section - Mobile Only */}
          {reconstructedVariations && (
            <ProductVariants
              variations={reconstructedVariations}
              selected={selectedVariant}
              onSelect={handleVariantClick}
              className="w-full px-5 py-5 lg:hidden"
            />
          )}

          {/* Delivery Section - Mobile Only */}
          {!isOwnerView && (
            <>
              <hr className="lg:hidden" />
              <DeliveryCard
                className="py-5 px-5 lg:hidden"
                returnRowClassName="px-5 py-5"
                store={store}
                singleShippingDetails={singleShippingDetails}
                selectedDeliveryLocation={selectedDeliveryLocation}
                location={location}
                selectedDelivery={selectedDelivery}
                shippingOptions={shippingOptions}
                openLocationModal={openLocationModal}
                openDeliveryModal={openDeliveryModal}
              />
            </>
          )}

          <hr className="lg:hidden" />

          {/* Product Description */}
          <ProductDescription
            description={prod?.description}
            truncatedDescription={truncatedDescription}
            isExpanded={isDescriptionExpanded}
            setIsExpanded={setIsDescriptionExpanded}
          />

          <hr />

          {/* Vendor Info */}
          <ProductVendorInfo store={store} collections={prod?.collections} />

          <hr />

          <Accordion
            title="Ratings & Reviews"
            // The score lives in the section header, not as a first row inside
            // the section — that was a second header under the header.
            meta={
              productRatings.length > 0 ? (
                <>
                  <StarRating value={ratings} size="xs" />
                  <span className="text-body-sm text-foreground-secondary">
                    {ratings.toFixed(1)} · {productRatings.length}{" "}
                    {productRatings.length === 1 ? "review" : "reviews"}
                  </span>
                </>
              ) : undefined
            }
            initiallyOpen={true}
            className="px-5 lg:px-0 pb-24 lg:pb-4">
            {productRatings.length > 0 ? (
              <div className="flex flex-col gap-3">
                {productRatings.map((item: any, index: number) => (
                  <ReviewCard
                    key={item.id ?? index}
                    rating={item.rate}
                    comment={item.comment}
                    date={item.created_at}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <FaStar size={28} className="text-foreground-disabled" />
                <p className="text-body-sm font-medium text-foreground-primary">
                  No reviews yet
                </p>
                <p className="text-caption text-foreground-muted px-6">
                  Reviews from verified buyers will appear here once this product
                  has been rated.
                </p>
              </div>
            )}
          </Accordion>
          {/* End Left Column */}
        </div>

        {/* Right Column - the desktop aside.
            `contents` below lg so this column has no box there: the reference
            panel inside it is `hidden`, and ProductCTA falls through as the
            `absolute` bottom bar it has always been.

            At lg it spans BOTH rows of the left column — the gallery's and the
            details' — so the sticky box inside it can travel the full height of
            the page rather than only the part beside the details.

            The sticky box is a flex column capped at the viewport height. Its
            reference half (variants, delivery, returns) scrolls INTERNALLY when
            the options are long; the purchase action is `shrink-0`, so it stays
            in the panel and on screen instead of being pushed under the fold by
            a product with many variants. */}
        <div className="contents lg:block lg:col-start-2 lg:row-start-1 lg:row-end-3">
          <div className="contents lg:sticky lg:top-4 lg:flex lg:max-h-aside lg:flex-col lg:gap-4">
          {/* Matches the purchase panel below it exactly — same radius, same
              border, same shadow. Two cards stacked in one column at two
              different roundnesses read as a mistake, and this one was the odd
              pair: `rounded-2xl` (16) against the action's 24, plus a raw
              `gray-100` border and a heavier shadow. */}
          <div className="hidden lg:block lg:min-h-0 lg:overflow-y-auto bg-surface rounded-panel shadow-card p-6 border border-outline">
            {/* Variants Section - Only show if product has combinations enabled and actual variant data exists */}
            {reconstructedVariations && (
              <ProductVariants
              variations={reconstructedVariations}
              selected={selectedVariant}
              onSelect={handleVariantClick}
              className="w-full"
            />
            )}

            {/* Delivery Section - Desktop (in right sidebar) */}
            {!isOwnerView && (
              <>
                {/* Only show divider if variants exist */}
                {reconstructedVariations && <hr className="my-4" />}
                <DeliveryCard
                  returnRowClassName="px-2 mt-4"
                  store={store}
                    singleShippingDetails={singleShippingDetails}
                  selectedDeliveryLocation={selectedDeliveryLocation}
                  location={location}
                  selectedDelivery={selectedDelivery}
                  shippingOptions={shippingOptions}
                  openLocationModal={openLocationModal}
                  openDeliveryModal={openDeliveryModal}
                />
              </>
            )}
          </div>

          {/* ONE action node. Rendered here rather than as a sibling of the
              grid, because at lg it has to be a cell of the aside column and
              CSS cannot move a node between subtrees. Its mobile presentation
              is unaffected: `absolute` resolves against the shell frame, not
              against this parent. */}
          <ProductCTA
            isSeller={isOwnerView}
            count={count}
            isOutOfStock={isOutOfStock}
            onIncrement={increment}
            onDecrement={decrement}
            onBuyNow={handleBuyNow}
            onAddToCart={handleAddToCart}
            onEdit={() => router.push(`/dashboard/catalog/product/create/manual/edit/${productId}`)}
            onShare={handleShareClick}
          />
          </div>
          {/* End Right Column - the desktop aside */}
        </div>
        {/* End 2-Column Layout */}
      </div>

      {/* Share Modal for Desktop */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Product"
        shareUrl={getPublicProductUrl(product, store || {})}
        shareText={`Check out ${product?.title || 'this product'} on Vibaar!`}
      />

      {/* Delivery flow modals — single mount, shared by the mobile + desktop cards */}
      {!isOwnerView && (
        <>
          <LocationModal
            isLocationModalOpen={isLoctionModalOpen}
            closeLocationModal={closeLocationModal}
            setLoading={setLoading}
            setLocation={setLocation}
            location={location}
            callback={handleLocationSelect}
          />
          <DeliverySheet
            isOpen={isDeliveryModalOpen}
            onClose={closeDeliveryModal}
            options={shippingOptions}
            selectedId={selectedOption}
            onSelect={handleSelect}
          />
        </>
      )}
    </div>
  );
};

export default Product;

