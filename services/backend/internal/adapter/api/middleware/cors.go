package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Check environment first for development mode
		env := os.Getenv("APP_ENV")
		envAlt := os.Getenv("ENV") // Check alternative ENV variable
		if env == "development" || env == "dev" || env == "local" || envAlt == "local" || envAlt == "development" || envAlt == "dev" {
			// In development, allow all origins
			if origin != "" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			}
		} else {
			// Production mode - check allowed origins
			allowedOriginsEnv := os.Getenv("ALLOWED_ORIGINS")
			var allowedOrigins map[string]bool

			if allowedOriginsEnv != "" {
				origins := strings.Split(allowedOriginsEnv, ",")
				allowedOrigins = make(map[string]bool)
				for _, o := range origins {
					allowedOrigins[strings.TrimSpace(o)] = true
				}
			} else {
				// Default allowed origins for production
				allowedOrigins = map[string]bool{
					"http://localhost:3000":                              true,
					"http://localhost:3001":                              true,
					"http://127.0.0.1:3000":                              true,
					"http://127.0.0.1:3001":                              true,
					"https://instashop-web.vercel.app":                   true,
					"https://instashop-web-git-main-instashop.vercel.app": true,
					"https://vibaar.com":                             true,
					"https://www.vibaar.com":                         true,
				}
			}

			// Check if origin is allowed
			if allowedOrigins[origin] {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			} else if origin == "" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			} else {
				// In production, be restrictive - only allow known origins
				c.Writer.Header().Set("Access-Control-Allow-Origin", "https://instashop-web.vercel.app")
			}
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, guest-id")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400") // 24 hours

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
