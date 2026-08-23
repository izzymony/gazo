/**
 * Google Analytics 4 Utility Functions
 *
 * This module provides functions for tracking page views and custom events
 * using Google Analytics 4 (GA4).
 *
 * Event Categories:
 * - E-commerce Events: Product views, cart, checkout, purchase
 * - User Events: Sign up, login, logout
 * - Seller Events: Store creation, product publishing, milestones
 * - Engagement Events: Search, store views, sharing
 * - Error Events: Form errors, payment errors, API errors
 * - Timing Events: Flow duration tracking
 */

// Type declarations for gtag
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// ============================================
// Event Queue (for events fired before gtag loads)
// ============================================

interface QueuedEvent {
  type: 'event' | 'config' | 'set';
  args: unknown[];
}

const eventQueue: QueuedEvent[] = [];
let gtagReady = false;

/**
 * Check if gtag is loaded and process queued events
 */
const checkGtagReady = () => {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    gtagReady = true;
    // Process queued events
    while (eventQueue.length > 0) {
      const queued = eventQueue.shift();
      if (queued) {
        window.gtag(queued.type, ...queued.args);
      }
    }
    return true;
  }
  return false;
};

/**
 * Safe gtag call that queues events if gtag isn't ready
 */
const safeGtag = (type: 'event' | 'config' | 'set', ...args: unknown[]) => {
  if (typeof window === 'undefined') return;

  if (gtagReady || checkGtagReady()) {
    window.gtag(type, ...args);
  } else {
    // Queue the event for later
    eventQueue.push({ type, args });
    // Retry after a short delay
    setTimeout(checkGtagReady, 100);
    setTimeout(checkGtagReady, 500);
    setTimeout(checkGtagReady, 1000);
    setTimeout(checkGtagReady, 2000);
  }
};

// ============================================
// Type Definitions
// ============================================

export type UserType = 'buyer' | 'seller' | 'both' | 'visitor';

export interface UserProperties {
  user_type: UserType;
  has_store: boolean;
  store_id?: string | null;
  signup_date?: string | null;
  signup_method?: string | null;
  first_purchase_date?: string | null;
  first_product_date?: string | null;
  first_sale_date?: string | null;
}

/**
 * Track page views (for SPA navigation)
 */
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && GA_MEASUREMENT_ID) {
    safeGtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

/**
 * Track custom events
 */
export const event = (action: string, params?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    safeGtag('event', action, params);
  }
};

// ============================================
// User Properties (for Buyer/Seller Segmentation)
// ============================================

/**
 * Set user properties for segmentation in GA4
 * Call this on login/signup to enable buyer vs seller analysis
 */
export const setUserProperties = (properties: Partial<UserProperties>) => {
  if (typeof window !== 'undefined') {
    safeGtag('set', 'user_properties', properties);
  }
};

/**
 * Set the user type for segmentation
 */
export const setUserType = (userType: UserType) => {
  setUserProperties({ user_type: userType });
};

/**
 * Update seller-specific properties
 */
export const updateSellerProperties = (data: {
  store_id: string;
  has_store?: boolean;
  first_product_date?: string | null;
  first_sale_date?: string | null;
}) => {
  setUserProperties({
    user_type: 'seller',
    has_store: data.has_store ?? true,
    store_id: data.store_id,
    first_product_date: data.first_product_date,
    first_sale_date: data.first_sale_date,
  });
};

/**
 * Update buyer-specific properties
 */
export const updateBuyerProperties = (data: {
  first_purchase_date?: string | null;
}) => {
  setUserProperties({
    first_purchase_date: data.first_purchase_date,
  });
};

// ============================================
// E-commerce Events
// ============================================

interface ProductItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  variant?: string;
}

/**
 * Track when a user views a product
 */
export const trackViewItem = (item: ProductItem) => {
  event('view_item', {
    currency: 'NGN',
    value: item.price,
    items: [{
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
      item_category: item.category,
      item_variant: item.variant,
    }],
  });
};

/**
 * Track when a user adds a product to cart
 */
export const trackAddToCart = (item: ProductItem) => {
  event('add_to_cart', {
    currency: 'NGN',
    value: item.price * item.quantity,
    items: [{
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
      item_category: item.category,
      item_variant: item.variant,
    }],
  });
};

