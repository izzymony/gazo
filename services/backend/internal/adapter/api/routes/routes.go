package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/middleware"
	v2Route "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/routes/v2"
)

func RegisterRoutes(router *gin.Engine, handler *controller.HTTPHandler) {
	router.Use(middleware.CORS())
	router.Use(middleware.LoggingMiddleWare())
	router.Use(middleware.PaginationGuard())

	v1 := router.Group("/api/v1")

	v1.GET("/healthcheck", handler.HealthCheck)

	AuthRoutes(v1, handler.Auth, handler.Otp)
	UserRoutes(v1, handler.UserHandler, handler.Auth)
	OtpRoutes(v1, handler.Otp)
	BusinessRoutes(v1, handler.Business)
	CategoryRoutes(v1, handler.Category)
	OrderRoutes(v1, handler.Order)
	ProductRoutes(v1, handler.Product, handler.Rating)
	ShippingRoutes(v1, handler.Shipping)
	TransactionRoutes(v1, handler.Transaction)
	LogRoutes(v1, handler.Log)
	BankRoutes(v1, handler.Bank)
	WebhookRoutes(v1, handler.Webhook)
	WhatsAppWebhookRoutes(v1, handler.WhatsAppWebhook)
	WalletRoutes(v1, handler.Wallet)
	AdminRoutes(v1, handler.Admin)
	AdminAuthRoutes(v1, handler.AdminAuth)
	VerificationCodeRoutes(v1, handler.VerificationCode)
	CollectionRoutes(v1, handler.Collection)
	KYCRoutes(v1, handler.KYC)
	ChatRoutes(v1, handler.Chat)
	NotificationRoutes(v1, handler.Notification)
	ReferralRoutes(v1, handler.Referral)
	// VariantCombinationRoutes removed - combinations now calculated on-demand

	// Admin referral routes (under /admin/referral)
	admin := v1.Group("/admin")
	AdminReferralRoutes(admin, handler.AdminReferral)

	// Mock routes for local development
	MockRoutes(router, handler.Mock)

	v2 := router.Group("/api/v2")
	v2Route.ProductRoutes(v2, handler.ProductV2)
	router.NoRoute(func(c *gin.Context) { c.String(404, "Not found") })

}
