# myInstashop - Comprehensive Codebase Architecture Overview

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [Architecture Patterns](#architecture-patterns)
- [Buyer vs Seller Features](#buyer-vs-seller-features)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Component Architecture](#component-architecture)
- [Current Development Status](#current-development-status)
- [Development Priorities](#development-priorities)

---

## 🚀 Project Overview

**myInstashop** is a modern social commerce platform built with Next.js 14, designed for the Nigerian market with a mobile-first approach. The platform enables dual-mode functionality for both buyers and sellers, with 85% mobile user optimization and Instagram integration for social commerce.

### Core Value Proposition
- **Dual-Mode Experience**: Seamless switching between buyer and seller personas
- **Social Commerce**: Instagram, TikTok, and Google authentication integration
- **Nigerian Market Focus**: Local payment methods, mobile optimization, and cultural considerations
- **Progressive Enhancement**: Guest shopping with enhanced authenticated features

---

## 🛠 Technical Stack

### **Frontend**
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand with persistence
- **Authentication**: JWT with refresh token rotation
- **PWA**: Next-PWA for offline capabilities

### **Development & Build**
- **Package Manager**: npm
- **Linting**: ESLint with Next.js config
- **Type Checking**: TypeScript 5.7.2
- **Build System**: Next.js build optimization

### **Key Dependencies**
```json
{
  "next": "^14.2.30",
  "react": "^18",
  "typescript": "^5.7.2",
  "zustand": "^5.0.0-rc.2",
  "tailwindcss": "^3.4.1",
  "formik": "^2.4.6",
  "yup": "^1.4.0",
  "axios": "^1.7.7",
  "js-cookie": "^3.0.5"
}
```

---

## 📁 Project Structure

### **Root Structure**
```
instashop-web/
├── src/
│   ├── app/                    # Next.js 13+ App Router
│   ├── components/             # Reusable UI components
│   ├── store/                  # Zustand state management
│   ├── lib/                    # Utilities and configurations
│   ├── hooks/                  # Custom React hooks
│   ├── assets/                 # Static assets and icons
│   └── styles/                 # Global CSS and Tailwind
├── public/                     # Static files and images
├── package.json                # Dependencies and scripts
├── next.config.mjs            # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

### **App Directory (Next.js 13+ Router)**
```
src/app/
├── (auth)/                     # Authentication flows
│   ├── signin/
│   ├── signup/
│   └── forgot-password/
├── (marketplace)/              # Buyer experience
│   ├── vendors/                # Vendor discovery and browsing
│   ├── cart/                   # Shopping cart and checkout
│   └── orders/                 # Order history and tracking
├── (seller)/                   # Seller experience
│   ├── dashboard/              # Analytics and metrics
│   └── seller/                 # Store and product management
├── (user)/                     # User management
│   ├── profile/
│   ├── inbox/
│   └── notification/
└── (legal)/                    # Legal pages
    ├── terms-of-service/
    └── privacy-policy/
```

---

## 🏗 Architecture Patterns

### **Design Principles**
- **Safety-First**: Enhance existing > Modify existing > Create new (last resort)
- **Component Reusability**: Extensive common component library
- **TypeScript Safety**: Strong typing throughout the application
- **Mobile-First**: 85% mobile user optimization
- **Progressive Enhancement**: Feature layering based on authentication status

### **Key Architectural Decisions**

#### **1. Next.js App Router Structure**
- **Feature-based routing** with grouped layouts
- **Parallel routes** for modal overlays
- **Dynamic routing** for vendor and product pages
- **Route protection** via middleware

#### **2. State Management Strategy**
- **Zustand stores** for global state with persistence
- **Local component state** for UI-specific interactions
- **Server state synchronization** via API client
- **Guest state handling** for non-authenticated users

#### **3. Authentication Architecture**
```typescript
// Multi-provider authentication system
interface AuthFlow {
  providers: ["google", "instagram", "tiktok"];
  tokenManagement: "jwt-with-refresh";
  guestSupport: true;
  socialCallbacks: true;
}
```

---

## 👥 Buyer vs Seller Features

### **🛒 Buyer Experience**

#### **Discovery & Shopping**
| Feature | Status | Description |
|---------|--------|-------------|
| Vendor Discovery | ✅ Complete | Main marketplace with vendor browsing |
| Product Search | ✅ Complete | Search functionality across products |
| Category Filtering | ✅ Complete | Product categorization and filtering |
| Recently Viewed | ✅ Complete | Shopping history tracking |
| Wishlist/Spotlights | ✅ Complete | Product favoriting system |
| Guest Shopping | ✅ Complete | Non-authenticated shopping flow |

#### **Shopping Cart & Orders**
| Feature | Status | Description |
|---------|--------|-------------|
| Shopping Cart | ✅ Complete | Full cart management with quantity controls |
| Multi-vendor Cart | ✅ Complete | Products organized by vendor |
| Shipping Profiles | ✅ Complete | Multiple address management |
| Order Tracking | ✅ Complete | Real-time order status updates |
| Payment Integration | ✅ Complete | Secure payment processing |
| Order History | ✅ Complete | Complete order tracking interface |

### **🏪 Seller Experience**

#### **Store Management**
| Feature | Status | Description |
|---------|--------|-------------|
| Store Creation | ✅ Complete | Multi-step store setup process |
| Store Customization | ✅ Complete | Theme, colors, and branding |
| Business Profile | ✅ Complete | Contact info, category, description |
| Bank Account Setup | ✅ Complete | Payment collection configuration |
| Shipping Methods | ✅ Complete | Delivery options and pricing |

#### **Product Management**
| Feature | Status | Description |
|---------|--------|-------------|
| Product Creation | ✅ Complete | Manual and import product creation |
| Progressive Setup | ✅ Complete | Step-by-step product creation flow |
| Product Variants | ✅ Complete | Colors, sizes, and variations |
| Inventory Management | ✅ Complete | Stock tracking and management |
| Image Management | ✅ Complete | Multiple images with cropping |
| Collections | ✅ Complete | Product categorization |

#### **Analytics & Management**
| Feature | Status | Description |
|---------|--------|-------------|
| Sales Dashboard | ✅ Complete | Revenue and sales metrics |
| Order Management | ✅ Complete | Complete order processing |
| Customer Analytics | ✅ Complete | Customer insights and data |
| Financial Tracking | ✅ Complete | Wallet and transaction management |
| Performance Metrics | ✅ Complete | KPIs and fulfillment rates |

---

## 🏪 State Management

### **Zustand Store Architecture**

#### **1. AuthStore (`authStore.ts`)**
```typescript
interface AuthState {
  // User authentication and profile management
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  
  // Social authentication
  authtypes: "google" | "instagram" | "tiktok" | "";
  
  // Business relationships
  followBusiness: (id: string) => Promise<void>;
  unfollowBusiness: (id: string) => Promise<void>;
  
  // Shipping management
  createShippingAddress: (address: Address) => Promise<void>;
}
```

#### **2. BusinessStore (`businessStore.ts`)**
```typescript
interface BusinessState {
  // Store management
  store: BusinessData | null;
  stores: BusinessData[];
  
  // Analytics data
  customerAnalytics: CustomerAnalytics;
  salesAnalytics: SalesAnalytics;
  
  // Product management
  businessProducts: BusinessProduct[];
  fetchBusinessProduct: (page: number) => Promise<void>;
  
  // Store operations
  createBusiness: (data: BusinessPayload) => Promise<void>;
  updateBusiness: (data: BusinessPayload) => Promise<void>;
}
```

#### **3. ProductStore (`productStore.ts`)**
```typescript
interface ProductState {
  // Product catalog
  products: Product[];
  singleProduct: Product | null;
  
  // Wishlist and favorites
  spotlightProduct: SpotlightProduct[];
  
  // Product operations
  createProduct: (data: ProductData) => Promise<void>;
  updateProduct: (id: string, data: ProductData) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}
```

#### **4. OrderStore (`orderStore.ts`)**
```typescript
interface OrderState {
  // Shopping cart
  cart: CartItem[];
  cartTotal: number;
  
  // Order management
  orders: Order[];
  singleOrder: Order | null;
  
  // Cart operations
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  
  // Order processing
  createOrder: (orderData: OrderData) => Promise<void>;
  payForOrder: (orderId: string, paymentData: PaymentData) => Promise<void>;
}
```

#### **5. ShippingStore (`shippingStore.ts`)**
```typescript
interface ShippingState {
  // Shipping profiles
  shippingProfiles: ShippingProfile[];
  selectedProfile: ShippingProfile | null;
  
  // Shipping operations
  createShippingProfile: (profile: ShippingProfile) => Promise<void>;
  updateShippingProfile: (id: string, profile: ShippingProfile) => Promise<void>;
}
```

---

## 🌐 API Integration

### **Client Architecture (`lib/client.ts`)**

#### **HTTP Client Features**
- **Automatic token management** with JWT refresh
- **Request/response interceptors** for consistent handling
- **Error handling** with custom error boundaries
- **Guest user support** with guest-id headers
- **Concurrent request management** during token refresh

```typescript
interface ClientParams {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
  data?: unknown;
  queryParams?: Record<string, unknown>;
  contentType?: string;
  headers?: Record<string, string>;
}
```

#### **Environment Configuration**
```typescript
// Required environment variables
NEXT_PUBLIC_API_BASE_URL          // Backend API endpoint
NEXT_PUBLIC_CALLBACKENDPOINT      // OAuth callback URL
NEXT_PUBLIC_GOOGLE_API_KEY        // Google Maps integration
NEXT_PUBLIC_MAPBOX_TOKEN          // Mapbox integration
```

#### **Authentication Flow**
1. **Social OAuth** → Platform-specific login
2. **Token Exchange** → JWT access + refresh tokens
3. **Automatic Refresh** → Seamless token rotation
4. **Guest Fallback** → Non-authenticated shopping
5. **State Persistence** → Zustand localStorage sync

---

## 🧩 Component Architecture

### **Component Organization**

#### **Common Components (`/components/common/`)**
```typescript
// Core UI Library (26 components)
├── Button.tsx                  // Primary button with variants
├── Typography.tsx              // Typography system (H1-H6, P)
├── InputField.tsx              // Form input components
├── Modal components/           // BottomModal, Popover
├── Navigation/                 // Tabs, NavigationTabs, StepNavigation
├── Data Display/               // EmptyState, Loader, TrendIndicator
├── Interactive/                // Accordion, DropdownMenu, FilterBar
└── Specialized/                // StoreLogo, StoreStatusBadge, NotificationBadge
```

#### **Feature Components**
```typescript
// Authentication Components
/signin/ + /signup/             // Complete auth flows (9 components)

// Business Components  
/Dashboard/                     // Seller dashboard (6 components)
/vendor/                        // Storefront display (10 components)

// Product Management
/productSetup/                  // Product creation workflows (7 components)
/storeSetup/                   // Store creation workflows (7 components)

// Business Logic
/comp/                         // Analytics and business components (19 components)
```

### **Component Design Patterns**

#### **1. Composition Pattern**
```typescript
// Example: MainLayout component
<MainLayout
  headerProps={{
    showBack: true,
    customText: "Store",
    showMenu: true,
    onBackClick: () => router.back()
  }}
>
  <YourContent />
</MainLayout>
```

#### **2. Render Props Pattern**
```typescript
// Example: EmptyState component
<EmptyState
  image="/images/empty.svg"
  title="No products found"
  action={() => <Button>Add Product</Button>}
/>
```

#### **3. Compound Components**
```typescript
// Example: Tabs system
<Tabs
  tabs={["Products", "Collections", "Discount"]}
  tabContents={[
    <Product key={0} />,
    <Collections key={1} />,
    <Discount key={2} />
  ]}
/>
```

---

## 📊 Current Development Status

### **✅ Fully Implemented Features**

#### **Core Functionality**
- **User Authentication**: Multi-platform social auth (Google, Instagram, TikTok)
- **Shopping Experience**: Complete buyer journey from discovery to checkout
- **Seller Tools**: Full store creation and product management
- **Order Management**: End-to-end order processing for both sides
- **Payment Integration**: Secure payment processing with Paystack
- **Analytics Dashboard**: Comprehensive business metrics and insights

#### **Technical Implementation**
- **Responsive Design**: Mobile-first approach with 85% mobile optimization
- **Progressive Web App**: PWA capabilities with offline support
- **TypeScript Coverage**: Strong typing throughout the application
- **State Management**: Zustand with persistence and optimization
- **API Integration**: Robust HTTP client with error handling

### **🔶 Areas Needing Attention**

#### **Component Organization**
- **Inconsistent naming**: Mix of camelCase and PascalCase
- **Directory structure**: `/comp/` needs better organization
- **Code duplication**: Similar components scattered across directories

#### **Design System**
- **Limited Typography**: Only H1 component exists
- **Hardcoded styles**: Colors and spacing not systematized
- **Missing variants**: Limited button, card, and input variations
- **Icon management**: SVG icons embedded directly in components

#### **Performance Optimization**
- **Bundle optimization**: Potential for code splitting improvements
- **Image optimization**: Consistent use of Next.js Image component
- **Loading states**: More sophisticated skeleton loaders needed

---

## 🎯 Development Priorities

### **🔥 High Priority (Immediate)**

#### **1. Design System Enhancement**
```typescript
// Needed components
├── Typography/     // Complete H1-H6, P, Label system
├── Cards/          // Generic card components
├── Icons/          // Centralized icon library
├── Forms/          // Enhanced form components with validation
└── Layout/         // Grid and spacing utilities
```

#### **2. Component Refactoring**
- **Standardize naming**: Convert all components to PascalCase
- **Reorganize directories**: Create logical feature groups
- **Eliminate duplication**: Consolidate similar components
- **Add TypeScript interfaces**: Proper prop validation

#### **3. Performance Optimization**
- **Implement code splitting**: Route-based and component-based
- **Optimize images**: Consistent Next.js Image usage
- **Bundle analysis**: Identify and eliminate unused dependencies
- **Lazy loading**: Implement for non-critical components

### **🎯 Medium Priority (Next Phase)**

#### **1. Enhanced Features**
- **Advanced Search**: Better filtering and discovery
- **Social Features**: Sharing, reviews, community building
- **Marketing Tools**: Discount codes, promotions, campaigns
- **Advanced Analytics**: More detailed business intelligence

#### **2. Developer Experience**
- **Storybook Integration**: Component documentation and testing
- **Testing Setup**: Unit and integration testing framework
- **Error Boundaries**: Better error handling and reporting
- **Documentation**: Comprehensive component and API docs

#### **3. Mobile App Development**
- **React Native**: Native iOS/Android applications
- **Push Notifications**: Enhanced mobile engagement
- **Offline Capabilities**: Enhanced PWA features
- **App Store Optimization**: Native app store presence

### **⚡ Long-term Goals**

#### **1. Scalability**
- **Microservices**: API decomposition for scale
- **CDN Integration**: Global content delivery
- **Database Optimization**: Performance and reliability
- **Multi-region Support**: Global expansion capabilities

#### **2. Advanced Features**
- **AI Integration**: Personalization and recommendations
- **Advanced Analytics**: Machine learning insights
- **Multi-language Support**: International expansion
- **Advanced SEO**: Enhanced search engine optimization

---

## 🔧 Development Guidelines

### **Code Standards**
- **TypeScript First**: No `any` types without justification
- **Component Naming**: PascalCase for all components
- **File Organization**: Feature-based directory structure
- **Import Organization**: Absolute imports with path mapping

### **Safety-First Principles**
1. **Enhance existing components** before modifying
2. **Modify existing components** before creating new ones
3. **Create new components** only as a last resort
4. **Always check `/components/common/`** for reusable components
5. **Preserve existing functionality** during refactoring

### **Mobile-First Approach**
- **36px minimum touch targets** for Nigerian mobile users
- **Encouraging messaging** for new stores and users
- **Consistent component sizing** across different screen sizes
- **Offline-first design** for reliable mobile experience

---

## 📈 Success Metrics

### **Technical Metrics**
- **Performance Score**: Lighthouse 90+ on mobile
- **Bundle Size**: < 500KB initial load
- **Type Coverage**: 95%+ TypeScript coverage
- **Component Reusability**: 80%+ component reuse rate

### **Business Metrics**
- **Mobile Conversion**: Optimize for 85% mobile user base
- **Store Creation Rate**: Streamlined onboarding flow
- **Order Completion**: Reduced cart abandonment
- **User Engagement**: Enhanced seller/buyer interaction

---

*This architecture overview represents the current state of the myInstashop codebase as of July 2025. The application demonstrates strong foundations for a scalable social commerce platform with clear separation of buyer and seller experiences.*