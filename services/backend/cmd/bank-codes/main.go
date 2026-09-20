// Command bank-codes audits, and optionally repairs, stored payout bank codes.
//
// `bank_code` used to be an integer column, which silently rewrote every code
// whose leading character mattered: Access "044" became 44, UBA "033" became
// 33, GTBank "058" became 58. Measured against Paystack, bank_code "44" is
// refused with "Bank is invalid" while "044" creates the recipient — so those
// accounts cannot be paid until the real code is restored.
//
// Migration 016 widened the column to text but deliberately did not guess the
// missing characters. Padding 33 to "033" is right for UBA and the same rule
// turns MINT-FINEX MFB's real code "09" into "009", which is wrong. The only
// reliable way back is the bank NAME, which was stored alongside, matched
// against Paystack's live bank list. That is what this does.
//
//	make bank-codes-audit    # report only, changes nothing
//	make bank-codes-repair   # apply the unambiguous fixes
//
// Anything it cannot resolve unambiguously is listed for a human rather than
// guessed at: a wrong bank code sends someone's money to the wrong bank.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/database"
)

type account struct {
	ID       string
	Bank     string
	BankCode string
}

func main() {
	repair := flag.Bool("repair", false, "apply the unambiguous fixes (otherwise report only)")
	flag.Parse()

	banks, err := fetchBanks()
	if err != nil {
		fmt.Printf("could not fetch Paystack's bank list: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Paystack lists %d NGN banks\n\n", len(banks))

	db := database.ConnectDB()
	var accounts []account
	if err := db.Table("business_bank_account_details").
		Select("id, bank, bank_code").Find(&accounts).Error; err != nil {
		fmt.Printf("could not read bank accounts: %v\n", err)
		os.Exit(1)
	}

	var ok, fixable, unresolved int
	for _, a := range accounts {
		want, matched := banks[normalise(a.Bank)]
		switch {
		case !matched:
			unresolved++
			fmt.Printf("  ? %-34s code=%-10q no Paystack bank matches this name — needs a human\n",
				truncate(a.Bank, 34), a.BankCode)
		case want == a.BankCode:
			ok++
		default:
			fixable++
			fmt.Printf("  ! %-34s code=%-10q should be %q\n", truncate(a.Bank, 34), a.BankCode, want)
			if *repair {
				if err := db.Table("business_bank_account_details").
					Where("id = ?", a.ID).Update("bank_code", want).Error; err != nil {
					fmt.Printf("      repair FAILED: %v\n", err)
					continue
				}
				// The cached Paystack recipient was built from the wrong code,
				// so it identifies the wrong destination and must go too.
				_ = db.Table("business_bank_account_details").
					Where("id = ?", a.ID).Update("paystack_recipient_code", "").Error
				fmt.Printf("      repaired, and the stale recipient code cleared\n")
			}
		}
	}

	fmt.Printf("\n%d account(s): %d correct, %d wrong, %d unresolved\n",
		len(accounts), ok, fixable, unresolved)
	if fixable > 0 && !*repair {
		fmt.Println("Nothing was changed. Re-run with `make bank-codes-repair` to apply.")
	}
	if unresolved > 0 {
		fmt.Println("Unresolved accounts cannot be paid until someone re-enters the bank.")
	}
}

func fetchBanks() (map[string]string, error) {
	base := strings.TrimRight(envOr("PAYSTACK_URL", "https://api.paystack.co"), "/")
	key := os.Getenv("PAYSTACK_AUTH")
	if key == "" {
		return nil, fmt.Errorf("PAYSTACK_AUTH is not set")
	}

	req, err := http.NewRequest(http.MethodGet, base+"/bank?currency=NGN&perPage=500", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+key)

	resp, err := (&http.Client{Timeout: 30 * time.Second}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Status bool `json:"status"`
		Data   []struct {
			Name string `json:"name"`
			Code string `json:"code"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if !parsed.Status {
		return nil, fmt.Errorf("paystack returned HTTP %d", resp.StatusCode)
	}

	banks := make(map[string]string, len(parsed.Data))
	for _, b := range parsed.Data {
		banks[normalise(b.Name)] = b.Code
	}
	return banks, nil
}

// normalise makes the name comparison forgiving of the things that differ
// cosmetically between what a seller picked and what Paystack returns, and
// nothing more. It does not do fuzzy matching: a near-miss should be reported
// for a human, not silently resolved to the closest bank.
func normalise(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = strings.NewReplacer("plc", "", "limited", "", "ltd", "", ".", "", ",", "", "-", " ").Replace(s)
	return strings.Join(strings.Fields(s), " ")
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n-1] + "…"
}
