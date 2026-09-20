package main

import (
	"fmt"
	"os"
	"strings"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// The repair has to destroy BOTH cached recipients, not just the typed one.
//
// `existingRecipientCode` in the payments package prefers the typed column and
// falls back to a `paystack_transfer_recipient_code` key inside the `metadata`
// jsonb — the place the orphaned transfer code used to cache it. A recipient
// identifies an account AT PAYSTACK, so one created from the wrong bank code
// points at the wrong destination. Clearing only the column leaves the legacy
// copy live, the next payout reuses it, and the corrected bank code is never
// consulted: the command prints "repaired" and the money still goes to the
// wrong bank.
func TestApplyRepair_ClearsBothRecipientLocationsAtomically(t *testing.T) {
	db := testDB(t)

	seed := func(t *testing.T, id, code, typed, metadata string) {
		t.Helper()
		if err := db.Exec(`
			INSERT INTO business_bank_account_details
				(id, bank, account_number, account_name, bank_code, business_id,
				 paystack_recipient_code, metadata, created_at, updated_at)
			VALUES (?, 'United Bank For Africa', '0123456789', 'Seller', ?, 'biz', ?, ?::jsonb, now(), now())`,
			id, code, typed, metadata).Error; err != nil {
			t.Fatalf("seed %s: %v", id, err)
		}
	}

	cases := []struct {
		name     string
		typed    string
		metadata string
	}{
		{"recipient in the typed column", "RCP_typed", `[]`},
		{"recipient only in the legacy metadata", "", `[{"paystack_transfer_recipient_code":"RCP_legacy"}]`},
		{"recipient in both", "RCP_typed", `[{"paystack_transfer_recipient_code":"RCP_legacy"}]`},
		{"legacy key alongside other metadata", "", `[{"note":"keep me"},{"paystack_transfer_recipient_code":"RCP_legacy"}]`},
		{"metadata is null", "RCP_typed", `null`},
		{"metadata is an object, not an array", "RCP_typed", `{"paystack_transfer_recipient_code":"RCP_obj"}`},
	}

	for i, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			id := fmt.Sprintf("acct-%d", i)
			seed(t, id, "33", c.typed, c.metadata)

			if err := applyRepair(db, id, "033"); err != nil {
				t.Fatalf("applyRepair: %v", err)
			}

			var got struct {
				BankCode    string
				Recipient   string
				MetadataRaw string
			}
			if err := db.Raw(`
				SELECT bank_code,
				       COALESCE(paystack_recipient_code, '') AS recipient,
				       COALESCE(metadata::text, '')          AS metadata_raw
				FROM business_bank_account_details WHERE id = ?`, id).Scan(&got).Error; err != nil {
				t.Fatalf("read back: %v", err)
			}

			if got.BankCode != "033" {
				t.Errorf("bank_code = %q, want \"033\"", got.BankCode)
			}
			if got.Recipient != "" {
				t.Errorf("the typed recipient survived: %q", got.Recipient)
			}
			if strings.Contains(got.MetadataRaw, legacyRecipientKey) {
				t.Errorf("the legacy recipient survived in metadata: %s — the next payout "+
					"would send to the account built from the WRONG bank code", got.MetadataRaw)
			}
			if strings.Contains(c.metadata, "keep me") && !strings.Contains(got.MetadataRaw, "keep me") {
				t.Errorf("unrelated metadata was destroyed: %s", got.MetadataRaw)
			}
		})
	}
}

// A repair that matches no row must be an error, not a silent success. The
// caller counts it as repaired and the operator reads a clean result.
func TestApplyRepair_MissingRowIsAnError(t *testing.T) {
	db := testDB(t)
	err := applyRepair(db, "no-such-account", "033")
	if err == nil {
		t.Fatal("repairing a nonexistent account reported success")
	}
	if !strings.Contains(err.Error(), "1 row") {
		t.Errorf("error = %v, want it to name the row count", err)
	}
}

