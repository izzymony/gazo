package payments

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

type Paystack struct {
	url          string
	secretKey    string
	businessRepo ports.BusinessIface
}

func NewPaystackPaymentService(db *gorm.DB) Paystack {
	p := Paystack{
		url:          os.Getenv("PAYSTACK_URL"),
		secretKey:    os.Getenv("PAYSTACK_AUTH"),
		businessRepo: mysql_repo.NewBusinessRepository(db),
	}

	if err := p.loadBanks(); err != nil {
		logger.Error(fmt.Errorf("error loading bank codes %v", err))
	}

	return p
}

type PaystackInitiateResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    struct {
		AuthorizationURL string `json:"authorization_url"`
		AccessCode       string `json:"access_code"`
		Reference        string `json:"reference"`
	} `json:"data"`
}

type VerifyPaystackResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    struct {
		ID              int64       `json:"id"`
		Status          string      `json:"status"`
		Reference       string      `json:"reference"`
		ReceiptNumber   *string     `json:"receipt_number"`
		Amount          int         `json:"amount"`
		Message         *string     `json:"message"`
		GatewayResponse string      `json:"gateway_response"`
		PaidAt          *time.Time  `json:"paid_at"`
		CreatedAt       time.Time   `json:"created_at"`
		Channel         string      `json:"channel"`
		Currency        string      `json:"currency"`
		IPAddress       string      `json:"ip_address"`
		Metadata        interface{} `json:"metadata"`
		Fees            interface{} `json:"fees"`
		Customer        struct {
			ID           int64       `json:"id"`
			FirstName    *string     `json:"first_name"`
			LastName     *string     `json:"last_name"`
			Email        string      `json:"email"`
			CustomerCode string      `json:"customer_code"`
			Phone        *string     `json:"phone"`
			Metadata     interface{} `json:"metadata"`
		} `json:"customer"`
		TransactionDate time.Time `json:"transaction_date"`
	} `json:"data"`
}

type PaystackVerifyResponse struct {
	Amount     int    `json:"amount"`
	Currency   string `json:"currency"`
	Reference  string `json:"reference"`
	Status     string `json:"status"`
	GatewayRef string `json:"gateway_response"`
}

type InitiateResponse struct {
	TransactionId    string `json:"transaction_id"`
	AuthorizationURL string `json:"authorization_url"`
	AccessCode       string `json:"access_code"`
	Reference        string `json:"reference"`
}

var banks []Bank

func (p Paystack) Initiate(email, ref string, amount int32, redirectURL string) (*PaystackInitiateResponse, error) {
	// createTransaction initiates a payment transaction on Paystack.
	url := fmt.Sprintf("%s/transaction/initialize", p.url)

	// Prepare the payload for creating a transaction.
	payload := map[string]interface{}{
		"email":        email,
		"amount":       amount * 100,
		"reference":    ref,
		"callback_url": redirectURL, // Redirect here after payment
		"currency":     "NGN",
	}
	payloadBytes, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+p.secretKey)
	req.Header.Set("Content-Type", "application/json")

	// Send the request
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var transactionResponse PaystackInitiateResponse
	if err := json.Unmarshal(body, &transactionResponse); err != nil {
		return nil, err
	}
	if !transactionResponse.Status {
		return nil, fmt.Errorf("failed to create transaction: %s", transactionResponse.Message)
	}
	return &transactionResponse, nil
}

// verifyTransaction checks the transaction status from Paystack.
func (p Paystack) Verify(reference string) (*VerifyPaystackResponse, error) {
	url := fmt.Sprintf("%s/transaction/verify/%s", p.url, reference)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+p.secretKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var verifyResponse VerifyPaystackResponse
	if err := json.Unmarshal(body, &verifyResponse); err != nil {
		return nil, err
	}

	log.Println("paystack-verification", verifyResponse)

	if !verifyResponse.Status {
		return nil, fmt.Errorf("failed to verify transaction: %s", verifyResponse.Message)
	}

	return &verifyResponse, nil
}

