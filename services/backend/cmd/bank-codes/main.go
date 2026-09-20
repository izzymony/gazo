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
// Both exit non-zero while anything is wrong or unresolved, because a clean
// audit is a go-live precondition and a gate that always succeeds is not a gate.
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

	"gorm.io/gorm"

	"github.com/Tinovalabs/vibaar/services/backend/internal/database"
)

// legacyRecipientKey is the jsonb key the orphaned transfer code cached
// recipients under, before the typed column existed. `existingRecipientCode`
// in the payments package still READS it as a fallback, so a repair that
// clears only the typed column leaves a recipient built from the wrong bank
// code live — which is the exact accident this command exists to prevent.
const legacyRecipientKey = "paystack_transfer_recipient_code"

type bank struct {
	Name string
	Code string
}

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
	fmt.Printf("Paystack lists %d NGN banks\n\n", countBanks(banks))

	db := database.ConnectDB()
	var accounts []account
	if err := db.Table("business_bank_account_details").
		Select("id, bank, bank_code").Find(&accounts).Error; err != nil {
		fmt.Printf("could not read bank accounts: %v\n", err)
		os.Exit(1)
	}

	var correct, wrong, repaired, failed, unresolved int
	for _, a := range accounts {
		candidates := banks[normalise(a.Bank)]

		switch {
		case len(candidates) == 0:
			unresolved++
			fmt.Printf("  ? %-32s code=%-10q no Paystack bank matches this name — needs a human\n",
				truncate(a.Bank, 32), a.BankCode)

		case len(candidates) > 1:
			// Never guess between two banks. Picking the wrong one sends this
			// seller's money to a different institution.
			unresolved++
			fmt.Printf("  ? %-32s code=%-10q AMBIGUOUS — %d Paystack banks share this name: %v\n",
				truncate(a.Bank, 32), a.BankCode, len(candidates), codesOf(candidates))

		case candidates[0].Code == a.BankCode:
			correct++

		default:
			wrong++
			want := candidates[0].Code
			fmt.Printf("  ! %-32s code=%-10q should be %q\n", truncate(a.Bank, 32), a.BankCode, want)
			if !*repair {
				continue
			}
			if err := applyRepair(db, a.ID, want); err != nil {
				failed++
				fmt.Printf("      repair FAILED, nothing changed for this account: %v\n", err)
				continue
			}
			repaired++
			fmt.Printf("      repaired to %q; recipient cleared in both the column and the legacy metadata\n", want)
		}
	}

	fmt.Printf("\n%d account(s): %d correct, %d wrong, %d unresolved",
		len(accounts), correct, wrong, unresolved)
	if *repair {
		fmt.Printf(" (%d repaired, %d failed)", repaired, failed)
	}
	fmt.Println()

	switch {
	case failed > 0:
		fmt.Println("RESULT: some repairs failed. Do not enable payouts.")
		os.Exit(1)
	case unresolved > 0:
		fmt.Println("RESULT: unresolved accounts cannot be paid until someone re-enters the bank.")
		os.Exit(1)
	case wrong > 0 && !*repair:
		fmt.Println("RESULT: nothing was changed. Run `make bank-codes-repair` to apply.")
		os.Exit(1)
	case wrong > 0:
		fmt.Println("RESULT: repaired. Re-run the audit to confirm.")
	default:
		fmt.Println("RESULT: every account's bank code matches Paystack.")
	}
}