/**
 * Track when a user begins checkout
 */
export const trackBeginCheckout = (items: ProductItem[], total: number) => {
  event('begin_checkout', {
    currency: 'NGN',
    value: total,
    items: items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

/**
 * Track completed purchase
 */
export const trackPurchase = (orderId: string, total: number, items: ProductItem[]) => {
  event('purchase', {
    transaction_id: orderId,
    currency: 'NGN',
    value: total,
    items: items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

/**
 * Track when a user removes a product from cart
 */
export const trackRemoveFromCart = (item: ProductItem) => {
  event('remove_from_cart', {
    currency: 'NGN',
    value: item.price * item.quantity,
    items: [{
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
      item_category: item.category,
    }],
  });
};

/**
 * Track when a user views their cart
 */
export const trackViewCart = (items: ProductItem[], total: number) => {
  event('view_cart', {
    currency: 'NGN',
    value: total,
    items: items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

/**
 * Track when shipping info is added during checkout
 */
export const trackAddShippingInfo = (shippingTier: string, value: number) => {
  event('add_shipping_info', {
    currency: 'NGN',
    value,
    shipping_tier: shippingTier,
  });
};

/**
 * Track when payment info is added during checkout
 */
export const trackAddPaymentInfo = (paymentType: string, value: number) => {
  event('add_payment_info', {
    currency: 'NGN',
    value,
    payment_type: paymentType,
  });
};

/**
 * Track checkout funnel steps
 */
export const trackCheckoutStep = (stepNumber: number, stepName: string, value?: number) => {
  event('checkout_step', {
    step_number: stepNumber,
    step_name: stepName,
    currency: 'NGN',
    value,
  });
};

// ============================================
// User Events
// ============================================

/**
 * Track user sign up
 * @param method - The signup method (email, google, instagram, tiktok)
 */
export const trackSignUp = (method: string) => {
  event('sign_up', { method });
};

/**
 * Track user login
 * @param method - The login method (email, google, instagram, tiktok)
 */
export const trackLogin = (method: string) => {
  event('login', { method });
};

/**
 * Track user logout
 */
export const trackLogout = () => {
  event('logout', {});
};

// ============================================
// Seller Events
// ============================================

/**
 * Track when a seller completes store setup
 */
export const trackSellerSignup = (storeId: string, storeName: string) => {
  event('seller_signup', {
    store_id: storeId,
    store_name: storeName,
  });
};

/**
 * Track when a seller publishes a product
 */
export const trackProductPublished = (productId: string, productName: string, price: number, category?: string) => {
  event('seller_product_published', {
    product_id: productId,
    product_name: productName,
    price: price,
    currency: 'NGN',
    category,
  });
};

/**
 * Track when a user starts the seller onboarding flow
 */
export const trackSellerOnboardingStart = (entryPoint: string) => {
  event('seller_onboarding_start', {
    entry_point: entryPoint,
  });
};

/**
 * Track seller store creation step completion
 */
export const trackSellerStoreStep = (stepNumber: number, stepName: string, data?: Record<string, unknown>) => {
  event('seller_store_step', {
    step_number: stepNumber,
    step_name: stepName,
    ...data,
  });
};

/**
 * Track when a seller starts creating a product
 */
export const trackProductCreateStart = (entryPoint: string) => {
  event('seller_product_create_start', {
    entry_point: entryPoint,
  });
};

/**
 * Track product creation step completion
 */
export const trackProductStep = (stepNumber: number, stepName: string, data?: Record<string, unknown>) => {
  event('seller_product_step', {
    step_number: stepNumber,
    step_name: stepName,
    ...data,
  });
};

/**
 * Track seller's first product milestone
 */
export const trackFirstProduct = (productId: string, storeId: string, daysSinceStore?: number) => {
  event('seller_first_product', {
    product_id: productId,
    store_id: storeId,
    days_since_store: daysSinceStore,
  });
};

/**
 * Track seller's first sale milestone
 */
export const trackFirstSale = (orderId: string, storeId: string, productId: string, daysSinceFirstProduct?: number) => {
  event('seller_first_sale', {
    order_id: orderId,
    store_id: storeId,
    product_id: productId,
    days_since_first_product: daysSinceFirstProduct,
  });
};

// ============================================
// Engagement Events
// ============================================

/**
 * Track search queries
 */
export const trackSearch = (searchTerm: string, resultsCount: number) => {
  event('search', {
    search_term: searchTerm,
    results_count: resultsCount,
  });
};

/**
 * Track when a user views a store page
 */
export const trackStoreViewed = (storeId: string, storeName: string, category?: string) => {
  event('store_viewed', {
    store_id: storeId,
    store_name: storeName,
    store_category: category,
  });
};

/**
 * Track share events (GA4 recommended event)
 */
export const trackShare = (contentType: 'product' | 'store', itemId: string, method: string, itemName?: string) => {
  event('share', {
    content_type: contentType,
    item_id: itemId,
    method,
    item_name: itemName,
  });
};

/**
 * Track product sharing specifically
 */
export const trackProductShared = (productId: string, productName: string, shareMethod: string) => {
  trackShare('product', productId, shareMethod, productName);
};

/**
 * Track store sharing specifically
 */
export const trackStoreShared = (storeId: string, storeName: string, shareMethod: string) => {
  trackShare('store', storeId, shareMethod, storeName);
};

// ============================================
// Error Tracking Events
// ============================================

/**
 * Track generic errors
 */
export const trackError = (errorType: string, errorMessage: string, context?: Record<string, unknown>) => {
  event('error', {
    error_type: errorType,
    error_message: errorMessage,
    ...context,
  });
};

/**
 * Track form validation errors
 */
export const trackFormError = (formName: string, fieldName: string, errorMessage: string) => {
  event('form_error', {
    form_name: formName,
    field_name: fieldName,
    error_message: errorMessage,
  });
};

/**
 * Track payment errors
 */
export const trackPaymentError = (errorCode: string, errorMessage: string, paymentMethod?: string) => {
  event('payment_error', {
    error_code: errorCode,
    error_message: errorMessage,
    payment_method: paymentMethod,
  });
};

/**
 * Track API errors
 */
export const trackApiError = (endpoint: string, statusCode: number, errorMessage: string) => {
  event('api_error', {
    endpoint,
    status_code: statusCode,
    error_message: errorMessage,
  });
};

/**
 * Track checkout-specific errors
 */
export const trackCheckoutError = (stepName: string, errorType: string, errorMessage: string) => {
  event('checkout_error', {
    step_name: stepName,
    error_type: errorType,
    error_message: errorMessage,
  });
};

// ============================================
// Timing Helpers
// ============================================

const TIMING_STORAGE_PREFIX = 'analytics_timing_';

/**
 * Start timing a flow (stores timestamp in sessionStorage)
 */
export const startTiming = (flowName: string): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(`${TIMING_STORAGE_PREFIX}${flowName}`, Date.now().toString());
  }
};

/**
 * End timing and get duration in seconds
 */
export const endTiming = (flowName: string): number | null => {
  if (typeof window !== 'undefined') {
    const startTime = sessionStorage.getItem(`${TIMING_STORAGE_PREFIX}${flowName}`);
    if (startTime) {
      const duration = (Date.now() - parseInt(startTime, 10)) / 1000;
      sessionStorage.removeItem(`${TIMING_STORAGE_PREFIX}${flowName}`);
      return duration;
    }
  }
  return null;
};

/**
 * Track checkout completion timing
 */
export const trackCheckoutTiming = (durationSeconds: number, stepsCompleted: number) => {
  event('timing_checkout', {
    checkout_duration_seconds: durationSeconds,
    steps_completed: stepsCompleted,
  });
};

/**
 * Track buyer activation timing (time from signup to first purchase)
 */
export const trackTimingBuyerActivation = (daysSinceSignup: number, signupMethod: string) => {
  event('timing_buyer_activation', {
    days_to_first_purchase: daysSinceSignup,
    signup_method: signupMethod,
  });
};

/**
 * Track seller activation timing (time from signup to store creation)
 */
export const trackTimingSellerActivation = (daysSinceSignup: number, signupMethod: string) => {
  event('timing_seller_activation', {
    days_to_store_creation: daysSinceSignup,
    signup_method: signupMethod,
  });
};