func (p Paystack) loadBanks() error {
	logger.Info("Fetching banks from Paystack")

	url := "https://api.paystack.co/bank"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+p.secretKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected response status: %s", resp.Status)
	}

	var psResponse PaystackResponse
	if err := json.NewDecoder(resp.Body).Decode(&psResponse); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	if !psResponse.Status {
		return fmt.Errorf("paystack API returned error: %s", psResponse.Message)
	}

	basePath, _ := filepath.Abs("")
	filePath := filepath.Join(basePath, "banks.json")

	file, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	if err := json.NewEncoder(file).Encode(psResponse.Data); err != nil {
		return fmt.Errorf("failed to write to file: %w", err)
	}

	logger.Info("Bank codes loaded and saved")
	banks = psResponse.Data
	return nil
}

func (p Paystack) GetBanks(page, limit int) (paginatedBanks []Bank, totalPages int, err error) {
	if len(banks) == 0 {
		if err := p.loadBanks(); err != nil {
			return nil, 0, fmt.Errorf("failed to load banks: %w", err)
		}
	}
	if page < 1 || limit < 1 {
		return nil, 0, fmt.Errorf("invalid page or limit")
	}
	totalBanks := len(banks)
	totalPages = int(math.Ceil(float64(totalBanks) / float64(limit)))

	if page > totalPages {
		return nil, totalPages, fmt.Errorf("page out of range")
	}
	start := (page - 1) * limit
	end := start + limit
	if start > totalBanks {
		return nil, totalPages, fmt.Errorf("no banks on this page")
	}
	if end > totalBanks {
		end = totalBanks
	}
	paginatedBanks = banks[start:end]
	return paginatedBanks, totalPages, nil
}

func (p Paystack) SearchBank(query string, page int, limit int) ([]Bank, int, error) {
	if len(banks) == 0 {
		if err := p.loadBanks(); err != nil {
			return nil, 0, fmt.Errorf("failed to load banks: %w", err)
		}
	}
	var filteredBanks []Bank
	query = strings.ToLower(query)

	for _, bank := range banks {
		if strings.Contains(strings.ToLower(bank.Name), query) {
			filteredBanks = append(filteredBanks, bank)
		}
	}
	totalBanks := len(filteredBanks)
	totalPages := int(math.Ceil(float64(totalBanks) / float64(limit)))

	if page > totalPages {
		return nil, totalPages, fmt.Errorf("page out of range")
	}
	start := (page - 1) * limit
	end := start + limit
	if start > totalBanks {
		return nil, totalPages, fmt.Errorf("no banks on this page")
	}
	if end > totalBanks {
		end = totalBanks
	}
	paginatedBanks := filteredBanks[start:end]
	return paginatedBanks, totalPages, nil
}

