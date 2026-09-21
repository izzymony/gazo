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

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
	"gorm.io/gorm"
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
		// Paystack's collection fee for this charge, in kobo. A POINTER because
		// the field is absent or null on some responses, and `int64` would then
		// silently read as a genuine zero fee.
		//
		// It used to be `interface{}` and was parsed and discarded, so the
		// gateway cost of every charge Vibaar has ever taken is unrecorded. It
		// is persisted on the transaction now; `payment_fee_allocation` on the
		// allocation record reads it later.
		Fees     *int64 `json:"fees"`
		Customer struct {
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

// maxInitiateKobo is a PROVIDER safety limit, not a business rule: ₦100,000,000
// expressed in kobo.
//
// It is deliberately separate from CHECKOUT_MAX_NGN. That variable is product
// policy and an operator can raise it; this one protects the arithmetic and the
// wire format, and nothing in the environment can switch it off. If the two ever
// disagree, the smaller wins, which is the safe direction.
const maxInitiateKobo int64 = 100_000_000 * 100

// Initiate opens a Paystack transaction for amountKobo, in integer kobo.
//
// The amount is kobo — and int64 — because the previous signature took `int32`
// naira and sent `amount * 100`, which was wrong twice over:
//
//   - Every caller had to round to whole naira to fit the type
//     (`int32(math.Round(input.Amount))`), so a cart totalling ₦8,450.50 was
//     charged ₦8,451 or ₦8,450. Kobo were lost at the call site, before this
//     function ever saw them.
//   - `amount * 100` in int32 OVERFLOWS above ₦21,474,836 — silently, and
//     into a negative number, which Paystack would have rejected with a
//     message about the amount rather than about the type.
//
// Callers now convert once, with helper.ToKobo, which rounds rather than
// truncating.
func (p Paystack) Initiate(email, ref string, amountKobo int64, redirectURL string) (*PaystackInitiateResponse, error) {
	if amountKobo <= 0 {
		return nil, fmt.Errorf("invalid charge amount: %d kobo", amountKobo)
	}
	if amountKobo > maxInitiateKobo {
		return nil, fmt.Errorf("charge amount %d kobo exceeds the provider limit of %d kobo",
			amountKobo, maxInitiateKobo)
	}

	// createTransaction initiates a payment transaction on Paystack.
	url := fmt.Sprintf("%s/transaction/initialize", p.url)

	// Prepare the payload for creating a transaction.
	payload := map[string]interface{}{
		"email":        email,
		"amount":       amountKobo,
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

// ProcessWithdrawal lived here, unreferenced, and is deleted rather than left
// for someone to find and wire up. It computed kobo as `int(amount * 100)`,
// which truncates — ₦8.29 became 828 — sent no `reference`, so a retry created
// a SECOND REAL TRANSFER, and discarded the transfer object, so no webhook
// could ever be matched back to a payout. Its replacement is
// `transfer.go`: EnsureTransferRecipient / InitiateTransfer / VerifyTransfer,
// driven by PayoutService.
