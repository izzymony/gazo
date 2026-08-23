# 🏢 myInstaShop Admin Portal

## Overview
Comprehensive backoffice administration system for myInstaShop platform operations, customer support, and business management.

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14 with App Router + TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Authentication**: JWT with role-based access
- **API Integration**: Axios with custom client
- **UI Components**: Custom admin component library
- **Charts**: Recharts for analytics
- **Deployment**: Render.com (admin.instashop.com)

### Security Features
- Multi-factor authentication
- Role-based access control
- Session management with timeout
- IP whitelisting capability
- Complete audit logging
- Data encryption at rest and transit

## 📁 Project Structure

```
instashop-admin/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── auth/                     # Authentication pages
│   │   │   ├── login/
│   │   │   ├── reset-password/
│   │   │   └── components/
│   │   ├── dashboard/                # Main dashboard
│   │   ├── users/                    # User management
│   │   │   ├── [id]/                # Individual user pages
│   │   │   ├── components/
│   │   │   └── page.tsx
│   │   ├── businesses/               # Business/Store management
│   │   │   ├── [id]/
│   │   │   ├── verification/
│   │   │   ├── components/
│   │   │   └── page.tsx
│   │   ├── products/                 # Product management
│   │   ├── orders/                   # Order management
│   │   ├── financial/                # Financial operations
│   │   │   ├── withdrawals/
│   │   │   ├── transactions/
│   │   │   └── reports/
│   │   ├── support/                  # Customer support system
│   │   │   ├── tickets/
│   │   │   ├── [ticketId]/
│   │   │   └── knowledge-base/
│   │   ├── system/                   # System administration
│   │   │   ├── settings/
│   │   │   ├── monitoring/
│   │   │   └── logs/
│   │   ├── analytics/                # Business intelligence
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Homepage redirect
│   │   └── globals.css               # Global styles
│   ├── components/                   # Reusable components
│   │   ├── common/                   # Generic admin components
│   │   │   ├── AdminButton.tsx
│   │   │   ├── AdminDataTable.tsx
│   │   │   ├── AdminModal.tsx
│   │   │   ├── AdminForm.tsx
│   │   │   ├── AdminMetricCard.tsx
│   │   │   ├── AdminChart.tsx
│   │   │   ├── AdminSearchBar.tsx
│   │   │   ├── AdminPagination.tsx
│   │   │   ├── AdminBadge.tsx
│   │   │   └── AdminTooltip.tsx
│   │   ├── admin/                    # Admin-specific components
│   │   │   ├── AdminProfile.tsx
│   │   │   ├── AdminPermissions.tsx
│   │   │   └── AdminAuditLog.tsx
│   │   ├── layout/                   # Layout components
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminHeader.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AdminBreadcrumb.tsx
│   │   │   └── AdminFooter.tsx
│   │   ├── auth/                     # Authentication components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── MFASetup.tsx
│   │   │   ├── PasswordReset.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── users/                    # User management components
│   │   │   ├── UserList.tsx
│   │   │   ├── UserDetail.tsx
│   │   │   ├── UserActions.tsx
│   │   │   ├── UserFilters.tsx
│   │   │   └── UserCommunication.tsx
│   │   ├── businesses/               # Business management components
│   │   │   ├── BusinessList.tsx
│   │   │   ├── BusinessDetail.tsx
│   │   │   ├── BusinessVerification.tsx
│   │   │   ├── StoreAnalytics.tsx
│   │   │   └── BusinessActions.tsx
│   │   ├── products/                 # Product management components
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── ProductModeration.tsx
│   │   │   └── CategoryManagement.tsx
│   │   ├── orders/                   # Order management components
│   │   │   ├── OrderList.tsx
│   │   │   ├── OrderDetail.tsx
│   │   │   ├── OrderActions.tsx
│   │   │   ├── DisputeResolution.tsx
│   │   │   └── ShippingManagement.tsx
│   │   ├── financial/                # Financial components
│   │   │   ├── WithdrawalQueue.tsx
│   │   │   ├── TransactionMonitor.tsx
│   │   │   ├── FinancialReports.tsx
│   │   │   ├── PayoutApproval.tsx
│   │   │   └── FraudDetection.tsx
│   │   ├── support/                  # Support system components
│   │   │   ├── TicketList.tsx
│   │   │   ├── TicketDetail.tsx
│   │   │   ├── TicketResponse.tsx
│   │   │   ├── SupportDashboard.tsx
│   │   │   └── KnowledgeBase.tsx
│   │   ├── system/                   # System admin components
│   │   │   ├── SystemHealth.tsx
│   │   │   ├── SystemSettings.tsx
│   │   │   ├── SystemLogs.tsx
│   │   │   └── SystemMonitoring.tsx
│   │   └── charts/                   # Chart components
│   │       ├── AdminLineChart.tsx
│   │       ├── AdminBarChart.tsx
│   │       ├── AdminPieChart.tsx
│   │       └── AdminAreaChart.tsx
│   ├── store/                        # Zustand state management
│   │   ├── admin/                    # Admin-related stores
│   │   │   ├── adminAuthStore.ts
│   │   │   ├── adminProfileStore.ts
│   │   │   ├── adminPermissionStore.ts
│   │   │   └── auditLogStore.ts
│   │   ├── user/                     # User management stores
│   │   │   ├── userManagementStore.ts
│   │   │   ├── userCommunicationStore.ts
│   │   │   └── userAnalyticsStore.ts
│   │   ├── business/                 # Business management stores
│   │   │   ├── businessManagementStore.ts
│   │   │   ├── businessVerificationStore.ts
│   │   │   └── storeAnalyticsStore.ts
│   │   ├── order/                    # Order management stores
│   │   │   ├── orderManagementStore.ts
│   │   │   ├── disputeResolutionStore.ts
│   │   │   └── shippingManagementStore.ts
│   │   ├── financial/                # Financial management stores
│   │   │   ├── withdrawalManagementStore.ts
│   │   │   ├── transactionMonitorStore.ts
│   │   │   ├── financialReportsStore.ts
│   │   │   └── fraudDetectionStore.ts
│   │   ├── support/                  # Support system stores
│   │   │   ├── supportTicketStore.ts
│   │   │   ├── supportCommunicationStore.ts
│   │   │   └── knowledgeBaseStore.ts
│   │   └── system/                   # System management stores
│   │       ├── systemHealthStore.ts
│   │       ├── systemSettingsStore.ts
│   │       └── systemMonitoringStore.ts
│   ├── lib/                          # Utility libraries
│   │   ├── api/                      # API integration
│   │   │   ├── adminClient.ts        # Admin API client
│   │   │   ├── endpoints.ts          # API endpoint definitions
│   │   │   ├── interceptors.ts       # Request/response interceptors
│   │   │   └── types.ts              # API response types
│   │   ├── utils/                    # Utility functions
│   │   │   ├── dateUtils.ts          # Date formatting/manipulation
│   │   │   ├── stringUtils.ts        # String utilities
│   │   │   ├── numberUtils.ts        # Number formatting
│   │   │   ├── permissionUtils.ts    # Permission checking
│   │   │   └── auditUtils.ts         # Audit logging helpers
│   │   ├── validations/              # Form validations
│   │   │   ├── authValidations.ts
│   │   │   ├── userValidations.ts
│   │   │   ├── businessValidations.ts
│   │   │   └── supportValidations.ts
│   │   └── constants/                # Application constants
│   │       ├── adminRoles.ts         # Role definitions
│   │       ├── permissions.ts        # Permission definitions
│   │       ├── routes.ts             # Route constants
│   │       └── apiEndpoints.ts       # API endpoint constants
│   ├── types/                        # TypeScript type definitions
│   │   ├── admin/                    # Admin-specific types
│   │   │   ├── auth.ts               # Authentication types
│   │   │   ├── roles.ts              # Role and permission types
│   │   │   └── audit.ts              # Audit log types
│   │   ├── api/                      # API response types
│   │   │   ├── userApi.ts            # User API types
│   │   │   ├── businessApi.ts        # Business API types
│   │   │   ├── orderApi.ts           # Order API types
│   │   │   ├── financialApi.ts       # Financial API types
│   │   │   └── supportApi.ts         # Support API types
│   │   └── database/                 # Database entity types
│   │       ├── user.ts               # User entity types
│   │       ├── business.ts           # Business entity types
│   │       ├── order.ts              # Order entity types
│   │       ├── financial.ts          # Financial entity types
│   │       └── support.ts            # Support entity types
│   ├── hooks/                        # Custom React hooks
│   │   ├── admin/                    # Admin-specific hooks
│   │   │   ├── useAdminAuth.ts       # Admin authentication
│   │   │   ├── usePermissions.ts     # Permission checking
│   │   │   └── useAuditLog.ts        # Audit logging
│   │   ├── api/                      # API hooks
│   │   │   ├── useUsers.ts           # User management hooks
│   │   │   ├── useBusinesses.ts      # Business management hooks
│   │   │   ├── useOrders.ts          # Order management hooks
│   │   │   ├── useFinancial.ts       # Financial operation hooks
│   │   │   └── useSupport.ts         # Support system hooks
│   │   └── common/                   # Common hooks
│   │       ├── useLocalStorage.ts    # Local storage management
│   │       ├── useDebounce.ts        # Debouncing
│   │       └── usePagination.ts      # Pagination logic
│   ├── config/                       # Configuration files
│   │   ├── env.ts                    # Environment configuration
│   │   ├── auth.ts                   # Authentication configuration
│   │   └── api.ts                    # API configuration
│   └── utils/                        # Utility functions
│       ├── formatters/               # Data formatters
│       │   ├── currency.ts           # Currency formatting
│       │   ├── date.ts               # Date formatting
│       │   └── text.ts               # Text formatting
│       ├── validators/               # Data validators
│       │   ├── email.ts              # Email validation
│       │   ├── phone.ts              # Phone validation
│       │   └── form.ts               # Form validation
│       └── helpers/                  # Helper functions
│           ├── download.ts           # File download helpers
│           ├── export.ts             # Data export helpers
│           └── notification.ts       # Notification helpers
├── public/                           # Static assets
│   ├── icons/                        # Admin-specific icons
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── orders/
│   │   └── system/
│   └── images/                       # Admin images
│       ├── logos/
│       ├── backgrounds/
│       └── placeholders/
├── docs/                             # Documentation
│   ├── setup/                        # Setup guides
│   │   ├── installation.md
│   │   ├── development.md
│   │   └── deployment.md
│   ├── api/                          # API documentation
│   │   ├── endpoints.md
│   │   ├── authentication.md
│   │   └── permissions.md
│   ├── admin/                        # Admin guides
│   │   ├── user-management.md
│   │   ├── support-system.md
│   │   └── financial-operations.md
│   └── security/                     # Security documentation
│       ├── access-control.md
│       ├── audit-logging.md
│       └── data-protection.md
├── scripts/                          # Build and deployment scripts
│   ├── setup.sh                     # Initial setup script
│   ├── build.sh                     # Build script
│   ├── deploy.sh                    # Deployment script
│   └── migrate.sh                   # Database migration script
├── .github/                          # GitHub workflows
│   └── workflows/
│       ├── ci.yml                    # Continuous integration
│       ├── deploy-staging.yml        # Staging deployment
│       └── deploy-production.yml     # Production deployment
├── .env.local                        # Environment variables (template)
├── .env.example                      # Environment example
├── .gitignore                        # Git ignore rules
├── package.json                      # Dependencies and scripts
├── tailwind.config.js               # Tailwind CSS configuration
├── next.config.mjs                  # Next.js configuration
├── tsconfig.json                    # TypeScript configuration
├── README.md                        # Project documentation
└── SECURITY.md                      # Security guidelines
```

