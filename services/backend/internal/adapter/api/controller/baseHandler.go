package controller

import (
	"vibaar/backend/internal/logger"

	"github.com/gin-gonic/gin"
)

type HealthCheckResponse struct {
	Status string
}

func (s *HTTPHandler) HealthCheck(c *gin.Context) {
	logger.Info("HealthCheck called")
	c.JSON(200, HealthCheckResponse{Status: "OK"})
}

func FlatUrlQuery(query map[string][]string) map[string]interface{} {
	mp := make(map[string]interface{})
	for key, val := range query {
		if len(val) == 1 {
			mp[key] = val[0]
		} else {
			mp[key] = val
		}
	}
	return mp
}
