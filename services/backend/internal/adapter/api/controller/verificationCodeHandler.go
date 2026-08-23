package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"vibaar/backend/internal/adapter/api/response"
	"vibaar/backend/internal/core/services"
	"vibaar/backend/internal/helper"
	"vibaar/backend/internal/logger"
)

type VerificationCodeController struct {
	service *services.VerificationCodeService
}

func NewVerificationCodeController(db *gorm.DB) *VerificationCodeController {
	return &VerificationCodeController{
		service: services.NewVerificationCodeService(db),
	}
}

func (s *VerificationCodeController) SendWithdrawalRequestOTP(c *gin.Context) {
	logger.Info("SendWithdrawalRequestOTP")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = s.service.SendWithdrawalRequestOTP(userIdentifier)
	if err != nil {
		logger.Error("Error sending withdrawal request otp" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(nil, err))
}

func (s *VerificationCodeController) SendRegisterOTP(c *gin.Context) {
	logger.Info("SendRegisterOTP")
	request := struct {
		Identifier string `json:"identifier"`
	}{}

	if err := c.ShouldBind(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if request.Identifier == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "either phone_number or email is required"})
		return
	}

	if err := s.service.SendRegisterOTP(request.Identifier); err != nil {
		logger.Error("Error sending register OTP: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(nil, nil))
}

func (s *VerificationCodeController) ValidateCode(c *gin.Context) {
	logger.Info("ValidateCode")
	request := struct {
		Identifier       string `json:"identifier"`
		OTP              string `json:"otp"`
		VerificationType string `json:"verification_type"`
	}{}

	if err := c.ShouldBind(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := s.service.ValidateCode(request.Identifier, request.OTP, request.VerificationType); err != nil {
		logger.Error("Error sending register OTP: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse("otp is valid", nil))
}
