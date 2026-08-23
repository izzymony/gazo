package middleware

import (
	"net/http"
	"regexp"
	"strings"
	"time"

	"insta-api/internal/helper"

	"github.com/gin-gonic/gin"
)

// Valid guest ID: UUID format or alphanumeric string (8-64 chars)
var validGuestID = regexp.MustCompile(`^[a-zA-Z0-9\-]{8,64}$`)

func AdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is missing"})
			c.Abort()
			return
		}

		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
			c.Abort()
			return
		}

		claims, errMsg := helper.ValidateJWT(tokenParts[1])
		if errMsg != "" || claims.UserId == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims", "message": errMsg})
			c.Abort()
			return
		}

		if claims.ExpiresAt < time.Now().Local().Unix() {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token expired", "message": "Token expired"})
			c.Abort()
			return
		}

		if !claims.IsAdmin {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized", "message": "Unauthorized"})
			c.Abort()
			return
		}

		c.Set("username", claims.Username)
		c.Set("email", claims.Email)
		c.Set("user_id", claims.UserId)

		c.Next()
	}
}

// authenticateJWT validates the Bearer token and attaches the user context.
// On failure it writes the error response, aborts, and returns false.
func authenticateJWT(c *gin.Context) bool {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is missing"})
		c.Abort()
		return false
	}

	// Check if the Authorization header has the format "Bearer <token>"
	tokenParts := strings.Split(authHeader, " ")
	if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
		c.Abort()
		return false
	}

	// Extract claims from the token and attach them to the request context
	claims, errMsg := helper.ValidateJWT(tokenParts[1])
	if errMsg != "" || claims.UserId == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims", "message": errMsg})
		c.Abort()
		return false
	}

	if claims.ExpiresAt < time.Now().Local().Unix() {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token expired", "message": "Token expired"})
		c.Abort()
		return false
	}

	c.Set("username", claims.Username)
	c.Set("email", claims.Email)
	c.Set("user_id", claims.UserId)
	c.Set("userId", claims.UserId)
	return true
}

// AuthMiddleware requires a valid JWT. A guest-id header is deliberately NOT
// accepted here: accepting a client-invented guest-id would let anyone bypass
// authentication (E0.4). Guest access is opt-in via AuthOrGuestMiddleware on the
// specific checkout endpoints a logged-out buyer legitimately needs.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if authenticateJWT(c) {
			c.Next()
		}
	}
}

// AuthOrGuestMiddleware accepts EITHER a valid guest-id header (guest checkout)
// OR a valid JWT. Use ONLY on the order / transaction / shipping endpoints that
// a logged-out buyer hits during checkout and order tracking (E0.4).
func AuthOrGuestMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		guestId := c.GetHeader("guest-id")
		if guestId != "" {
			if !validGuestID.MatchString(guestId) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guest ID format"})
				c.Abort()
				return
			}
			c.Set("guest_id", guestId)
			c.Next()
			return
		}
		if authenticateJWT(c) {
			c.Next()
		}
	}
}
