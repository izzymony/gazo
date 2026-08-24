package smtp

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	mysql_repo "vibaar/backend/internal/adapter/repositories/sql"
	"vibaar/backend/internal/core/domain"

	"vibaar/backend/internal/logger"
	"vibaar/backend/internal/ports"
)

type TwilioService struct {
	AccountSID              string
	AuthToken               string
	ServiceSID              string
	WhatsappOTPContentSID   string
	WhatsappFromPhoneNumber string
	MessagingServiceSid     string
	TwilioCacheRepository   ports.TwilioCacheInterface
}

func NewTwilioService(db *gorm.DB) *TwilioService {
	return &TwilioService{
		AccountSID:              os.Getenv("TWILIO_ACCOUNT_SID"),
		AuthToken:               os.Getenv("TWILIO_AUTH_TOKEN"),
		ServiceSID:              os.Getenv("TWILIO_VERIFY_SERVICE_SID"),
		WhatsappOTPContentSID:   os.Getenv("TWILIO_WHATSAPP_OTP_CONTENT_SID"),
		WhatsappFromPhoneNumber: os.Getenv("TWILIO_WHATSAPP_PHONE_NUMBER"),
		MessagingServiceSid:     os.Getenv("MESSAGING_SERVICE_SID"),
		TwilioCacheRepository:   mysql_repo.NewTwilioCacheRepository(db),
	}
}

func (s *TwilioService) sendReq(url string, formBody url.Values) (*http.Response, error) {
	auth := base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", s.AccountSID, s.AuthToken)))

	req, err := http.NewRequest("POST", url, strings.NewReader(formBody.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", fmt.Sprintf("Basic %s", auth))

	client := &http.Client{Timeout: 30 * time.Second}
	return client.Do(req)
}

func (s *TwilioService) SendOTP(to, otp, channel, templateId string) error {
	switch channel {
	case "sms":
		return s.SendSMSOTP(to, otp)
	case "whatsapp":
		return s.SendWhatsAppOTP(to, otp)
	case "email":
		return s.SendEmailOTP(to, otp, templateId)
	}
	return nil
}

func (s *TwilioService) SendEmailOTP(to, otp, templateId string) error {
	fmt.Println("sending mail otp")
	form := url.Values{}
	form.Set("Channel", "email")
	if templateId != "" {
		channelConfig := map[string]interface{}{
			"from":        "hello@vibaar.com",
			"from_name":   "Vibaar",
			"template_id": templateId,
			"template_parameters": map[string]string{
				"twilio_code": otp,
				"year":        strconv.Itoa(time.Now().Year()),
			},
			"subject": "Your OTP Code for Vibaar",
		}
		configJSON, err := json.Marshal(channelConfig)
		if err != nil {
			logger.Error("Failed to marshal ChannelConfiguration: " + err.Error())
			return err
		}
		form.Set("ChannelConfiguration", string(configJSON))
	}
	form.Set("To", to)
	form.Set("CustomCode", otp)
	resp, err := s.sendReq(fmt.Sprintf("https://verify.twilio.com/v2/Services/%s/Verifications", s.ServiceSID), form)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}
	bodyString := string(bodyBytes)
	fmt.Println("Response Body2:", bodyString)
	if resp.StatusCode >= 300 {
		return fmt.Errorf("twilio API returned status: %s", resp.Status)
	}
	return nil
}

func (s *TwilioService) SendWhatsAppOTP(to, code string) error {
	fmt.Println("sending whatsapp otp")
	twilioURL := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", s.AccountSID)

	contentVars := fmt.Sprintf(`{"1":"%s"}`, code)

	form := url.Values{}
	form.Set("To", fmt.Sprintf("whatsapp:%s", to))
	form.Set("From", fmt.Sprintf("whatsapp:%s", s.WhatsappFromPhoneNumber))
	form.Set("ContentSid", s.WhatsappOTPContentSID)
	form.Set("ContentVariables", contentVars)

	req, err := http.NewRequest("POST", twilioURL, strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.SetBasicAuth(s.AccountSID, s.AuthToken)
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}
	fmt.Println("bodyBytes; ", string(bodyBytes))
	var response TwilioMessageResponse
	if err := json.Unmarshal(bodyBytes, &response); err != nil {
		return fmt.Errorf("error parsing transfer response: %w", err)
	}
	_, err = s.TwilioCacheRepository.Create(&domain.TwilioCache{
		MessageSID:     response.Sid,
		Status:         response.Status,
		MessageContent: response.Body,
		OTP:            code,
		To:             to,
		From:           s.WhatsappFromPhoneNumber,
		Channel:        "whatsapp",
	})
	if err != nil {
		logger.Error(fmt.Sprintf("error catching twilio response; %v", err))
	}
	return nil
}

func (s *TwilioService) SendSMSOTP(to, code string) error {
	twilioURL := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", s.AccountSID)
	body := fmt.Sprintf("Your Vibaar verification code is %s. This code will expire in 10 minutes.", code)
	form := url.Values{}
	form.Set("To", to)
	form.Set("Body", body)
	form.Set("MessagingServiceSid", s.MessagingServiceSid)

	req, err := http.NewRequest("POST", twilioURL, strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.SetBasicAuth(s.AccountSID, s.AuthToken)
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}
	fmt.Println("bodyBytes; ", string(bodyBytes))

	var response TwilioMessageResponse
	if err := json.Unmarshal(bodyBytes, &response); err != nil {
		return fmt.Errorf("error parsing transfer response: %w", err)
	}
	_, err = s.TwilioCacheRepository.Create(&domain.TwilioCache{
		MessageSID:     response.Sid,
		Status:         response.Status,
		MessageContent: body,
		To:             to,
		OTP:            code,
		Channel:        "sms",
	})
	if err != nil {
		logger.Error(fmt.Sprintf("error catching twilio response; %v", err))
	}
	return nil
}

type VerificationResponse struct {
	Status      string  `json:"status"`
	Payee       *string `json:"payee"`
	DateUpdated string  `json:"date_updated"`
	AccountSID  string  `json:"account_sid"`
	To          string  `json:"to"`
	Amount      *string `json:"amount"`
	Valid       bool    `json:"valid"`
	SID         string  `json:"sid"`
	DateCreated string  `json:"date_created"`
	ServiceSID  string  `json:"service_sid"`
	Channel     string  `json:"channel"`
}

type TwilioMessageResponse struct {
	AccountSid          string            `json:"account_sid"`
	ApiVersion          string            `json:"api_version"`
	Body                string            `json:"body"`
	DateCreated         string            `json:"date_created"`
	DateSent            interface{}       `json:"date_sent"`
	DateUpdated         string            `json:"date_updated"`
	Direction           string            `json:"direction"`
	ErrorCode           interface{}       `json:"error_code"`
	ErrorMessage        interface{}       `json:"error_message"`
	From                string            `json:"from"`
	MessagingServiceSid string            `json:"messaging_service_sid"`
	NumMedia            string            `json:"num_media"`
	NumSegments         string            `json:"num_segments"`
	Price               interface{}       `json:"price"`
	PriceUnit           interface{}       `json:"price_unit"`
	Sid                 string            `json:"sid"`
	Status              string            `json:"status"`
	SubresourceUris     map[string]string `json:"subresource_uris"`
	To                  string            `json:"to"`
	Uri                 string            `json:"uri"`
}
