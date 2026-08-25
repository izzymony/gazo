package validators

import (
	"github.com/gin-gonic/gin"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
)

type AuthValidator struct{}

func NewAuthValidator() AuthValidator {
	return AuthValidator{}
}

var InitiateSocialAuthFieldToErrorMessage = map[string]map[string]string{
	"provider": {
		"required": "provider is required",
	},
	"redirect_url": {
		"required": "redirect_url is required",
	},
}

func (v *AuthValidator) ValidateInitiateSocialAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		var payload requests.InitiateSocialAuth
		inputErr, err := ValidateInput(&payload, c, InitiateSocialAuthFieldToErrorMessage)
		if err != nil {
			c.Abort()
			helper.Dispatch500Error(c, helper.InternalErrorMsg)
			return
		}
		if inputErr != nil {
			c.Abort()
			helper.Dispatch400Error(c, inputErr, nil)
			return
		}
		c.Next()
	}
}
