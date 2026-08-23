package services

import "insta-api/internal/core/domain"

// NotifTier is the NS2 importance tier. It decides the channels and whether the
// notification touches the unread badge. See
// product-management/requirements/NS2_NOTIFICATION_CATALOG.md.
type NotifTier string

const (
	TierCritical NotifTier = "critical" // money, new order, security, delivery done — in-app + WhatsApp, counts
	TierStandard NotifTier = "standard" // actionable update / nudge — in-app (push in Phase 5)
	TierAmbient  NotifTier = "ambient"  // reassurance & social proof — in-app only, never on the badge
)

// Notification.Type values (mirror internal/helper consts) used for feed filtering.
const (
	notifTypeOrder  = "order"
	notifTypePromo  = "promo"
	notifTypeSystem = "system_alert"
)

// NotifDef is one row of the locked NS2 catalog. Titles are notice-first —
// "[what happened] · {{item}}" — so a phone truncation only trims the item name,
// never the event. Placeholders are {{name}}; the dispatcher fills them per emit.
type NotifDef struct {
	Key      string
	Tier     NotifTier
	Badge    bool                         // counts toward the unread badge (Phase 2 read-model reads this)
	WhatsApp bool                         // escalate off-app via the transactional service (Critical set)
	Type     string                       // domain Notification.Type
	Title    string                       // notice-first title template
	Body     string                       // supporting body template
	Route    string                       // action_url template
	TxEvent  domain.NotificationEventType // transactional template key ("" = no off-app template yet)
}

