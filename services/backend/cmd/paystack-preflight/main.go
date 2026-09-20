// Command paystack-preflight answers one question before payouts are switched
// on: can this account actually send a transfer?
//
// It exists because the expensive failure is not a bug in our code. Paystack
// Transfers must be explicitly enabled on a business, and transfers are paid
// from the Paystack BALANCE — if an account settles straight to its bank
// instead of to its balance, every transfer fails for lack of funds no matter
// how correct the integration is. Both are account settings, invisible from the
// code, and both would be discovered for the first time by a seller.
//
//	make paystack-preflight
//
// It is read-only: it lists and reads, and initiates nothing.
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type check struct {
	name   string
	ok     bool
	detail string
	fatal  bool // a failure here means payouts cannot work at all
}

func main() {
	base := strings.TrimRight(env("PAYSTACK_URL", "https://api.paystack.co"), "/")
	key := env("PAYSTACK_AUTH", "")

	fmt.Println("Paystack payout preflight")
	fmt.Println("=========================")
	fmt.Printf("endpoint: %s\n\n", base)

	if key == "" {
		fmt.Println("✗ PAYSTACK_AUTH is not set. Nothing can be checked.")
		os.Exit(1)
	}

	client := &http.Client{Timeout: 20 * time.Second}
	checks := []check{
		keyMode(key),
		balanceReachable(client, base, key),
		transfersEnabled(client, base, key),
		otpDisabled(client, base, key),
		settlementDestination(client, base, key),
	}

	var failed, fatal int
	for _, c := range checks {
		mark := "✓"
		if !c.ok {
			mark = "✗"
			failed++
			if c.fatal {
				fatal++
			}
		}
		fmt.Printf("%s %-28s %s\n", mark, c.name, c.detail)
	}

	fmt.Println()
	fmt.Println("Not checkable from here — confirm by hand:")
	fmt.Println("  • The Paystack dashboard shows Transfers as enabled for THIS business.")
	fmt.Println("  • Settings → Preferences → 'Confirm transfers before sending' is OFF.")
	fmt.Println("  • A real test-mode transfer completes end to end and its webhook arrives.")
	fmt.Println("  • The webhook URL registered with Paystack points at this environment.")
	fmt.Println()

	if fatal > 0 {
		fmt.Printf("RESULT: not ready — %d blocking failure(s). Leave PAYOUTS_LIVE unset.\n", fatal)
		os.Exit(1)
	}
	if failed > 0 {
		fmt.Printf("RESULT: %d warning(s). Read them before enabling payouts.\n", failed)
		os.Exit(0)
	}
	fmt.Println("RESULT: every automated check passed. Do the manual checks, then enable PAYOUTS_LIVE.")
}

// keyMode is a warning rather than a failure: running this against live keys is
// legitimate, but it should never be a surprise.
func keyMode(key string) check {
	switch {
	case strings.HasPrefix(key, "sk_test_"):
		return check{name: "key mode", ok: true, detail: "TEST key — safe to exercise"}
	case strings.HasPrefix(key, "sk_live_"):
		return check{name: "key mode", ok: false, detail: "LIVE key — real money; verify this is intended"}
	default:
		return check{name: "key mode", ok: false, detail: "unrecognised key prefix", fatal: true}
	}
}

