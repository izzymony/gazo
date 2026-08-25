package services

import (
	"errors"
	"fmt"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/mail/sms"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
	"log"
	"os"
	"time"

	"gorm.io/gorm"
)

var requestType = map[string]bool{
	"change_password": true,
	"forgot_password": true,
	"auth":            true,
}

type OTPService struct {
	repo        ports.OtpRepoIface
	userService UserService
	smsService  sms.SMS
}

func NewOTPService(db *gorm.DB) *OTPService {
	return &OTPService{
		repo:        mysql_repo.NewOTPRepository(db),
		smsService:  sms.NewSmsSeervice(),
		userService: *NewUserService(db),
	}
}

func (s *OTPService) Save(input domain.OTP) (interface{}, error) {
	otp := domain.OTP{}

	if _, ok := requestType[input.RequestType]; !ok {
		return nil, errors.New("invalid request type")
	}

	otpResp, _ := s.FetchOne(map[string]interface{}{
		"identifier":   input.Identifier,
		"request_type": input.RequestType,
		"status":       "NOT_EXPIRED",
	})

	if otpResp != nil {
		// helper.Copy(otpResp, &otp)
		if int64(otpResp.Duration) > time.Now().Unix() {
			return otpResp, nil
		} else {
			_, err := s.Update(otp.ID, domain.OTP{Status: "EXPIRED"})
			if err != nil {
				log.Println(helper.ToJsonString(map[string]interface{}{"service": otp, "error": err}))
			}
		}
	}

	user, found, err := s.userService.FindUserByEmailORPhone(input.Identifier)
	if err != nil {
		log.Printf("Error finding user: %v", err)
		return nil, err
	}
	
	log.Printf("OTP Debug - Identifier: %s, Found: %t, RequestType: %s", input.Identifier, found, input.RequestType)
	
	// Allow OTP generation for new users during registration (auth request type)
	// For other request types (forgot_password, change_password), user must exist
	if !found && input.RequestType != "auth" {
		log.Printf("Rejecting OTP: user not found and request type is not auth")
		return nil, errors.New("invalid user")
	}
	
	switch os.Getenv("ENV") {
	case "prod":
		input.Code = helper.GenerateOTP(6)
		// Only send SMS if user exists and has a phone number
		if found && user.Phone != "" {
			s.smsService.Send(fmt.Sprintf("%v is your otp. Do not disclose to anyone", input.Code), user.Phone)
		}
	default:
		input.Code = "123456"
	}

	input.Duration = time.Duration(time.Now().Add(time.Minute * 5).Unix())

	return s.repo.Create(&input)
}

func (s *OTPService) Update(id string, input domain.OTP) (interface{}, error) {
	return s.repo.Update(id, input)
}

func (s *OTPService) GetAll(param map[string]interface{}) (interface{}, error) {
	return s.repo.GetAll(param)
}

func (s *OTPService) Find(id string) (interface{}, error) {
	return s.repo.Find(id)
}

func (s *OTPService) FetchOne(param map[string]interface{}) (*domain.OTP, error) {
	return s.repo.GetOne(param)
}

func (s *OTPService) ValideOTP(indentifier, code string) (*domain.OTP, error) {
	otp, err := s.FetchOne(map[string]interface{}{
		"identifier": indentifier,
		"code":       code,
		"status":     "NOT_EXPIRED",
	})

	if err != nil {
		log.Println(helper.ToJsonString(map[string]interface{}{"service": "otp", "error": err}))
		return nil, err
	}

	if time.Now().Unix() > int64(otp.Duration) {
		return nil, errors.New("token expired")
	}

	return otp, nil
}
