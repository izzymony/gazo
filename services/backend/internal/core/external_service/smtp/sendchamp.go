package smtp

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	"os"
)

type SendChampService struct {
	publicAPIKey string
	senderID     string
}

func NewSendChampService() *SendChampService {
	return &SendChampService{
		publicAPIKey: os.Getenv("SENDCHAMP_PUBLIC_API_KEY"),
		senderID:     os.Getenv("SENDCHAMP_SENDER_ID"),
	}
}

func (s *SendChampService) SendOTPToPhoneNumber(phone string, code string) error {
	url := "https://api.sendchamp.com/api/v1/sms/send"

	payload := map[string]interface{}{
		"sender_name": s.senderID,
		"to":          []string{phone},
		"message":     fmt.Sprintf("Your OTP code is: %s", code),
		"route":       "international",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.publicAPIKey))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("sendchamp error, status code: %d", resp.StatusCode)
	}

	return nil
}