func (p Paystack) ValidateBankAccount(accountNumber, bankCode string) (*requests.AccountDetails, error) {
	url := fmt.Sprintf("https://api.paystack.co/bank/resolve?account_number=%s&bank_code=%s", accountNumber, bankCode)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+p.secretKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to validate bank account: %s - %s", resp.Status, string(body))
	}

	var result struct {
		Status  bool   `json:"status"`
		Message string `json:"message"`
		Data    struct {
			AccountNumber string `json:"account_number"`
			AccountName   string `json:"account_name"`
			BankID        int    `json:"bank_id"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if !result.Status {
		return nil, fmt.Errorf("validation failed: %s", result.Message)
	}

	return &requests.AccountDetails{
		AccountNumber: result.Data.AccountNumber,
		AccountName:   result.Data.AccountName,
		BankCode:      bankCode,
	}, nil
}

type PaystackResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    []Bank `json:"data"`
}

type Bank struct {
	ID               int     `json:"id"`
	Name             string  `json:"name"`
	Slug             string  `json:"slug"`
	Code             string  `json:"code"`
	LongCode         string  `json:"longcode"`
	Gateway          *string `json:"gateway"`
	PayWithBank      bool    `json:"pay_with_bank"`
	SupportsTransfer bool    `json:"supports_transfer"`
	Active           bool    `json:"active"`
	Country          string  `json:"country"`
	Currency         string  `json:"currency"`
	Type             string  `json:"type"`
	IsDeleted        bool    `json:"is_deleted"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

type TransferRecipientRequest struct {
	Type          string `json:"type"`
	Name          string `json:"name"`
	AccountNumber string `json:"account_number"`
	BankCode      string `json:"bank_code"`
	Currency      string `json:"currency"`
}

type TransferRecipientResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    struct {
		RecipientCode string `json:"recipient_code"`
	} `json:"data"`
}

type InitiateTransferRequest struct {
	Source    string `json:"source"`
	Amount    int    `json:"amount"`
	Recipient string `json:"recipient"`
	Reason    string `json:"reason"`
}

type InitiateTransferResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

type ProcessWithdrawalRequest struct {
	AccountDetails *domain.BusinessBankAccountDetail
	Amount         float64
	Reason         string
}

func (p Paystack) ProcessWithdrawal(request *ProcessWithdrawalRequest) error {
	var (
		recipientCode string
		client        = &http.Client{Timeout: 30 * time.Second}
	)

	for _, item := range request.AccountDetails.Metadata {
		if code, ok := item["paystack_transfer_recipient_code"]; ok && code != "" {
			recipientCode = code.(string)
			break
		}
	}

	if recipientCode == "" {
		createRecipientUrl := fmt.Sprintf("%s/transferrecipient", p.url)
		payload := TransferRecipientRequest{
			Type:          "nuban",
			Name:          request.AccountDetails.AccountName,
			AccountNumber: request.AccountDetails.AccountNumber,
			BankCode:      fmt.Sprintf(`%d`, request.AccountDetails.BankCode),
			Currency:      "NGN",
		}

		bodyBytes, _ := json.Marshal(payload)
		req, err := http.NewRequest("POST", createRecipientUrl, bytes.NewBuffer(bodyBytes))
		if err != nil {
			return fmt.Errorf("error creating recipient request: %w", err)
		}
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", p.secretKey))
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("error sending recipient request: %w", err)
		}
		defer resp.Body.Close()

		respBody, _ := io.ReadAll(resp.Body)

		var recipientResp TransferRecipientResponse
		if err := json.Unmarshal(respBody, &recipientResp); err != nil {
			return fmt.Errorf("error parsing recipient response: %w", err)
		}
		if !recipientResp.Status {
			return fmt.Errorf("failed to create transfer recipient: %s", recipientResp.Message)
		}
		recipientCode = recipientResp.Data.RecipientCode
		if err := p.businessRepo.AppendAccountDetailsMetadata(request.AccountDetails.ID, map[string]interface{}{
			"paystack_transfer_recipient_code": recipientCode,
		}); err != nil {
			return err
		}
	}

	initiateUrl := fmt.Sprintf("%s/transfer", p.url)
	initiatePayload := InitiateTransferRequest{
		Source:    "balance",
		Amount:    int(request.Amount * 100),
		Recipient: recipientCode,
		Reason:    request.Reason,
	}

	initiateBody, _ := json.Marshal(initiatePayload)
	initiateReq, err := http.NewRequest("POST", initiateUrl, bytes.NewBuffer(initiateBody))
	if err != nil {
		return fmt.Errorf("error creating transfer request: %w", err)
	}
	initiateReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", p.secretKey))
	initiateReq.Header.Set("Content-Type", "application/json")

	initiateResp, err := client.Do(initiateReq)
	if err != nil {
		return fmt.Errorf("error sending Ptransfer request: %w", err)
	}
	defer initiateResp.Body.Close()

	initiateRespBody, _ := io.ReadAll(initiateResp.Body)

	var transferResp InitiateTransferResponse
	if err := json.Unmarshal(initiateRespBody, &transferResp); err != nil {
		return fmt.Errorf("error parsing transfer response: %w", err)
	}
	if !transferResp.Status {
		return fmt.Errorf("failed to initiate transfer: %s", transferResp.Message)
	}

	return nil
}
