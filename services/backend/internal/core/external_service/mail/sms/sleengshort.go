package sms

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"time"
	"os"
)

type Sleengshort struct {}



func NewSleengShort () SMS {
	return Sleengshort{}
}

func (s Sleengshort) Send(msg, recipients string) (*SMSResponse, error) {
	payload := map[string]string{
		"sender_id":  os.Getenv("SMS_ID"),
		"recipients": recipients,
		"msg":        msg,
	}

	// Convert payload to JSON
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	// Set up the HTTP request
	req, err := http.NewRequest("POST", os.Getenv("SLEENGSHORT_URL"), bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, err
	}

	// Add headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", os.Getenv("SLEENGSHORT_KEY"))
	req.Header.Set("Cache-Control", "no-cache")

	// Make the request
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Read the response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	smsResp := SMSResponse{}
	json.Unmarshal(body, &smsResp)

	return &smsResp, nil
}
