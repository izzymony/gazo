package validators

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/mail"
	"strings"

	"github.com/gin-gonic/gin"
	"vibaar/backend/internal/helper"

	"github.com/go-playground/validator/v10"
)

func IsValidEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

func IsInputValid(input interface{}) (interface{}, error) {
	var validate = validator.New()
	mp := map[string]interface{}{}
	err := validate.Struct(input)
	if err != nil {
		for _, err := range err.(validator.ValidationErrors) {
			mp["error"] = fmt.Sprintf("field %v is important", helper.ToSnakeCase(err.Field()))
			return mp, fmt.Errorf("field %v is important", helper.ToSnakeCase(err.Field()))
		}
	}
	return nil, nil
}

var Validator = validator.New()

func ValidateInput(input interface{}, c *gin.Context, fieldToErrorMessage map[string]map[string]string) (map[string][]string, error) {
	buf, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(buf, input)
	if err != nil {
		return nil, err
	}

	if err := Validator.Struct(input); err != nil {
		errorMap := make(map[string][]string)
		for _, tagErr := range err.(validator.ValidationErrors) {
			fieldName := strings.ToLower(tagErr.Field())
			tagName := tagErr.Tag()
			customErrorMsgs := fieldToErrorMessage[fieldName]
			if customErrorMsgs != nil {
				errorMsg := customErrorMsgs[tagName]
				if errorMsg != "" {
					if tagErr.Param() != "" {
						errorMsg = fmt.Sprintf(errorMsg, tagErr.Param())
					}
					errorMap[fieldName] = append(errorMap[fieldName], errorMsg)
				}
			}
		}
		if len(errorMap) == 0 {
			return nil, nil
		}
		return errorMap, nil
	}

	c.Request.Body = io.NopCloser(bytes.NewBuffer(buf))
	return nil, nil
}
