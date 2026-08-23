package validators

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"vibaar/backend/internal/adapter/api/requests"
	"vibaar/backend/internal/helper"
)

var validate = validator.New()

func ValidateCreateProduct() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req requests.Product

		if err := c.ShouldBindJSON(&req); err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
			return
		}

		if err := validate.Struct(req); err != nil {
			errors := helper.FormatValidationError(err)
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"errors": errors})
			return
		}

		c.Set("validatedProduct", req)
		c.Next()
	}
}
