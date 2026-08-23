package helper

const (
	LogDir  = "./logs/"
	LogFile = "./logs/insta.log"
)

type OrderActivityTitle string

const (
	OrderActivityOrderPlaced          OrderActivityTitle = "Order Placed"
	OrderActivityNewOrderReceived     OrderActivityTitle = "New order received"
	OrderActivityPaymentConfirmed     OrderActivityTitle = "Payment confirmed"
	OrderActivityShippingProcessing   OrderActivityTitle = "Shipping started"
	OrderActivityShippingConfirmed    OrderActivityTitle = "Shipping confirmed"
	OrderActivityRiderEnrouteToVendor OrderActivityTitle = "Rider on the way to Vendor"
	OrderActivityOrderPickedup        OrderActivityTitle = "Order Picked up"
	OrderActivityOrderInTransit       OrderActivityTitle = "Order In Transit"
	OrderActivityDelivered            OrderActivityTitle = "Order Delivered"
	OrderActivityCancelled            OrderActivityTitle = "Order Cancelled"

	OrderActivityReadyForShipping          OrderActivityTitle = "Ready for shipping"
	OrderActivityOrderCancelled            OrderActivityTitle = "Order cancelled"
	OrderActivityCourierProcessingShipment OrderActivityTitle = "Courier processing shipping"
	OrderActivityCourierAcceptedShipment   OrderActivityTitle = "Courier accepted shipping"
	OrderActivityPackagePickedUp           OrderActivityTitle = "Package picked up"
	OrderActivityWaitingToBeShipped        OrderActivityTitle = "Waiting to be shipped"
	OrderActivityShipped                   OrderActivityTitle = "Shipped"
	OrderActivityOutForDelivery            OrderActivityTitle = "Out for delivery"
)

type PaymentStatus string

const (
	PaymentSuccessful PaymentStatus = "success"
	PaymentPending    PaymentStatus = "pending"
	PaymentFailed     PaymentStatus = "failed"
	PaymentExpired    PaymentStatus = "expired" // set by the pending-transaction GC
)

type OrderStatus string

const (
	OrderStatusPending          OrderStatus = "pending"
	OrderStatusProcessing       OrderStatus = "processing"
	OrderStatusCancelled        OrderStatus = "cancelled"
	OrderStatusShipped          OrderStatus = "shipped"
	OrderStatusPaymentConfirmed OrderStatus = "payment_confirmed"
	OrderStatusPendingPayment   OrderStatus = "pending_payment"
	OrderStatusDelivered        OrderStatus = "delivered"
	OrderStatusDeclined         OrderStatus = "declined"
)

type ActivityCategory string

const (
	OrderActivityCategory  ActivityCategory = "order"
	StoreActivityCategory  ActivityCategory = "store"
	SystemActivityCategory ActivityCategory = "system"
	WalletActivityCategory ActivityCategory = "wallet"
)

type WalletTransactionType string

const (
	WalletTopUpWalletTransactionType      WalletTransactionType = "wallet_top_up"
	ProductSaleWalletTransactionType      WalletTransactionType = "product_sale"
	WithdrawalWalletTransactionType       WalletTransactionType = "withdrawal"
	OrderInProgressTransactionType        WalletTransactionType = "order_in_progress"
	CreditClearingBalanceTransactionType  WalletTransactionType = "credit_clearing_balance"
	CreditAvailableBalanceTransactionType WalletTransactionType = "credit_available_balance"
	WithdrawalTransactionType             WalletTransactionType = "withdrawal"
)

type WalletBalanceType string

const (
	ClearingBalanceWalletBalanceType  WalletBalanceType     = "clearing_balance"
	AvailableBalanceWalletBalanceType WalletBalanceType     = "available_balance"
	OrdersInProgressTransactionType   WalletTransactionType = "orders_in_progress"
)

type ProductStatus string

const (
	ProductStatusActive ProductStatus = "active"
	ProductStatusDraft  ProductStatus = "draft"
)

type VerificationCodeType string

const (
	WithdrawalOTP VerificationCodeType = "withdrawal_otp"
	RegisterOTP   VerificationCodeType = "register_otp"
)

var (
	SendgridRegisterOTPTemplate = "d-262fc5616bb247469e073a6bc5375e85"
)

type NotificationType string

const (
	OrderNotification       NotificationType = "order"
	PromoNotification       NotificationType = "promo"
	SystemAlertNotification NotificationType = "system_alert"
)

