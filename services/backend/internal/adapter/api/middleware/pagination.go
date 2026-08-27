package middleware

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// maxPageLimit is the hard ceiling on any "limit" query param; safeDefaultLimit
// is what a present-but-invalid limit is normalised to.
const (
	maxPageLimit     = 100
	safeDefaultLimit = "20"
)

// PaginationGuard normalises the "limit" and "page" query params so a client
// can't request an excessive (or degenerate) amount of data in one call:
//   - limit > 100                     → clamped to 100
//   - limit invalid / zero / negative → normalised to a safe default (20)
//   - page  invalid / zero / negative → normalised to 1
//
// The non-positive/invalid limit case matters: handlers parse with a discarded
// error (`limit, _ := strconv.Atoi(...)`), so "abc" and "0" reach the repo as 0
// (→ LIMIT 0, zero rows) and "-1" reaches it as -1 (→ GORM .Limit(-1) = NO limit,
// i.e. every row — an unbounded pull). A fixed positive default is applied rather
// than deleting the param, because several handlers read limit raw with no
// DefaultQuery fallback (e.g. GetBankAccounts) and a missing limit gives them 0.
// A valid in-range limit (1..100) is left untouched.
//
// IMPORTANT: it reads and rewrites the URL query DIRECTLY via c.Request.URL.Query()
// and must NOT call c.Query()/c.GetQuery() here. Those populate Gin's per-request
// query cache from the ORIGINAL query string; a later RawQuery rewrite is then ignored
// by handlers, which read the stale cache — the exact bug an earlier version had (the
// clamp was a silent no-op, verified: limit=500 reached the handler unchanged). By
// avoiding the cache, the handler's first c.Query() re-parses the rewritten RawQuery
// and sees the normalised value.
func PaginationGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := c.Request.URL.Query()
		changed := false

		if limitStr := q.Get("limit"); limitStr != "" {
			limit, err := strconv.Atoi(limitStr)
			switch {
			case err != nil || limit < 1:
				q.Set("limit", safeDefaultLimit)
				changed = true
			case limit > maxPageLimit:
				q.Set("limit", strconv.Itoa(maxPageLimit))
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
