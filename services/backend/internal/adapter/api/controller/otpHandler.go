package controller

import (
	"insta-api/internal/adapter/api/response"
	"insta-api/internal/core/domain"
	"insta-api/internal/core/services"
	"insta-api/internal/logger"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type OTPController struct {
	service *services.OTPService
}

func NewOTPController(db *gorm.DB) *OTPController {
	return &OTPController{
		service: services.NewOTPService(db),
	}
}

func (s *OTPController) ValideOTP(c *gin.Context) {
	logger.Info("ValidateOTP")

	resp, err := s.service.ValideOTP(c.Query("identifier"), c.Query("code"))
	if err != nil {
		logger.Error("Error saving sprint " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *OTPController) SendOTP(c *gin.Context) {
	logger.Info("ValidateOTP")

	request := domain.OTP{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	resp, err := s.service.Save(request)
	if err != nil {
		logger.Error("Error saving sprint " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}
