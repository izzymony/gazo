package controller

import (
	"net/http"
	"net/url"

	"insta-api/internal/adapter/api/requests"
	"insta-api/internal/adapter/api/response"
	"insta-api/internal/core/services"
	"insta-api/internal/logger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuthController struct {
	service *services.AuthService
}

func NewAuthController(db *gorm.DB) *AuthController {
	return &AuthController{
		service: services.NewAuthService(db),
	}
}

func (a *AuthController) Register(c *gin.Context) {
	logger.Info("storeUser")

	request := requests.SignUpRequest{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	resp, err := a.service.Register(request)
	if err != nil {
		logger.Error("Error saving user " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (a *AuthController) ForgetPassword(c *gin.Context) {
	logger.Info("forgotPassword")

	request := requests.ForgotPassword{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	resp, err := a.service.ForgotPassword(request)
	if err != nil {
		logger.Error("Error changing password " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}
func (a *AuthController) ChangePassword(c *gin.Context) {
	logger.Info("forgotPassword")

	request := requests.ChangePassword{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	resp, err := a.service.ChangePassword(request)
	if err != nil {
		logger.Error("Error changing password " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (a *AuthController) Login(c *gin.Context) {
	logger.Info("storeUser")

	request := requests.LoginRequest{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	resp, err := a.service.Login(request)
	if err != nil {
		logger.Error("Error saving user " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (a *AuthController) CheckEmailOrPhoneExists(c *gin.Context) {
	logger.Info("storeUser")
	type req struct {
		Identifier string `json:"identifier"`
	}
	request := req{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	resp, err := a.service.CheckEmailOrPhoneExists(request.Identifier)
	if err != nil {
		logger.Error("Error " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (a *AuthController) RefreshToken(c *gin.Context) {
	type RefreshRequest struct {
		RefreshToken string `json:"refresh_token"`
	}

	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	resp, err := a.service.RefreshTokens(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, nil))
}

func (a *AuthController) InitiateSocialAuth(c *gin.Context) {
	logger.Info("InitialiseSocialAuth")

	provider := c.Param("provider")
	redirectUrl := c.Query("redirect_url")

	url, err := a.service.InitiateSocialAuth(provider, redirectUrl)
	if err != nil {
		logger.Error("Error authenticating user " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
		"data":    gin.H{"url": url},
	})
}

func (a *AuthController) SocialAuthCallback(c *gin.Context) {
	logger.Info("SocialAuthCallback")

	var requestBody struct {
		Code        string `json:"code"`
		RedirectURL string `json:"redirect_url"`
		Provider    string `json:"provider"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if requestBody.Code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing required field (code)"})
		return
	}
	rawCode := requestBody.Code
	var err error
	if requestBody.Provider != "tiktok" {
		rawCode, err = url.QueryUnescape(requestBody.Code)
		if err != nil {
			logger.Error("Failed to unescape code: " + err.Error())
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid authorization code"})
			return
		}
	}

	token, err := a.service.SocialAuthCallBack(rawCode, requestBody.Provider, requestBody.RedirectURL)
	if err != nil {
		logger.Error(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
		"data":    gin.H{"token": token},
	})
}

func (a *AuthController) UpdateRecommendations(c *gin.Context) {
	logger.Info("GetUser")

	request := struct {
		Recommendations []string `json:"recommendations" binding:"required"`
	}{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	params := c.Param("id")

	resp, err := a.service.UpdateRecommendations(params, request.Recommendations)
	if err != nil {
		logger.Error("Error saving user " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}