## 🔧 Key Features

### Phase 1 (Weeks 1-4)
- ✅ Admin authentication with MFA
- ✅ User management and communication tools
- ✅ Support ticket system
- ✅ Basic audit logging
- ✅ Order intervention capabilities
- ✅ Financial withdrawal approvals

### Phase 2 (Weeks 5-8)
- ✅ Business/store verification workflows
- ✅ Product management and moderation
- ✅ Advanced order management
- ✅ Financial reporting and monitoring
- ✅ System health monitoring

### Phase 3 (Weeks 9-12)
- ✅ Advanced analytics and reporting
- ✅ Automated fraud detection
- ✅ Knowledge base management
- ✅ Performance optimization
- ✅ Production deployment

## 🛡️ Security Architecture

### Role-Based Access Control
- **Super Admin**: Full system access
- **System Admin**: User and system management
- **Operations Admin**: Business and order operations
- **Financial Admin**: Financial operations and reporting
- **Support Admin**: Customer service and basic operations

### Security Features
- Multi-factor authentication (MFA)
- Session management with configurable timeouts
- IP whitelisting and geographic restrictions
- Complete audit trail for all admin actions
- Data encryption and secure API communication
- Role-based route protection

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Access to myInstaShop backend API
- Admin database credentials
- Environment configuration