// applyRepair writes the correct code and destroys BOTH cached recipients, in
// one transaction, and then proves it worked.
//
// All three parts have to land together. A recipient code identifies an account
// at Paystack, so one built from the wrong bank code points at the wrong
// destination; leaving either copy behind means the next payout reuses it and
// the corrected bank code is never consulted. The previous version updated the
// code, cleared the typed column with its error DISCARDED, and never touched
// the legacy jsonb key at all — so it could print "repaired" while payouts
// still went to the old recipient.
func applyRepair(db *gorm.DB, id, code string) error {
	return db.Transaction(func(tx *gorm.DB) error {
		res := tx.Exec(`
			UPDATE business_bank_account_details
			SET bank_code = ?,
			    paystack_recipient_code = '',
			    metadata = CASE jsonb_typeof(metadata)
			      WHEN 'array' THEN (
			        SELECT COALESCE(jsonb_agg(item - ?), '[]'::jsonb)
			        FROM jsonb_array_elements(metadata) AS item
			      )
			      -- Out of schema (the column is a MapArray) but seen in the
			      -- wild, and a live recipient in it is just as dangerous.
			      WHEN 'object' THEN metadata - ?
			      ELSE metadata
			    END
			WHERE id = ?`, code, legacyRecipientKey, legacyRecipientKey, id)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected != 1 {
			return fmt.Errorf("expected to update 1 row, updated %d", res.RowsAffected)
		}

		// Verified INSIDE the transaction so a failure rolls the whole thing
		// back. Checking afterwards left the bank code committed and the legacy
		// recipient alive while the command reported "nothing changed" — a
		// half-repaired account described as an untouched one.
		var after struct {
			BankCode    string
			Recipient   string
			MetadataRaw string
		}
		if err := tx.Raw(`
			SELECT bank_code,
			       COALESCE(paystack_recipient_code, '') AS recipient,
			       COALESCE(metadata::text, '')          AS metadata_raw
			FROM business_bank_account_details WHERE id = ?`, id).Scan(&after).Error; err != nil {
			return fmt.Errorf("could not verify the repair: %w", err)
		}
		if after.BankCode != code {
			return fmt.Errorf("bank_code is %q after the repair, want %q", after.BankCode, code)
		}
		if after.Recipient != "" {
			return fmt.Errorf("the typed recipient code survived: %q", after.Recipient)
		}
		if strings.Contains(after.MetadataRaw, legacyRecipientKey) {
			return fmt.Errorf("the legacy %s metadata key survived (metadata is %s); payouts "+
				"would still use the recipient built from the wrong bank code",
				legacyRecipientKey, jsonShape(after.MetadataRaw))
		}
		return nil
	})
}

// jsonShape describes the metadata well enough to act on without dumping a
// seller's whole blob into a log.
func jsonShape(raw string) string {
	trimmed := strings.TrimSpace(raw)
	switch {
	case trimmed == "" || trimmed == "null":
		return "null"
	case strings.HasPrefix(trimmed, "["):
		return "an array"
	case strings.HasPrefix(trimmed, "{"):
		return "an object"
	default:
		return "a scalar"
	}
}

// fetchBanks groups by normalised name rather than overwriting, so two banks
// that normalise alike are reported as ambiguous instead of one silently
// replacing the other. Paystack's NGN list has no such collision today —
// measured: 284 banks, 284 distinct normalised names — but it grows constantly,
// and the cost of being wrong is a seller's money at another institution.
func fetchBanks() (map[string][]bank, error) {
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
	if len(parsed.Data) == 0 {
		return nil, fmt.Errorf("paystack returned an empty bank list")
	}

	banks := make(map[string][]bank, len(parsed.Data))
	for _, b := range parsed.Data {
		name := normalise(b.Name)
		// The same bank listed twice with the SAME code is not ambiguity.
		if seen := banks[name]; len(seen) == 1 && seen[0].Code == b.Code {
			continue
		}
		banks[name] = append(banks[name], bank{Name: b.Name, Code: b.Code})
	}
	return banks, nil
}

// normalise makes the name comparison forgiving of the things that differ
// cosmetically between what a seller picked and what Paystack returns, and
// nothing more. It does not do fuzzy matching: a near-miss is reported for a
// human, not silently resolved to the closest bank.
func normalise(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = strings.NewReplacer("plc", "", "limited", "", "ltd", "", ".", "", ",", "", "-", " ").Replace(s)
	return strings.Join(strings.Fields(s), " ")
}

func countBanks(banks map[string][]bank) int {
	var n int
	for _, group := range banks {
		n += len(group)
	}
	return n
}

func codesOf(candidates []bank) []string {
	out := make([]string, 0, len(candidates))
	for _, c := range candidates {
		out = append(out, c.Code)
	}
	return out
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
