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
import SmallHeader from "@/design-system/common/SmallHeader";
import Accordion from "@vibaar/ui/common/Accordion";
import { ProductDescription, ProductVendorInfo } from "./product/ProductInfoSections";
import ProductInfo from "./product/ProductInfo";
import ProductVariants from "./product/ProductVariants";
import useScroll from "@/hooks/useScroll";
import ProductHeader from "@/features/storefront/ProductHeader";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import useOrderStore from "@/store/orderStore";
import DeliverySheet from "./product/DeliverySheet";
import DeliveryCard from "./product/DeliveryCard";
import ProductCTA from "./product/ProductCTA";
import { FaStar } from "@vibaar/ui/icons";
import ShareModal from "@vibaar/ui/common/ShareModal";
import Loader from "@vibaar/ui/common/Loader";
import { toast } from "sonner";
import useAuthStore from "@/store/authStore";
import { CartsItems } from "@/lib/newinterface";
import { generateRandomHexId } from "@/lib/generator";
import ImageCarousel from "./carousel";
import LocationModal from "@/hooks/locationmodal";
import { useDelivery } from "./useDelivery";
import { trackViewItem, trackAddToCart, trackProductShared } from "@/lib/analytics";
import { getPublicProductUrl } from "@/lib/shareUrls";

interface ProductPreview {
  description: string;
  img: string;
  image: string[];
  title: string;
  oldPrice: number;
  price: number;
  rating: number;
  variants?: Variant[];
  collections?: [];
}

type VariantOption = string | number | boolean;

