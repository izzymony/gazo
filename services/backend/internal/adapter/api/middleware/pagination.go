package middleware

import (
	"net/url"
	"strconv"

	"github.com/gin-gonic/gin"
)

// PaginationGuard clamps the "limit" query parameter to a maximum of 100
// to prevent clients from requesting excessive amounts of data.
func PaginationGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		limitStr := c.Query("limit")
		if limitStr != "" {
			limit, err := strconv.Atoi(limitStr)
			if err == nil && limit > 100 {
				q := c.Request.URL.Query()
				q.Set("limit", "100")
				c.Request.URL.RawQuery = q.Encode()
			}
		}

		pageStr := c.Query("page")
		if pageStr != "" {
			page, err := strconv.Atoi(pageStr)
			if err != nil || page < 1 {
				q, _ := url.ParseQuery(c.Request.URL.RawQuery)
				q.Set("page", "1")
				c.Request.URL.RawQuery = q.Encode()
			}
		}

		c.Next()
	}
}
