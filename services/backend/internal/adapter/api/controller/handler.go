package controller

import (
	"gorm.io/gorm"
	v2Controller "vibaar/backend/internal/adapter/api/controller/v2"
)

type HTTPHandler struct {
	UserHandler        *UserController
	Auth               *AuthController
	Otp                *OTPController
	Business           *BusinessController
	Product            *ProductController
	ProductV2          *v2Controller.ProductController
	Category           *CategoryController
	Order              *OrderController
	Transaction        *TransactionController
	Rating             *ProductRatingController
	Shipping           *ShippingController
	Bank               *BankController
	Log                *LogController
	Webhook            *WebhookController
	Wallet             *WalletController
	Admin              *AdminController
	AdminAuth          *AdminAuthController
	VerificationCode   *VerificationCodeController
	Collection         *CollectionController
	KYC                *KYCController
	Chat               *ChatController
	Notification       *NotificationController
	Mock               *MockController
	WhatsAppWebhook    *WhatsAppWebhookController
	Referral           *ReferralController
	AdminReferral      *AdminReferralController
}

func NewHTTPHandler(db *gorm.DB) *HTTPHandler {
	return &HTTPHandler{
		UserHandler:        NewUserController(db),
		Auth:               NewAuthController(db),
		Otp:                NewOTPController(db),
		Business:           NewBusinessController(db),
		Product:            NewProductController(db),
		ProductV2:          v2Controller.NewProductController(db),
		Category:           NewCategoryController(db),
		Order:              NewOrderController(db),
		Transaction:        NewTransactionController(db),
		Rating:             NewProductRatingController(db),
		Shipping:           NewShippingController(db),
		Bank:               NewBankController(),
		Log:                NewLogController(),
		Webhook:            NewWebhookController(db),
		Wallet:             NewWalletController(db),
		Admin:              NewAdminController(db),
		AdminAuth:          NewAdminAuthController(db),
		VerificationCode:   NewVerificationCodeController(db),
		Collection:         NewCollectionController(db),
		KYC:                NewKYCController(db),
		Chat:               NewChatController(db),
		Notification:       NewNotificationController(db),
		Mock:               NewMockController(),
		WhatsAppWebhook:    NewWhatsAppWebhookController(db),
		Referral:           NewReferralController(db),
		AdminReferral:      NewAdminReferralController(db),
	}
}