### Installation
```bash
# Clone and setup
cd /Users/macbookpro/Documents/INSTASHOP/App/Repo/instashop-admin
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

## 📊 Development Guidelines

### Code Organization
- **Feature-based structure**: Organized by admin functional areas
- **Component reusability**: Shared components in common directory
- **Type safety**: Comprehensive TypeScript coverage
- **State management**: Zustand stores for each functional area
- **API integration**: Centralized API client with interceptors

### Naming Conventions
- **Components**: PascalCase (AdminButton.tsx)
- **Files**: camelCase for utilities, PascalCase for components
- **API functions**: Descriptive action names (getUserList, approveWithdrawal)
- **Store actions**: Verb-based naming (fetchUsers, updateUserStatus)

### Security Best Practices
- All admin actions logged for audit trail
- Permission checks at component and API levels
- Sensitive data masking in UI components
- Secure session management with auto-logout
- Input validation and sanitization

## 🔗 Integration

### Backend Integration
- Extends existing Go backend with admin-specific endpoints
- Leverages current authentication system with admin roles
- Uses existing database schema with admin table extensions
- Maintains API consistency with main platform

### Deployment
- Separate subdomain (admin.instashop.com)
- Independent deployment pipeline
- Environment-specific configurations
- Automated security scanning and monitoring

This admin portal provides comprehensive operational management capabilities for myInstaShop while maintaining security, scalability, and maintainability standards.