export function getFormattedVendorName(path: string): string {
  const segments = path.split("/");
  const rawVendorName = segments[2];
  const decodedName = decodeURIComponent(rawVendorName);
  const formattedName = decodedName.replace(/ /g, " ");
  return formattedName;
}

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
  const handleFromRoute = (params.handle as string | undefined)?.replace(/^@/, "");
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
  const { stor, stores, getStoreById, singleStore, theme, fetchStores, fetchStoreByTag, setStore, getAuthenticatedUserStore } = useBusinessStore();


  const { product, getProductById, getProductByPublicId, setProduct, spotlightProduct, products } =
    useProductStore();

  // The internal product id used across the component. The Rev-2 route only carries a
  // PUBLIC id, so fall back to the resolved product's id once it loads.
  const productId = (product?.id as string | undefined) ?? legacyProductId;
  console.log(product);
  const vendorName = getFormattedVendorName(path);
  //("product => ", product);
  const { user } = useAuthStore();

  // Transform variant_combinations into proper Variant structure for calculations
  const transformToProperVariants = useMemo(() => {
    if (!product?.variant_combinations?.length) return null;

    console.log('🔄 Product.tsx: Transforming variant_combinations to proper Variant structure...');

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

    console.log('✅ Product.tsx: Transformed to proper variants:', properVariants);
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

  const productPreview = useMemo<ProductPreview>(() => ({
    description: product?.description || "",
    img: product.image ? product?.image[0] : "", // Add this line
    image: product?.image || [],
    title: product?.title || "",
    oldPrice: product?.old_price ? +product.old_price : (product?.original_price ? +product.original_price : 0),
    price: product.price ? +product.price : 0,
    rating: 4.7,
    variants: transformToProperVariants || product.variants || [],
  }), [product, transformToProperVariants]);

  // Debug logging to see what variant data we receive
  console.log('🔍 Product.tsx received data:', {
    'product.variants': product?.variants,
    'product.variations': product?.variations,
    'product.variant_combinations': product?.variant_combinations,
    'reconstructedVariations': reconstructedVariations,
    'productPreview.variants': productPreview.variants
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);


  // Image carousel state now handled by ImageCarousel component
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isSeller] = useState({
    pro: true,
    seller: path.includes("/dashboard") ? true : false,
  });

  // Seller mode: use stor (seller's own business).
  // Buyer mode, URL rework: when the store tag is in the URL (/store/[storeTag]/...)
  // the vendor is resolved by tag into `stor` (one indexed lookup). Legacy
  // /shop/[vendor] still finds the vendor in the pulled `stores` by business_id.
  const store = isSeller?.seller
    ? stor
    : storeTag
      ? stor
      : stores?.find(s => s.id === product?.business_id) || null;

  // Debug: Store selection (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log("🏪 Store selection debug:", {
      isSeller: isSeller?.seller,
      stor: stor,
      storeName: stor?.name,
      storId: stor?.id,
      store: store,
      storeName2: store?.name,
      storeId2: store?.id,
      productBusinessId: product?.business_id,
      storesCount: stores?.length || 0
    });
  }


  const [isLiked, setIsLiked] = useState(false);
  const [count, setCount] = useState(1);
  const { isScrolled, scrollRef } = useScroll(20);
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


  const ratings =
    product.product_rating && product.product_rating.length > 0
      ? Math.floor(
        product.product_rating?.reduce((a, b) => a + b.rate, 0) /
        product.product_rating?.length
      )
      : 0;
  //(ratings);


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
  const liked = spotlightProduct.find((it) => it.product_id === product.id)
    ? true
    : false;


  const segments = path.split("/");
  const rawVendorName = segments[2]; // Fixed: segments[2] contains vendor name, not segments[1]
  const vendorId = segments[2]; // Extract vendor ID from URL

  // Enhance product data with transformed variants for calculations
  const enhancedProduct = {
    ...product,
    variants: transformToProperVariants || product?.variants || []
  };

  const prod: any = rawVendorName === "seller" ? productPreview : enhancedProduct;

  // Debug: Track which data source is used and what variants it contains
  console.log('🎯 Data source selection:', {
    rawVendorName,
    isSellerMode: rawVendorName === "seller",
    dataSource: rawVendorName === "seller" ? "productPreview" : "product",
    'productPreview.variants': productPreview?.variants,
    'product.variants': product?.variants,
    'prod.variants (selected)': prod?.variants,
    'prod.variations': prod?.variations,
    'prod.variant_combinations': prod?.variant_combinations
  });

  console.log("🛤️ Path analysis:", {
    fullPath: path,
    segments: segments,
    rawVendorName: rawVendorName,
    isSeller: isSeller?.seller,
    userExists: !!user
  });

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
      getProductById(legacyProductId, rawVendorName === "seller" ? "sell" : "buy");
    }
    // Depend on the ROUTE ids (stable), not the derived `productId` (which becomes the
    // resolved product's id and would re-trigger the fetch).
  }, [routePublicId, legacyProductId, getProductByPublicId, getProductById, rawVendorName, initialProduct?.public_id]);

  // Track product view in Google Analytics (buyer mode only)
  useEffect(() => {
    if (product?.id && product?.name && rawVendorName !== "seller") {
      trackViewItem({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        quantity: 1,
        category: product.category?.name,
      });
    }
  }, [product?.id, product?.name, product?.price, product?.category?.name, rawVendorName]);

  // Fetch stores data for buyer mode or authenticated store for seller mode
  useEffect(() => {

    if (rawVendorName === "seller") {
      // Fetch authenticated user's store data for seller view
      if (typeof getAuthenticatedUserStore === 'function') {
        getAuthenticatedUserStore();
      }
    } else if (storeTag) {
      // Buyer view, URL rework: resolve the vendor by the stable tag in the URL —
      // ONE indexed lookup, replacing the 500-row `fetchStores()` pull that existed
      // only to find this one vendor by product.business_id.
      if (typeof fetchStoreByTag === 'function') {
        fetchStoreByTag(storeTag);
      }
    } else {
      // Legacy /shop/[vendor]: pull the store list to find the vendor by business_id.
      if (typeof fetchStores === 'function') {
        fetchStores();
      }
    }
  }, [rawVendorName, storeTag]);  // re-resolve when the tag/mode changes

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

    const publicUrl = getPublicProductUrl(product, store || stor || {});

    // Only use Web Share API on mobile devices (desktop share sheets aren't useful)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (navigator.share && isMobile) {
      navigator
        .share({
          title: productPreview?.title,
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

  if (loading) {
    return <Loader />;
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-col bg-surface w-full max-w-full lg:max-w-5xl lg:mx-auto h-full overflow-y-scroll scrollbar-hide pb-28 focus:outline-none">
      {!isScrolled ? (
        <>
          <ProductHeader
            title={vendorName}
            isFollowed={true}
            onFollowClick={() => { }}
            isSeller={isSeller}
            logoSrc={store?.logo as string}
            vendorTheme={{
              backgroundColor: store?.business_setting?.personalised_settings?.background_color || theme.backgroundColor,
              backgroundImage: store?.business_setting?.personalised_settings?.background_image || theme.backgroundImage,
              backgroundType: store?.business_setting?.personalised_settings?.background_state || theme.backgroundType,
              pattern: theme.pattern // Use theme pattern instead of hardcoded
            }}
          />
        </>
      ) : (
        isSeller.pro && (
          <SmallHeader
            title={vendorName}
            isFollowed={true}
            onFollowClick={() => { }}
            isSeller={isSeller}
            vendorStore={store}
            vendorTheme={{
              backgroundColor: store?.business_setting?.personalised_settings?.background_color || theme.backgroundColor,
              backgroundImage: store?.business_setting?.personalised_settings?.background_image || theme.backgroundImage,
              backgroundType: store?.business_setting?.personalised_settings?.background_state || theme.backgroundType,
              pattern: theme.pattern // Use theme pattern instead of hardcoded
            }}
          />
        )
      )}

      {/* Image Carousel - Using enhanced component */}
      <div className={`relative px-3 md:px-6 lg:px-8 mb-0 lg:mb-4 ${isSeller.pro ? 'lg:mt-[calc(20vh-100px)] lg:z-20' : ''}`}>
        <ImageCarousel
          product={{ ...prod, images: currentImages.length > 0 ? currentImages : prod?.image }}
          isSeller={isSeller}
          isScrolled={isScrolled}
        />
      </div>

      {/* 2-Column Layout for Desktop */}
      <div className="lg:grid lg:grid-cols-[1fr,380px] lg:gap-8 lg:px-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-1">
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
          {!isSeller.seller && (
            <>
              <hr className="lg:hidden" />
              <DeliveryCard
                className="py-5 px-5 lg:hidden"
                returnRowClassName="px-5 py-5"
                store={store}
                stor={stor}
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
            initiallyOpen={true}
            className="px-5 lg:px-0 pb-24 lg:pb-4">
            {product?.product_rating && product.product_rating.length > 0 ? (
              product.product_rating.map((item: any, index: number) => (
                <Rating
                  key={item.id ?? index}
                  rate={item.rate}
                  comment={item.comment}
                  date={item.created_at}
                />
              ))
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

        {/* Right Column - Action Sidebar (Desktop only) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 bg-surface rounded-2xl shadow-lg p-6 border border-gray-100">
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
            {!isSeller.seller && (
              <>
                {/* Only show divider if variants exist */}
                {reconstructedVariations && <hr className="my-4" />}
                <DeliveryCard
                  returnRowClassName="px-2 mt-4"
                  store={store}
                  stor={stor}
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
          {/* End Right Column - Action Sidebar */}
        </div>
        {/* End 2-Column Layout */}
      </div>

      {/* Sticky bottom action bar */}
      <ProductCTA
        isSeller={isSeller.seller}
        count={count}
        isOutOfStock={isOutOfStock}
        onIncrement={increment}
        onDecrement={decrement}
        onBuyNow={handleBuyNow}
        onAddToCart={handleAddToCart}
        onEdit={() => router.replace(`/dashboard/catalog/product/create/manual/edit/${productId}`)}
        onShare={handleShareClick}
      />

      {/* Share Modal for Desktop */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Product"
        shareUrl={getPublicProductUrl(product, store || stor || {})}
        shareText={`Check out ${productPreview?.title || 'this product'} on Vibaar!`}
      />

      {/* Delivery flow modals — single mount, shared by the mobile + desktop cards */}
      {!isSeller.seller && (
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

function Rating({
  rate,
  comment,
  date,
}: {
  rate: number;
  comment: string;
  date: string;
}) {
  const formatedDate = new Date(date);
  const dates = isNaN(formatedDate.getTime()) ? "" : formatedDate.toDateString();
  return (
    <div className="border rounded-[8px] lg:rounded-field p-3 flex flex-col gap-1">
      <div className="flex w-full justify-between items-center">
        <div className="flex items-center">
          {Array(rate)
            .fill(null)
            .map((_, index) => (
              <svg
                key={index}
                width="14"
                height="15"
                viewBox="0 0 14 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <mask
                  id="mask0_7921_47202"
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="14"
                  height="15">
                  <rect y="0.5" width="14" height="14" fill="#D9D9D9" />
                </mask>
                <g mask="url(#mask0_7921_47202)">
                  <path
                    d="M6.47982 2.37892C6.61427 2.10653 6.6815 1.97034 6.77276 1.92683C6.85216 1.88897 6.94441 1.88897 7.02381 1.92683C7.11507 1.97034 7.1823 2.10653 7.31675 2.37892L8.59231 4.96306C8.632 5.04348 8.65185 5.08368 8.68085 5.1149C8.70653 5.14254 8.73733 5.16494 8.77154 5.18084C8.81018 5.19881 8.85455 5.2053 8.94328 5.21827L11.7965 5.63531C12.097 5.67923 12.2472 5.70118 12.3167 5.77457C12.3772 5.83842 12.4057 5.92615 12.3942 6.01335C12.3809 6.11357 12.2722 6.2195 12.0546 6.43137L9.99079 8.44156C9.92645 8.50422 9.89428 8.53555 9.87352 8.57283C9.85515 8.60584 9.84336 8.64211 9.83881 8.67961C9.83367 8.72197 9.84126 8.76623 9.85644 8.85475L10.3434 11.694C10.3948 11.9935 10.4205 12.1433 10.3722 12.2321C10.3302 12.3094 10.2556 12.3636 10.1691 12.3797C10.0696 12.3981 9.93518 12.3274 9.66626 12.186L7.1155 10.8446C7.03602 10.8028 6.99628 10.7819 6.95442 10.7736C6.91735 10.7664 6.87922 10.7664 6.84215 10.7736C6.80029 10.7819 6.76055 10.8028 6.68107 10.8446L4.13031 12.186C3.86139 12.3274 3.72693 12.3981 3.62751 12.3797C3.54101 12.3636 3.46636 12.3094 3.42437 12.2321C3.37611 12.1433 3.40179 11.9935 3.45315 11.694L3.94012 8.85475C3.95531 8.76623 3.9629 8.72197 3.95776 8.67961C3.95321 8.64211 3.94142 8.60584 3.92304 8.57283C3.90229 8.53555 3.87012 8.50422 3.80578 8.44156L1.74193 6.43137C1.52441 6.2195 1.41565 6.11357 1.40242 6.01335C1.3909 5.92615 1.41935 5.83842 1.47984 5.77457C1.54936 5.70118 1.69959 5.67923 2.00005 5.63531L4.85329 5.21827C4.94202 5.2053 4.98639 5.19881 5.02503 5.18084C5.05924 5.16494 5.09004 5.14254 5.11572 5.1149C5.14472 5.08368 5.16457 5.04348 5.20426 4.96306L6.47982 2.37892Z"
                    fill="white"
                  />
                  <path
                    d="M6.47982 2.37892C6.61427 2.10653 6.6815 1.97034 6.77276 1.92683C6.85216 1.88897 6.94441 1.88897 7.02381 1.92683C7.11507 1.97034 7.1823 2.10653 7.31675 2.37892L8.59231 4.96306C8.632 5.04348 8.65185 5.08368 8.68085 5.1149C8.70653 5.14254 8.73733 5.16494 8.77154 5.18084C8.81018 5.19881 8.85455 5.2053 8.94328 5.21827L11.7965 5.63531C12.097 5.67923 12.2472 5.70118 12.3167 5.77457C12.3772 5.83842 12.4057 5.92615 12.3942 6.01335C12.3809 6.11357 12.2722 6.2195 12.0546 6.43137L9.99079 8.44156C9.92645 8.50422 9.89428 8.53555 9.87352 8.57283C9.85515 8.60584 9.84336 8.64211 9.83881 8.67961C9.83367 8.72197 9.84126 8.76623 9.85644 8.85475L10.3434 11.694C10.3948 11.9935 10.4205 12.1433 10.3722 12.2321C10.3302 12.3094 10.2556 12.3636 10.1691 12.3797C10.0696 12.3981 9.93518 12.3274 9.66626 12.186L7.1155 10.8446C7.03602 10.8028 6.99628 10.7819 6.95442 10.7736C6.91735 10.7664 6.87922 10.7664 6.84215 10.7736C6.80029 10.7819 6.76055 10.8028 6.68107 10.8446L4.13031 12.186C3.86139 12.3274 3.72693 12.3981 3.62751 12.3797C3.54101 12.3636 3.46636 12.3094 3.42437 12.2321C3.37611 12.1433 3.40179 11.9935 3.45315 11.694L3.94012 8.85475C3.95531 8.76623 3.9629 8.72197 3.95776 8.67961C3.95321 8.64211 3.94142 8.60584 3.92304 8.57283C3.90229 8.53555 3.87012 8.50422 3.80578 8.44156L1.74193 6.43137C1.52441 6.2195 1.41565 6.11357 1.40242 6.01335C1.3909 5.92615 1.41935 5.83842 1.47984 5.77457C1.54936 5.70118 1.69959 5.67923 2.00005 5.63531L4.85329 5.21827C4.94202 5.2053 4.98639 5.19881 5.02503 5.18084C5.05924 5.16494 5.09004 5.14254 5.11572 5.1149C5.14472 5.08368 5.16457 5.04348 5.20426 4.96306L6.47982 2.37892Z"
                    fill="black"
                    fillOpacity="0.9"
                  />
                </g>
              </svg>
            ))}
        </div>

        <p className="text-caption text-foreground-secondary">{dates}</p>
      </div>
      <div className="w-full">
        <p className="text-body-sm font-medium w-full line-clamp-2">
          &quot;{comment}&quot;
        </p>
      </div>

      {/* Reviewer name / purchase details intentionally omitted: the API does not
          provide them yet, and hardcoding "Buyers name" / "Bought White, M" was
          fabricated data (W1.10). Re-add when real reviewer data is available. */}
    </div>
  );
}