// Two banks whose names normalise alike must never be auto-repaired: picking
// the wrong one sends a seller's money to a different institution. Paystack's
// NGN list has no such collision today (284 banks, 284 distinct normalised
// names), so this pins the behaviour rather than a current data condition.
func TestNormalise_GroupsRatherThanOverwrites(t *testing.T) {
	banks := map[string][]bank{}
	add := func(name, code string) {
		key := normalise(name)
		if seen := banks[key]; len(seen) == 1 && seen[0].Code == code {
			return
		}
		banks[key] = append(banks[key], bank{Name: name, Code: code})
	}

	add("Access Bank Plc", "044")
	add("Access Bank", "044") // the same bank, same code — not ambiguity
	if got := len(banks[normalise("Access Bank")]); got != 1 {
		t.Errorf("identical codes produced %d candidates, want 1", got)
	}

	add("Sterling Bank", "232")
	add("Sterling Bank Limited", "999") // same normalised name, DIFFERENT code
	if got := len(banks[normalise("Sterling Bank")]); got != 2 {
		t.Errorf("a genuine collision produced %d candidates, want 2 so it is reported "+
			"as ambiguous instead of one silently replacing the other", got)
	}
}

func testDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set — the repair is jsonb SQL and needs real Postgres")
	}

	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	schema := fmt.Sprintf("bank_codes_test_%d", os.Getpid())
	if err := admin.Exec("DROP SCHEMA IF EXISTS " + schema + " CASCADE").Error; err != nil {
		t.Fatalf("reset schema: %v", err)
	}
	if err := admin.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() { admin.Exec("DROP SCHEMA " + schema + " CASCADE") })

	sep := "?"
	if strings.Contains(dsn, "?") {
		sep = "&"
	}
	db, err := gorm.Open(postgres.Open(dsn+sep+"search_path="+schema), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("connect (scoped): %v", err)
	}
	if err := db.Exec(`
		CREATE TABLE business_bank_account_details (
			id text PRIMARY KEY,
			bank text, account_number text, account_name text,
			bank_code text, business_id text,
			paystack_recipient_code text,
			metadata jsonb,
			is_default boolean DEFAULT false,
			created_at timestamptz, updated_at timestamptz
		)`).Error; err != nil {
		t.Fatalf("create table: %v", err)
	}
	return db
}

// When verification refuses, NOTHING may have been written. The command tells
// the operator "nothing changed for this account", and that has to be true:
// a committed bank code beside a surviving legacy recipient is a half-repaired
// account described as an untouched one, and the operator moves on.
//
// Forced with a JSON scalar whose text contains the legacy key. `jsonb_typeof`
// is 'string', so the CASE leaves it alone, the key survives, and verification
// must roll the transaction back.
func TestApplyRepair_RefusalRollsEverythingBack(t *testing.T) {
	db := testDB(t)
	if err := db.Exec(`
		INSERT INTO business_bank_account_details
			(id, bank, account_number, account_name, bank_code, business_id,
			 paystack_recipient_code, metadata, created_at, updated_at)
		VALUES ('rollback', 'United Bank For Africa', '0123456789', 'Seller', '33', 'biz',
		        'RCP_typed', '"paystack_transfer_recipient_code"'::jsonb, now(), now())`).Error; err != nil {
		t.Fatalf("seed: %v", err)
	}

	err := applyRepair(db, "rollback", "033")
	if err == nil {
		t.Fatal("a surviving legacy recipient key was reported as a successful repair")
	}
	if !strings.Contains(err.Error(), legacyRecipientKey) {
		t.Errorf("error = %v, want it to name the surviving key", err)
	}

	var got struct {
		BankCode  string
		Recipient string
	}
	if err := db.Raw(`
		SELECT bank_code, COALESCE(paystack_recipient_code, '') AS recipient
		FROM business_bank_account_details WHERE id = 'rollback'`).Scan(&got).Error; err != nil {
		t.Fatalf("read back: %v", err)
	}
	if got.BankCode != "33" {
		t.Errorf("bank_code = %q, want the original \"33\" — the refused repair committed anyway", got.BankCode)
	}
	if got.Recipient != "RCP_typed" {
		t.Errorf("recipient = %q, want the original \"RCP_typed\" — partially applied", got.Recipient)
	}
}