// notifRegistry is the single source of truth for every notification the platform
// sends. 42 entries: 17 buyer + 25 seller. Multi-stakeholder events (delivered,
// cancelled) have one entry per side so copy + route stay contextual.
//
// 35/42 have a live producer. The 7 below are catalogued but NOT yet emitted —
// each needs infrastructure that doesn't exist today (documented so the gap is
// explicit, not accidental):
//   - buyer.item.refunded          → no refund flow exists (no producer to hook)
//   - buyer.item.delayed           → needs an overdue-delivery sweep (no such cron)
//   - buyer.account.new_login      → needs device/session fingerprinting on login
//   - seller.sale.cancelled        → CancelOrder is seller-initiated (fires
//     buyer.item.cancelled); no buyer/system cancel
//   - seller.growth.milestone      → needs a stored per-business sales COUNT +
//     threshold-crossing detection (only money-value
//     lifetime_sales is stored today, not a count)
//   - seller.onboarding.add_bank   → delayed nudge; firing at store-create would
//   - seller.onboarding.complete_store  collide with onboarding.store_created (needs
//     a scheduled "still incomplete after 24h" job)
var notifRegistry = map[string]NotifDef{

	// ── Buyer · Checkout (order-level) ───────────────────────────────
	// order.placed and payment.confirmed are DISTINCT events, kept separate by
	// decision: they co-fire in Verify today, but "we got your order" and "your
	// money went through" are different facts, and staying separate is robust to
	// future flow changes (wallet balance, pay-on-delivery, order-first).
	"buyer.order.placed": {Key: "buyer.order.placed", Tier: TierStandard, Badge: true, WhatsApp: false, Type: notifTypeOrder,
		Title: "Order placed · {{count}} items", Body: "We've received your order and are confirming your payment.", Route: "/orders", TxEvent: domain.EventOrderPlaced},
	"buyer.payment.confirmed": {Key: "buyer.payment.confirmed", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeOrder,
		Title: "Payment confirmed · {{total}}", Body: "Your payment went through. We'll update you as each item ships.", Route: "/orders", TxEvent: domain.EventPaymentReceived},

	// ── Buyer · Fulfillment (per order_item) ─────────────────────────
	"buyer.item.preparing": {Key: "buyer.item.preparing", Tier: TierAmbient, Badge: false, WhatsApp: false, Type: notifTypeOrder,
		Title: "Preparing · {{item}}", Body: "{{store}} is getting your item ready to ship.", Route: "/orders/{{itemId}}"},
	"buyer.item.shipped": {Key: "buyer.item.shipped", Tier: TierStandard, Badge: true, WhatsApp: false, Type: notifTypeOrder,
		Title: "Out for delivery · {{item}}", Body: "It's on its way to your delivery address. Tap to track.", Route: "/orders/{{itemId}}"},
	"buyer.item.in_transit": {Key: "buyer.item.in_transit", Tier: TierAmbient, Badge: false, WhatsApp: false, Type: notifTypeOrder,
		Title: "In transit · {{item}}", Body: "On the move toward your delivery address.", Route: "/orders/{{itemId}}"},
	"buyer.item.delivered": {Key: "buyer.item.delivered", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeOrder,
		Title: "Delivered · {{item}}", Body: "Marked delivered just now. Didn't receive it? Tap to report.", Route: "/orders/{{itemId}}", TxEvent: domain.EventOrderDelivered},
	"buyer.item.review_request": {Key: "buyer.item.review_request", Tier: TierStandard, Badge: false, WhatsApp: false, Type: notifTypeOrder,
		Title: "Leave a review · {{item}}", Body: "How was it? A quick review helps other buyers.", Route: "/orders/{{itemId}}"},
	"buyer.item.delayed": {Key: "buyer.item.delayed", Tier: TierStandard, Badge: true, WhatsApp: false, Type: notifTypeOrder,
		Title: "Delivery delayed · {{item}}", Body: "It's running late. Tap for the latest update.", Route: "/orders/{{itemId}}"},
	"buyer.item.cancelled": {Key: "buyer.item.cancelled", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeOrder,
		Title: "Order cancelled · {{item}}", Body: "You'll be refunded to your original payment method.", Route: "/orders/{{itemId}}", TxEvent: domain.EventOrderCancelled},
	"buyer.item.refunded": {Key: "buyer.item.refunded", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeOrder,
		Title: "Refund issued · {{item}}", Body: "{{amount}} sent back to the card you paid with — allow 3–5 days.", Route: "/orders/{{itemId}}", TxEvent: domain.EventRefundProcessed},

	// ── Buyer · Wishlist & discovery (per product) ───────────────────
	"buyer.wishlist.price_drop": {Key: "buyer.wishlist.price_drop", Tier: TierStandard, Badge: false, WhatsApp: false, Type: notifTypePromo,
		Title: "Price drop · {{item}}", Body: "A wishlist item you saved is now {{price}}.", Route: "/shop/{{vendor}}/products/{{productId}}"},
	"buyer.wishlist.back_in_stock": {Key: "buyer.wishlist.back_in_stock", Tier: TierStandard, Badge: false, WhatsApp: false, Type: notifTypePromo,
		Title: "Back in stock · {{item}}", Body: "The item you saved is available again.", Route: "/shop/{{vendor}}/products/{{productId}}"},
	"buyer.wishlist.low_stock": {Key: "buyer.wishlist.low_stock", Tier: TierAmbient, Badge: false, WhatsApp: false, Type: notifTypePromo,
		Title: "Almost gone · {{item}}", Body: "Only {{qty}} left of a wishlist item.", Route: "/shop/{{vendor}}/products/{{productId}}"},
	"buyer.store.new_arrivals": {Key: "buyer.store.new_arrivals", Tier: TierAmbient, Badge: false, WhatsApp: false, Type: notifTypePromo,
		Title: "New arrival · {{store}}", Body: "{{store}} just added {{item}}.", Route: "/shop/{{store}}"},

	// ── Buyer · Messages & account ───────────────────────────────────
	"buyer.chat.message": {Key: "buyer.chat.message", Tier: TierStandard, Badge: true, WhatsApp: false, Type: notifTypeOrder,
		Title: "New message · {{from}}", Body: "You have a new reply. Tap to read.", Route: "/chat/{{chatId}}"},
	"buyer.account.welcome": {Key: "buyer.account.welcome", Tier: TierAmbient, Badge: false, WhatsApp: false, Type: notifTypeSystem,
		Title: "Welcome to myInstaShop", Body: "Start discovering stores and creators you'll love.", Route: "/shop", TxEvent: domain.EventWelcome},
	"buyer.account.new_login": {Key: "buyer.account.new_login", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeSystem,
		Title: "New login · new device", Body: "Signed in from {{location}} just now. Wasn't you? Secure your account.", Route: "/profile/security", TxEvent: domain.EventSellerLoginAlert},

	// ── Seller · Sales (per order_item) ──────────────────────────────
	// new_order and payment.confirmed kept separate (mirror of the buyer pair).
	"seller.sale.new_order": {Key: "seller.sale.new_order", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeOrder,
		Title: "New order · {{item}} ×{{qty}}", Body: "You have a new order ({{amount}}) — get it ready to ship.", Route: "/dashboard/orders/{{itemId}}", TxEvent: domain.EventNewOrderSeller},
	"seller.payment.confirmed": {Key: "seller.payment.confirmed", Tier: TierAmbient, Badge: false, WhatsApp: false, Type: notifTypeOrder,
		Title: "Payment confirmed · {{item}}", Body: "Payment for this order is confirmed and held safely in escrow.", Route: "/dashboard/orders/{{itemId}}"},
	"seller.sale.delivered": {Key: "seller.sale.delivered", Tier: TierStandard, Badge: true, WhatsApp: false, Type: notifTypeOrder,
		Title: "Delivered · {{item}}", Body: "Delivery confirmed. Funds clear in 24 hours.", Route: "/dashboard/orders/{{itemId}}"},
	"seller.sale.cancelled": {Key: "seller.sale.cancelled", Tier: TierStandard, Badge: true, WhatsApp: false, Type: notifTypeOrder,
		Title: "Order cancelled · {{item}}", Body: "The buyer cancelled this order.", Route: "/dashboard/orders/{{itemId}}"},

	// ── Seller · Money & payouts ─────────────────────────────────────
	"seller.payout.funds_cleared": {Key: "seller.payout.funds_cleared", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeSystem,
		Title: "Funds cleared · {{amount}}", Body: "From your {{item}} sale — now in your available balance.", Route: "/dashboard/wallet", TxEvent: domain.EventPayoutReady},
	"seller.payout.withdrawal_processing": {Key: "seller.payout.withdrawal_processing", Tier: TierAmbient, Badge: false, WhatsApp: false, Type: notifTypeSystem,
		Title: "Withdrawal processing · {{amount}}", Body: "On its way to your {{bank}}.", Route: "/dashboard/wallet"},
	"seller.payout.withdrawal_sent": {Key: "seller.payout.withdrawal_sent", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeSystem,
		Title: "Withdrawal approved · {{amount}}", Body: "Approved — on its way to your {{bank}}.", Route: "/dashboard/wallet"}, // fires at admin approve; TxEvent TBD
	"seller.payout.withdrawal_failed": {Key: "seller.payout.withdrawal_failed", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeSystem,
		Title: "Withdrawal failed · {{amount}}", Body: "It didn't go through. Tap to retry.", Route: "/dashboard/wallet"}, // TxEvent TBD
	"seller.payout.bank_changed": {Key: "seller.payout.bank_changed", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeSystem,
		Title: "Payout bank changed · {{bank}}", Body: "If this wasn't you, secure your account immediately.", Route: "/dashboard/payouts"}, // unmutable (Phase 2 prefs)
	"seller.payout.bank_added": {Key: "seller.payout.bank_added", Tier: TierAmbient, Badge: false, WhatsApp: false, Type: notifTypeSystem,
		Title: "Payout account added · {{bank}}", Body: "You can now withdraw to this account.", Route: "/dashboard/payouts"},
	"seller.payout.verify_required": {Key: "seller.payout.verify_required", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeSystem,
		Title: "Verify to withdraw", Body: "You've passed ₦100k in sales — verify your identity to withdraw.", Route: "/verify"},

	// ── Seller · Inventory (per product) ─────────────────────────────
	"seller.inventory.low_stock": {Key: "seller.inventory.low_stock", Tier: TierStandard, Badge: true, WhatsApp: false, Type: notifTypePromo,
		Title: "Low stock · {{item}}", Body: "Only {{qty}} left. Restock soon to keep it selling.", Route: "/dashboard/catalog/{{productId}}"},
	"seller.inventory.sold_out": {Key: "seller.inventory.sold_out", Tier: TierStandard, Badge: true, WhatsApp: false, Type: notifTypePromo,
		Title: "Sold out · {{item}}", Body: "Restock to put it back on your storefront.", Route: "/dashboard/catalog/{{productId}}"},

	// ── Seller · Trust & verification (KYC1 producers) ───────────────
	"seller.kyc.submitted": {Key: "seller.kyc.submitted", Tier: TierAmbient, Badge: false, WhatsApp: false, Type: notifTypeSystem,
		Title: "Verification received", Body: "We'll review your documents within 24 hours.", Route: "/verify"},
	"seller.kyc.verified": {Key: "seller.kyc.verified", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeSystem,
		Title: "Your store is now verified", Body: "Your badge is live and withdrawals are unlocked.", Route: "/verify"}, // TxEvent TBD (KYC template)
	"seller.kyc.needs_attention": {Key: "seller.kyc.needs_attention", Tier: TierCritical, Badge: true, WhatsApp: true, Type: notifTypeSystem,
		Title: "Verification needs attention", Body: "We couldn't verify your identity: {{reason}}. Tap to resubmit.", Route: "/verify"}, // TxEvent TBD
	"seller.kyc.limit_approaching": {Key: "seller.kyc.limit_approaching", Tier: TierStandard, Badge: true, WhatsApp: false, Type: notifTypeSystem,
		Title: "Withdrawal limit approaching", Body: "You're {{amount}} from the ₦100k limit — verify now to avoid a hold.", Route: "/verify"},

	// ── Seller · Growth & engagement ─────────────────────────────────
	"seller.growth.new_review": {Key: "seller.growth.new_review", Tier: TierStandard, Badge: false, WhatsApp: false, Type: notifTypePromo,
		Title: "New review · {{item}}", Body: "Rated {{rating}} stars. Tap to read what they said.", Route: "/dashboard/reviews", TxEvent: domain.EventCustomerReview},
	"seller.growth.wishlist_save": {Key: "seller.growth.wishlist_save", Tier: TierAmbient, Badge: false, WhatsApp: false, Type: notifTypePromo,
		Title: "Wishlist save · {{item}}", Body: "A buyer just saved your product.", Route: "/dashboard/catalog/{{productId}}"},
	"seller.growth.new_followers": {Key: "seller.growth.new_followers", Tier: TierAmbient, Badge: false, WhatsApp: false, Type: notifTypePromo,
		Title: "New follower", Body: "Someone just followed your store.", Route: "/dashboard/storefront"},
	"seller.growth.milestone": {Key: "seller.growth.milestone", Tier: TierStandard, Badge: false, WhatsApp: false, Type: notifTypePromo,
		Title: "Milestone reached · {{count}} sales", Body: "A big one — congratulations.", Route: "/dashboard"},

	// ── Seller · Messages & onboarding ───────────────────────────────
	"seller.chat.message": {Key: "seller.chat.message", Tier: TierStandard, Badge: true, WhatsApp: false, Type: notifTypeOrder,
		Title: "New message · {{from}}", Body: "A customer messaged you. Tap to reply.", Route: "/dashboard/chat/{{chatId}}"},
	"seller.onboarding.store_created": {Key: "seller.onboarding.store_created", Tier: TierAmbient, Badge: false, WhatsApp: false, Type: notifTypeSystem,
		Title: "Your store is live", Body: "Add products to start selling.", Route: "/dashboard"},
	"seller.onboarding.add_bank": {Key: "seller.onboarding.add_bank", Tier: TierStandard, Badge: true, WhatsApp: false, Type: notifTypeSystem,
		Title: "Add a bank to get paid", Body: "You'll need a payout account before you can withdraw.", Route: "/dashboard/payouts/addaccount"},
	"seller.onboarding.complete_store": {Key: "seller.onboarding.complete_store", Tier: TierStandard, Badge: true, WhatsApp: false, Type: notifTypeSystem,
		Title: "Add your store address", Body: "So buyers can find and reach your store.", Route: "/dashboard/storefront/address"},
}

// LookupNotif returns the catalog definition for an event key.
func LookupNotif(key string) (NotifDef, bool) {
	def, ok := notifRegistry[key]
	return def, ok
}
