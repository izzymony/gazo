package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/response"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
)

type KYCController struct {
	service *services.KYCService
}

func NewKYCController(db *gorm.DB) *KYCController {
	return &KYCController{
		service: services.NewKYCService(db),
	}
}

func (ctrl *KYCController) SubmitKYC(c *gin.Context) {
	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var req requests.SubmitKYCRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid form data"})
		return
	}

	docFile, err := req.DocumentFile.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read document"})
		return
	}
	defer docFile.Close()

	selfieFile, err := req.SelfieFile.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read selfie"})
		return
	}
	defer selfieFile.Close()

	kyc, err := ctrl.service.SubmitKYC(userIdentifier, isGuest, docFile, selfieFile, req.DocumentType, req.LegalName, req.BVN)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(kyc, nil))
}

func (ctrl *KYCController) GetKYCStatus(c *gin.Context) {
	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	kyc, err := ctrl.service.GetKYCStatus(userIdentifier, isGuest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if kyc == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no KYC record found"})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(kyc, nil))
}
