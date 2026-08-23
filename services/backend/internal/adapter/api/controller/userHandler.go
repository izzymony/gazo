package controller

import (
	"math"
	"net/http"
	"strconv"

	"vibaar/backend/internal/adapter/api/requests"
	"vibaar/backend/internal/adapter/api/response"
	"vibaar/backend/internal/core/services"
	"vibaar/backend/internal/helper"
	"vibaar/backend/internal/logger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserController struct {
	service *services.UserService
}

func NewUserController(db *gorm.DB) *UserController {
	return &UserController{
		service: services.NewUserService(db),
	}
}

func (s *UserController) GetAllUsers(c *gin.Context) {
	logger.Info("GetAllUser")

	params := FlatUrlQuery(c.Request.URL.Query())

	resp, err := s.service.GetAll(params)
	if err != nil {
		logger.Error("Error saving sprint" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomArrayResponse(resp, err))
}

func (s *UserController) GetUserProfile(c *gin.Context) {
	logger.Info("GetUserProfile")
	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := s.service.GetUserProfile(userIdentifier, isGuest)
	if err != nil {
		logger.Error("Error " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

// GetMe returns the authenticated user + their business (or business: null for
// buyers with no store) in one call, so the web app can bootstrap auth
// deterministically without a separate /business fetch + retry loop.
func (s *UserController) GetMe(c *gin.Context) {
	logger.Info("GetMe")
	userId, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, business, err := s.service.GetMe(userId)
	if err != nil {
		logger.Error("GetMe error: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(gin.H{
		"user":     user,
		"business": business,
	}, nil))
}

func (s *UserController) UpdateUser(c *gin.Context) {
	logger.Info("GetUser")

	request := requests.UpdateUserRequest{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.Update(request, userIdentifier, isGuest)
	if err != nil {
		logger.Error("Error saving sprint" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *UserController) FindUser(c *gin.Context) {
	logger.Info("GetUser")

	id := c.Param("id")

	resp, err := s.service.Find(id)
	if err != nil {
		logger.Error("Error saving sprint" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *UserController) FollowBusiness(c *gin.Context) {
	logger.Info("FollowBusiness")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	businessId := c.Param("business-id")

	err = s.service.FollowBusiness(userIdentifier, businessId, isGuest)
	if err != nil {
		logger.Error("error fetching order" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(nil, err))
}

func (s *UserController) UnFollowBusiness(c *gin.Context) {
	logger.Info("UnFollowBusiness")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	businessId := c.Param("business-id")

	err = s.service.UnFollowBusiness(userIdentifier, businessId, isGuest)
	if err != nil {
		logger.Error("error fetching order" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(nil, err))
}

func (s *UserController) GetFollowing(c *gin.Context) {
	logger.Info("GetFollowing")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	search := c.DefaultQuery("search", "")

	resp, total, err := s.service.GetFollowing(userIdentifier, search, page, limit, isGuest)
	if err != nil {
		logger.Error("Error fetching followers " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       response.NewCustomArrayResponse(resp, err),
		"page":       page,
		"limit":      limit,
		"total":      total,
		"totalPages": int(math.Ceil(float64(total) / float64(limit))),
	})
}
