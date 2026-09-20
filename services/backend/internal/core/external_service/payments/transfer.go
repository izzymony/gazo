package payments

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
)

// Seller payouts, as Paystack Transfers.
//
// This replaces `ProcessWithdrawal`, which was never called from anywhere and
// could not have been used safely if it had been:
//
//   - it returned only `error`, discarding the transfer object, so no transfer
//     code was ever captured and no webhook could be matched back to a payout;
//   - it sent no `reference`, so Paystack could not deduplicate and a retry
//     created a SECOND REAL TRANSFER;
//   - it computed kobo as `int(amount * 100)`, which truncates a float64 —
//     ₦8.29 became 828 kobo, verified at runtime.
//
// The shape here is built around one question: after a call, do we KNOW what
// happened? Most of this file exists to answer "no" honestly rather than
// guessing, because guessing wrong in the releasing direction pays a seller
// twice.

// TransferOutcome is the classification every transfer attempt resolves to.
// There are three, and the distinction between the last two is the whole point.
type TransferOutcome int

const (
	// Paystack accepted the transfer. `Status` says where it now is.
	TransferAccepted TransferOutcome = iota
	// Paystack refused, definitively, and told us why. The transfer does not
	// exist and never will. Only this releases the seller's reservation.
	TransferDefinitivelyRejected
	// We do not know. Timeout, connection failure, 5xx, unparseable body, or a
	// status string we do not recognise. The transfer MAY be live at Paystack,
	// so the reservation is held and the outcome is resolved by verification.
	TransferAmbiguous
	// Paystack has no transfer with this reference. Returned only by
	// VerifyTransfer, and deliberately distinct from a rejection: "never
	// created" means the payout can be RE-INITIATED with the same reference,
	// whereas "rejected" means it must not be. Collapsing the two would either
	// strand a recoverable payout or retry one Paystack already refused.
	TransferNotFound
)

func (o TransferOutcome) String() string {
	switch o {
	case TransferAccepted:
		return "accepted"
	case TransferDefinitivelyRejected:
		return "definitively_rejected"
	case TransferNotFound:
		return "not_found"
	default:
		return "ambiguous"
	}
}

// TransferResult is what the caller records. Every field is here because the
// previous implementation threw it away and left nothing to reconcile against.
type TransferResult struct {
	Outcome      TransferOutcome
	TransferCode string
	Reference    string
	Status       domain.PaystackTransferStatus
	// Paystack's fee for the transfer, in naira. Vibaar absorbs it; it is
	// recorded so the platform cost is visible.
	Fee float64
	// Why, for a definitive rejection or an ambiguous failure. Stored on the
	// withdrawal so an operator can see what happened without reading logs.
	Reason string
}

type transferEnvelope struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    struct {
		TransferCode string `json:"transfer_code"`
		Reference    string `json:"reference"`
		Status       string `json:"status"`
		Amount       int64  `json:"amount"`
		Fee          int64  `json:"fee"`
	} `json:"data"`
}

// InitiateTransferInput carries a reference the CALLER has already committed to
// the database. That ordering is the crash-safety property: if this process
// dies mid-call, the reference is still on the withdrawal row, so the
// reconciler can ask Paystack what became of it — and re-initiating with the
// same reference is a no-op at Paystack rather than a second payout.
type InitiateTransferInput struct {
	Account *domain.BusinessBankAccountDetail
	// Naira. Converted with helper.ToKobo, which rounds.
	Amount float64
	Reason string
	// Required. Must be the persisted, permanent reference for this withdrawal.
	Reference string
}

// ErrNoRecipient is returned when the seller's bank account has no Paystack
// transfer recipient and one could not be created.
var ErrNoRecipient = errors.New("no paystack transfer recipient for this account")

// EnsureTransferRecipient creates the Paystack recipient for a bank account, or
// returns the one already cached.
//
// Split out of the payout path deliberately: it is a property of the bank
// account, not of any particular withdrawal, so it belongs at the point the
// account is added. Creating it during a payout mixes a setup failure ("this
// account is not valid") with a payment failure ("the transfer did not go
// through"), and those need different handling and different messages.
func (p Paystack) EnsureTransferRecipient(account *domain.BusinessBankAccountDetail) (string, error) {
	if account == nil {
		return "", ErrNoRecipient
	}
	if code := existingRecipientCode(account); code != "" {
		return code, nil
	}

	payload := TransferRecipientRequest{
		Type:          "nuban",
		Name:          account.AccountName,
		AccountNumber: account.AccountNumber,
		BankCode:      fmt.Sprintf("%d", account.BankCode),
		Currency:      "NGN",
	}
	body, err := p.postJSON("/transferrecipient", payload)
	if err != nil {
		return "", fmt.Errorf("create transfer recipient: %w", err)
	}

	var resp TransferRecipientResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", fmt.Errorf("parse transfer recipient response: %w", err)
	}
	if !resp.Status || resp.Data.RecipientCode == "" {
		return "", fmt.Errorf("%w: %s", ErrNoRecipient, resp.Message)
	}
	return resp.Data.RecipientCode, nil
}

// existingRecipientCode prefers the typed column and falls back to the jsonb
// key the orphaned implementation used, so codes cached before the column
// existed are not re-created (which would leave two recipients for one account).
func existingRecipientCode(account *domain.BusinessBankAccountDetail) string {
	if account.PaystackRecipientCode != "" {
		return account.PaystackRecipientCode
	}
	for _, item := range account.Metadata {
		if code, ok := item["paystack_transfer_recipient_code"]; ok {
			if s, ok := code.(string); ok && s != "" {
				return s
			}
		}
	}
	return ""
}

