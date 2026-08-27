package middleware

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// PaginationGuard clamps the "limit" query parameter to a maximum of 100 and
// normalises a non-positive / invalid "page" to 1, so a client can't request an
// excessive amount of data in one call.
//
// IMPORTANT: it reads and rewrites the URL query DIRECTLY via c.Request.URL.Query()
// and must NOT call c.Query()/c.GetQuery() here. Those populate Gin's per-request
// query cache from the ORIGINAL query string; a later RawQuery rewrite is then ignored
// by handlers, which read the stale cache — the exact bug this replaces (the clamp was
// a silent no-op, verified: limit=500 reached the handler unchanged). By avoiding the
// cache, the handler's first c.Query() re-parses the rewritten RawQuery and sees the
// clamped value.
func PaginationGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := c.Request.URL.Query()
		changed := false

		if limitStr := q.Get("limit"); limitStr != "" {
			if limit, err := strconv.Atoi(limitStr); err == nil && limit > 100 {
				q.Set("limit", "100")
				changed = true
			}
		}

		if pageStr := q.Get("page"); pageStr != "" {
			if page, err := strconv.Atoi(pageStr); err != nil || page < 1 {
				q.Set("page", "1")
				changed = true
			}
		}

		if changed {
			c.Request.URL.RawQuery = q.Encode()
		}

		c.Next()
	}
}
