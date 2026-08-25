package middleware

import (
	"strings"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"

	"github.com/gin-gonic/gin"
)

func LoggingMiddleWare() gin.HandlerFunc {

	return func(c *gin.Context) {
		log := logger.NewLogrusLogger()

		start := time.Now()
		fields := logger.Fields{
			"name":       "user-service",
			"status":     c.Writer.Status(),
			"path":       c.Request.URL.Path,
			"method":     c.Request.Method,
			"ip":         c.ClientIP(),
			"latency":    time.Since(start).Milliseconds(),
			"user-agent": c.Request.UserAgent(),
		}
		header := c.Request.Header
		if val, ok := header["Authorization"]; ok {
			// Fix: Safely parse authorization header to prevent index out of range
			parts := strings.Split(val[0], " ")
			if len(parts) == 2 {
				token := parts[1]
				claims, err := helper.ValidateJWT(token)
				if err != "" {
					return
				}

				fields["username"] = claims.Username
				fields["email"] = claims.Email
				fields["user_id"] = claims.UserId
			}
		}

		c.Next()
		log.WithFields(fields).Infof("request handled")
	}
}