// KYC / verification notifications (KYC1). Titles MUST contain "KYC Verification"
// (the web notification consumer categorises on a case-insensitive "kyc verification" match).
const (
	KYCApprovedTitle = "KYC Verification Complete"
	KYCApprovedBody  = "Your identity is verified — your Verified badge is now live and withdrawals are unlocked."
	KYCRejectedTitle = "KYC Verification Update"
	KYCRejectedBody  = "We couldn't verify your identity: %s. Please resubmit."
)

type OrderNotificationTitle string

const (
	OrderPlacedTitle           OrderNotificationTitle = "Order Placed"
	PaymentConfirmedTitle      OrderNotificationTitle = "Payment Confirmed"
	SellerPackagingTitle       OrderNotificationTitle = "Seller Packaging Your Item"
	OrderReadyForShipmentTitle OrderNotificationTitle = "Order Ready for Shipment"
	RiderEnRouteTitle          OrderNotificationTitle = "Rider En Route to Vendor"
	OrderPickedUpTitle         OrderNotificationTitle = "Order Picked Up"
	OrderInTransitTitle        OrderNotificationTitle = "Order In Transit"
	OrderDeliveredTitle        OrderNotificationTitle = "Order Delivered"
	DeliveryFailedTitle        OrderNotificationTitle = "Delivery Attempt Failed"
	OrderCancelledTitle        OrderNotificationTitle = "Order Cancelled"
	OrderReturnedToVendorTitle OrderNotificationTitle = "Order Returned to Vendor"
)

type OrderNotificationBody string

const (
	OrderPlacedBody           OrderNotificationBody = "Your order #%s has been placed"
	PaymentConfirmedBody      OrderNotificationBody = "Payment confirmed for order #%s"
	SellerPackagingBody       OrderNotificationBody = "Seller is packaging your order #%s"
	OrderReadyForShipmentBody OrderNotificationBody = "Order #%s is ready for shipment"
	RiderEnRouteBody          OrderNotificationBody = "Rider en route to vendor for order #%s"
	OrderPickedUpBody         OrderNotificationBody = "Order #%s picked up"
	OrderInTransitBody        OrderNotificationBody = "Order #%s in transit"
	OrderDeliveredBody        OrderNotificationBody = "Order #%s delivered"
	DeliveryFailedBody        OrderNotificationBody = "Delivery attempt failed for order #%s"
	OrderCancelledBody        OrderNotificationBody = "Order #%s cancelled"
	OrderReturnedToVendorBody OrderNotificationBody = "Order #%s returned to vendor"
)

type PromoNotificationTitle string

const (
	FlashSaleTitle    PromoNotificationTitle = "Flash Sale Alert"
	CartReminderTitle PromoNotificationTitle = "Cart Reminder"
	BackInStockTitle  PromoNotificationTitle = "Item Back in Stock"
	PriceDropTitle    PromoNotificationTitle = "Price Drop Alert"
	WishlistSaleTitle PromoNotificationTitle = "Wishlist Sale Alert"
)

type PromoNotificationBody string

const (
	FlashSaleBody    PromoNotificationBody = "⚡ Flash Sale! 20% off on your favorite sneakers for 2 hrs only."
	CartReminderBody PromoNotificationBody = "🛒 Still thinking? Your cart items are waiting! Complete your order now."
	BackInStockBody  PromoNotificationBody = "⭐ Good news! Your wish-listed item is back in stock."
	PriceDropBody    PromoNotificationBody = "📉 Price dropped! Your watched item is now ₦%s (was ₦%s)."
	WishlistSaleBody PromoNotificationBody = "🔖 Your wish-listed product is on sale—grab it before it’s gone."
)

type SystemNotificationTitle string

const (
	MaintenanceTitle  SystemNotificationTitle = "Scheduled Maintenance"
	NewFeatureTitle   SystemNotificationTitle = "New Feature Released"
	PolicyUpdateTitle SystemNotificationTitle = "Policy Update"
)

type SystemNotificationBody string

const (
	MaintenanceBody  SystemNotificationBody = "🛠 Maintenance scheduled for %s. Please expect limited service during this time."
	NewFeatureBody   SystemNotificationBody = "ℹ New feature released: %s."
	PolicyUpdateBody SystemNotificationBody = "ℹ Policy updated: New terms effective %s."
)
