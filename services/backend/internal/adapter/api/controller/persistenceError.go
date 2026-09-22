package controller

import (
	"github.com/gin-gonic/gin"

	"github.com/Tinovalabs/vibaar/services/backend/internal/dberr"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
)

// respondError writes an error response, choosing the status and message by
// whether the failure came from persistence or from the domain.
//
// Two different things arrive at a handler's error branch and they need
// different treatment:
//
//   - A PERSISTENCE failure. Its class decides the status — a unique conflict
//     is 409, not the 400 every site currently returns — and its message is the
//     stable public one. The driver's text is already unreachable by the time
//     it gets here (see internal/dberr), so this is about the status and about
//     logging the class rather than the error.
//   - A DOMAIN error: "invalid user", "insufficient balance", a validation
//     message. That belongs in the response verbatim, with the status the
//     handler chose. This function does not touch it, which is the whole
//     reason it takes a fallback status rather than imposing one.
//
// `op` is a short label for the log, e.g. "add_shipping_profile". `recordID` is
// an internal id or "" — safe to log, unlike the submitted values.
func respondError(c *gin.Context, fallbackStatus int, op, recordID string, err error) {
	if status, message, isPersistence := dberr.HTTPStatus(err); isPersistence {
		// Operation, record id and classification. Never the error: even though
		// it is safe now, logging `err` here is the habit that reintroduces the
		// leak the moment something upstream stops sanitizing.
		logger.Error(logLine(op, recordID, dberr.Detail(err)))
		c.JSON(status, gin.H{"error": message})
		return
	}

	logger.Error(logLine(op, recordID, err.Error()))
	c.JSON(fallbackStatus, gin.H{"error": err.Error()})
}

func logLine(op, recordID, detail string) string {
	line := op + " failed"
	if recordID != "" {
		line += " id=" + recordID
	}
	if detail != "" {
		line += ": " + detail
	}
	return line
}