// InitiateTransfer sends the transfer and classifies what came back.
//
// It never returns a bare error for a network problem: a timeout is a RESULT —
// specifically an ambiguous one — because the request may well have been
// received. Collapsing that into `err != nil` and treating it like a rejection
// is how a seller gets paid twice.
func (p Paystack) InitiateTransfer(in InitiateTransferInput) TransferResult {
	if in.Reference == "" {
		// Refusing is right: without a reference Paystack cannot deduplicate,
		// so a retry would create a second transfer. This is a programming
		// error, not a payment outcome.
		return TransferResult{
			Outcome: TransferDefinitivelyRejected,
			Reason:  "internal: transfer attempted without a persisted reference",
		}
	}

	recipient := existingRecipientCode(in.Account)
	if recipient == "" {
		return TransferResult{
			Outcome: TransferDefinitivelyRejected,
			Reason:  ErrNoRecipient.Error(),
		}
	}

	payload := map[string]any{
		"source":    "balance",
		"amount":    helper.ToKobo(in.Amount),
		"recipient": recipient,
		"reason":    in.Reason,
		// The idempotency key. Paystack rejects a duplicate reference rather
		// than creating a second transfer, which is what makes retrying safe.
		"reference": in.Reference,
	}

	status, body, err := p.postJSONStatus("/transfer", payload)
	return classifyTransferResponse(status, body, err, in.Reference)
}

// VerifyTransfer asks Paystack what became of a reference. This is how the
// reconciler resolves anything left ambiguous, including a withdrawal whose
// process died before it ever saw a response.
//
// A 404 is meaningful and is NOT an error: it means the transfer was never
// created, so re-initiating with the same reference is safe.
func (p Paystack) VerifyTransfer(reference string) TransferResult {
	status, body, err := p.getStatus("/transfer/verify/" + url.PathEscape(reference))
	if err != nil {
		return TransferResult{Outcome: TransferAmbiguous, Reference: reference, Reason: err.Error()}
	}
	if status == http.StatusNotFound {
		return TransferResult{
			Outcome:   TransferNotFound,
			Reference: reference,
			Reason:    "paystack has no transfer with this reference",
		}
	}
	return classifyTransferResponse(status, body, nil, reference)
}

// classifyTransferResponse is shared by initiation and verification so both
// paths reach the same verdict from the same evidence.
func classifyTransferResponse(httpStatus int, body []byte, callErr error, reference string) TransferResult {
	res := TransferResult{Reference: reference}

	// A transport failure tells us nothing about whether Paystack acted.
	if callErr != nil {
		res.Outcome = TransferAmbiguous
		res.Reason = callErr.Error()
		return res
	}

	// 5xx is Paystack's problem and may or may not have been actioned.
	if httpStatus >= 500 {
		res.Outcome = TransferAmbiguous
		res.Reason = fmt.Sprintf("paystack returned %d", httpStatus)
		return res
	}

	var env transferEnvelope
	if err := json.Unmarshal(body, &env); err != nil {
		// We cannot read the reply, so we cannot claim it failed.
		res.Outcome = TransferAmbiguous
		res.Reason = fmt.Sprintf("unparseable response (%d): %v", httpStatus, err)
		return res
	}

	res.TransferCode = env.Data.TransferCode
	if env.Data.Reference != "" {
		res.Reference = env.Data.Reference
	}
	res.Fee = helper.FromKobo(env.Data.Fee)

	// A 4xx WITH a readable refusal is the only definitive rejection. Both
	// halves matter: a 4xx we cannot parse could still have been actioned, and
	// `status:false` on a 2xx is Paystack declining, which is equally definitive.
	if httpStatus >= 400 || !env.Status {
		res.Outcome = TransferDefinitivelyRejected
		res.Reason = env.Message
		if res.Reason == "" {
			res.Reason = fmt.Sprintf("paystack refused with %d", httpStatus)
		}
		return res
	}

	// Accepted — but only if we recognise where it says the transfer now is.
	// An unknown status is ambiguous by construction: see domain.NextStatusFor.
	res.Status = domain.PaystackTransferStatus(env.Data.Status)
	if _, ok := domain.NextStatusFor(domain.WithdrawalProcessing, res.Status); !ok {
		res.Outcome = TransferAmbiguous
		res.Reason = fmt.Sprintf("unrecognised transfer status %q", env.Data.Status)
		return res
	}

	res.Outcome = TransferAccepted
	res.Reason = env.Message
	return res
}

func (p Paystack) postJSON(path string, payload any) ([]byte, error) {
	_, body, err := p.postJSONStatus(path, payload)
	return body, err
}

func (p Paystack) postJSONStatus(path string, payload any) (int, []byte, error) {
	buf, err := json.Marshal(payload)
	if err != nil {
		return 0, nil, fmt.Errorf("encode request: %w", err)
	}
	req, err := http.NewRequest(http.MethodPost, p.url+path, bytes.NewReader(buf))
	if err != nil {
		return 0, nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	return p.do(req)
}

func (p Paystack) getStatus(path string) (int, []byte, error) {
	req, err := http.NewRequest(http.MethodGet, p.url+path, nil)
	if err != nil {
		return 0, nil, fmt.Errorf("build request: %w", err)
	}
	return p.do(req)
}

func (p Paystack) do(req *http.Request) (int, []byte, error) {
	req.Header.Set("Authorization", "Bearer "+p.secretKey)
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		// Read failures are ambiguous for the same reason timeouts are: the
		// request was delivered, we just cannot see the answer.
		return resp.StatusCode, nil, fmt.Errorf("read response: %w", err)
	}
	return resp.StatusCode, body, nil
}