// balanceReachable proves the key is valid AND that there is a balance to pay
// transfers from. A zero balance is not fatal — it is fatal at the moment
// someone withdraws, which is exactly the surprise worth naming now.
func balanceReachable(c *http.Client, base, key string) check {
	status, body, err := get(c, base+"/balance", key)
	if err != nil {
		return check{name: "balance readable", detail: err.Error(), fatal: true}
	}
	if status == http.StatusUnauthorized {
		return check{name: "balance readable", detail: "401 — the secret key is rejected", fatal: true}
	}
	var resp struct {
		Status bool `json:"status"`
		Data   []struct {
			Currency string  `json:"currency"`
			Balance  float64 `json:"balance"`
		} `json:"data"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(body, &resp); err != nil || !resp.Status {
		return check{name: "balance readable", detail: fmt.Sprintf("HTTP %d: %s", status, trim(body)), fatal: true}
	}
	parts := make([]string, 0, len(resp.Data))
	for _, b := range resp.Data {
		parts = append(parts, fmt.Sprintf("%s %.2f", b.Currency, b.Balance/100))
	}
	if len(parts) == 0 {
		return check{name: "balance readable", ok: true, detail: "reachable, but no balance returned"}
	}
	return check{name: "balance readable", ok: true, detail: strings.Join(parts, ", ")}
}

// transfersEnabled reads the transfer list. An account without Transfers
// enabled is refused here, which is the cheapest way to find out — the
// alternative is finding out on a seller's first withdrawal.
func transfersEnabled(c *http.Client, base, key string) check {
	status, body, err := get(c, base+"/transfer?perPage=1", key)
	if err != nil {
		return check{name: "transfers enabled", detail: err.Error(), fatal: true}
	}
	if status == http.StatusOK {
		return check{name: "transfers enabled", ok: true, detail: "the transfer API answers"}
	}
	return check{
		name:   "transfers enabled",
		detail: fmt.Sprintf("HTTP %d: %s", status, trim(body)),
		fatal:  true,
	}
}

// settlementDestination is the check that is easiest to skip and most expensive
// to miss. Transfers are funded from the Paystack balance; if this account
// settles directly to a bank, the balance stays at zero and every payout fails.
func settlementDestination(c *http.Client, base, key string) check {
	status, body, err := get(c, base+"/settlement?perPage=1", key)
	if err != nil {
		return check{name: "settlement visible", detail: err.Error()}
	}
	if status != http.StatusOK {
		return check{
			name:   "settlement visible",
			detail: fmt.Sprintf("HTTP %d — confirm in the dashboard that settlement goes to the BALANCE, not straight to a bank", status),
		}
	}
	var resp struct {
		Data []struct {
			Status string `json:"status"`
			Domain string `json:"domain"`
		} `json:"data"`
	}
	_ = json.Unmarshal(body, &resp)
	if len(resp.Data) == 0 {
		return check{
			name:   "settlement visible",
			ok:     true,
			detail: "no settlements yet — confirm in the dashboard that they land in the BALANCE",
		}
	}
	return check{
		name:   "settlement visible",
		ok:     true,
		detail: fmt.Sprintf("%d settlement(s) visible — confirm they credit the BALANCE, not a bank account", len(resp.Data)),
	}
}

// otpDisabled is the check whose absence strands payouts.
//
// With "confirm transfers before sending" enabled, POST /transfer succeeds with
// `status: "otp"` and the transfer sits there until a human enters a code.
// Nothing in this service can move it: the withdrawal parks in `awaiting_otp`
// and the seller's funds stay reserved. Measured on this account — two
// transfers came back "Transfer requires OTP to continue".
//
// Paystack exposes no endpoint for the setting, so this reads TRANSFER HISTORY
// instead, which is honest about its limits: it can prove OTP is on, and it
// cannot prove OTP is off on an account that has never sent a transfer. In that
// case it says so rather than passing.
func otpDisabled(c *http.Client, base, key string) check {
	status, body, err := get(c, base+"/transfer?perPage=20", key)
	if err != nil {
		return check{name: "OTP not required", detail: err.Error()}
	}
	if status != http.StatusOK {
		return check{name: "OTP not required", detail: fmt.Sprintf("HTTP %d — confirm the setting by hand", status)}
	}

	var resp struct {
		Data []struct {
			Status string `json:"status"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return check{name: "OTP not required", detail: "unreadable transfer list — confirm by hand"}
	}
	if len(resp.Data) == 0 {
		return check{
			name:   "OTP not required",
			detail: "no transfer history, so this cannot be proven here — confirm the setting by hand",
		}
	}
	for _, t := range resp.Data {
		if t.Status == "otp" {
			return check{
				name:  "OTP not required",
				fatal: true,
				detail: "a recent transfer is stuck at `otp`: this account requires transfer " +
					"confirmation, which strands every payout AND the seller's reserved funds",
			}
		}
	}
	return check{name: "OTP not required", ok: true, detail: fmt.Sprintf("none of the last %d transfers needed OTP", len(resp.Data))}
}

func get(c *http.Client, url, key string) (int, []byte, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	resp, err := c.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	return resp.StatusCode, body, err
}

func env(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func trim(b []byte) string {
	s := strings.TrimSpace(string(b))
	if len(s) > 160 {
		return s[:160] + "…"
	}
	return s
}
