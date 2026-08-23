package helper

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Dispatch500Error 500 - internal server error
func Dispatch500Error(c *gin.Context, err interface{}) {
	if err == nil {
		err = gin.H{}
	}

	c.JSON(http.StatusInternalServerError, gin.H{
		"success": false,
		"message": "something went wrong, please try again.",
		"data":    err,
	})
}

// Dispatch400Error 400 - bad request
func Dispatch400Error(c *gin.Context, msg interface{}, err error) {
	c.JSON(http.StatusBadRequest, gin.H{
		"success": false,
		"message": msg,
		"data":    err,
	})
}

// Dispatch404Error 404 - not found
func Dispatch404Error(c *gin.Context, msg string, err error) {
	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"message": msg,
		"data":    err,
	})
}

// Dispatch403Error 403 - forbidden
func Dispatch403Error(c *gin.Context, msg string) {
	c.JSON(http.StatusForbidden, gin.H{
		"success": false,
		"message": msg,
		"data":    nil,
	})
}

// Dispatch405Error 405 - method not allowed
func Dispatch405Error(c *gin.Context, msg string) {
	c.JSON(http.StatusMethodNotAllowed, gin.H{
		"success": false,
		"message": msg,
		"data":    nil,
	})
}

type RestErr struct {
	Message    string `json:"message"`
	Success    bool   `json:"success"`
	StatusCode int    `json:"code"`
}

func (r *RestErr) BadRequest(message string) *RestErr {
	return &RestErr{
		Message:    message,
		Success:    false,
		StatusCode: http.StatusBadRequest,
	}
}

func (r *RestErr) Unauthorized(message string) *RestErr {
	return &RestErr{
		Message:    message,
		Success:    false,
		StatusCode: http.StatusUnauthorized,
	}
}

func (r *RestErr) NotFound(message string) *RestErr {
	return &RestErr{
		Message:    message,
		Success:    false,
		StatusCode: http.StatusNotFound,
	}
}

func (r *RestErr) ServerError(message string) *RestErr {
	return &RestErr{
		Message:    message,
		Success:    false,
		StatusCode: http.StatusInternalServerError,
	}
}

func (r *RestErr) RequestNotAllowed(message string) *RestErr {
	return &RestErr{
		Message:    message,
		Success:    false,
		StatusCode: http.StatusForbidden,
	}
}

func (r *RestErr) StatusAccepted(message string) *RestErr {
	return &RestErr{
		Message:    message,
		Success:    true,
		StatusCode: http.StatusAccepted,
	}
}

func NewRestErr() *RestErr {
	return &RestErr{}
}

var ErrUnauthorized = errors.New("401 Unauthorized")
