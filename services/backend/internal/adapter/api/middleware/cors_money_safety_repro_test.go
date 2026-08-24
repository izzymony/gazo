//go:build money_safety_repro

package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func exerciseCORS(origin string) string {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORS())
	router.GET("/healthcheck", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/healthcheck", nil)
	req.Header.Set("Origin", origin)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	return rec.Header().Get("Access-Control-Allow-Origin")
}

func TestMoneySafety_CORSProductionDefaultsMustNotTrustOldInstashopOrigins(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "")

	if got := exerciseCORS("https://instashop-web.vercel.app"); got == "https://instashop-web.vercel.app" {
		t.Fatalf("production CORS defaults still allow the old Instashop web origin")
	}
}

func TestMoneySafety_CORSUnknownOriginMustNotFallbackToOldInstashop(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "")

	if got := exerciseCORS("https://attacker.example"); got == "https://instashop-web.vercel.app" {
		t.Fatalf("production CORS falls back to the old Instashop origin for untrusted origins")
	}
}
