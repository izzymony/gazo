package mysql_repo

import (
	"fmt"
	"os"
	"strings"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

// Status filtering and the tab badges, which were both wrong in ways the admin
// could not see:
//
//   - the client sent `status` and the handler ignored it, so every filter
//     returned the same unfiltered page;
//   - the badges counted the 20 rows just fetched, so they were wrong past page
//     one and read 0 for every group once a filter was active.
//
// Both need real Postgres: the filter is a WHERE ... IN and the badges are a
// GROUP BY, and the point of the tallies is that they are computed by the
// database over the whole table rather than in the client.
func withdrawalTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set — this covers a WHERE...IN and a GROUP BY")
	}

	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	schema := fmt.Sprintf("wdfilter_test_%d", os.Getpid())
	admin.Exec("DROP SCHEMA IF EXISTS " + schema + " CASCADE")
	if err := admin.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() { admin.Exec("DROP SCHEMA " + schema + " CASCADE") })

	// A keyword DSN takes a space, a URL DSN takes `?`. Getting this wrong is
	// silent locally and fatal in CI, which is how 13 payout tests once broke.
	scoped := dsn
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		sep := "?"
		if strings.Contains(dsn, "?") {
			sep = "&"
		}
		scoped = dsn + sep + "search_path=" + schema
	} else {
		scoped = strings.TrimSpace(dsn) + " search_path=" + schema
	}

	db, err := gorm.Open(postgres.Open(scoped), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger:                                   logger.Discard,
	})
	if err != nil {
		t.Fatalf("connect (scoped): %v", err)
	}
	if err := db.AutoMigrate(&domain.WithdrawalRequest{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

// Deliberately more rows than one page, because page-size was the bug.
func seedWithdrawals(t *testing.T, db *gorm.DB) {
	t.Helper()
	plan := map[string]int{
		"requested":    25,
		"pending":      3,
		"processing":   12,
		"awaiting_otp": 1,
		"paid":         30,
		"completed":    4,
		"failed":       5,
		"blocked":      1,
		"reversed":     2,
		"needs_review": 2,
		"rejected":     6,
	}
	for status, n := range plan {
		for i := 0; i < n; i++ {
			row := &domain.WithdrawalRequest{
				UserID: "u1", WalletID: "w1", Amount: 100,
				Status: status, Reference: fmt.Sprintf("%s-%d", status, i),
			}
			if err := db.Create(row).Error; err != nil {
				t.Fatalf("seed %s: %v", status, err)
			}
		}
	}
}

func TestGetAll_FiltersByStatus(t *testing.T) {
	db := withdrawalTestDB(t)
	seedWithdrawals(t, db)
	repo := NewWithdrawalRequestRepository(db)

	t.Run("no filter returns everything", func(t *testing.T) {
		rows, total, err := repo.GetAll(20, 0, nil)
		if err != nil {
			t.Fatalf("GetAll: %v", err)
		}
		if total != 91 {
			t.Errorf("total = %d, want 91 (the whole table, not the page)", total)
		}
		if len(rows) != 20 {
			t.Errorf("returned %d rows, want the page size 20", len(rows))
		}
	})

	t.Run("a single status returns only that status", func(t *testing.T) {
		rows, total, err := repo.GetAll(100, 0, []string{"paid"})
		if err != nil {
			t.Fatalf("GetAll: %v", err)
		}
		if total != 30 {
			t.Errorf("total = %d, want 30", total)
		}
		for _, r := range rows {
			if r.Status != "paid" {
				t.Fatalf("filter leaked a %q row — this is the bug where every tab "+
					"returned the same unfiltered page", r.Status)
			}
		}
	})

	t.Run("a group returns exactly its statuses", func(t *testing.T) {
		group := []string{"failed", "blocked", "reversed", "needs_review"}
		rows, total, err := repo.GetAll(100, 0, group)
		if err != nil {
			t.Fatalf("GetAll: %v", err)
		}
		if total != 10 {
			t.Errorf("total = %d, want 10 (5+1+2+2)", total)
		}
		allowed := map[string]bool{}
		for _, s := range group {
			allowed[s] = true
		}
		for _, r := range rows {
			if !allowed[r.Status] {
				t.Errorf("unexpected status %q in the needs-attention group", r.Status)
			}
		}
	})

	t.Run("total is counted WITH the filter, so the pager does not lie", func(t *testing.T) {
		_, total, err := repo.GetAll(5, 0, []string{"requested", "pending"})
		if err != nil {
			t.Fatalf("GetAll: %v", err)
		}
		if total != 28 {
			t.Errorf("total = %d, want 28 — counting without the filter would report 91 "+
				"and the admin would page through empty screens", total)
		}
	})

	t.Run("paging inside a filter stays inside it", func(t *testing.T) {
		rows, _, err := repo.GetAll(10, 20, []string{"paid"})
		if err != nil {
			t.Fatalf("GetAll: %v", err)
		}
		if len(rows) != 10 {
			t.Errorf("page 3 of paid returned %d rows, want 10", len(rows))
		}
		for _, r := range rows {
			if r.Status != "paid" {
				t.Fatalf("offset paging leaked a %q row", r.Status)
			}
		}
	})
}

func TestCountsByStatus_SpansTheWholeTable(t *testing.T) {
	db := withdrawalTestDB(t)
	seedWithdrawals(t, db)
	repo := NewWithdrawalRequestRepository(db)

	tallies, err := repo.CountsByStatus()
	if err != nil {
		t.Fatalf("CountsByStatus: %v", err)
	}

	got := map[string]int64{}
	amounts := map[string]float64{}
	for _, tl := range tallies {
		got[tl.Status] = tl.Count
		amounts[tl.Status] = tl.Amount
	}

	want := map[string]int64{
		"requested": 25, "pending": 3, "processing": 12, "awaiting_otp": 1,
		"paid": 30, "completed": 4, "failed": 5, "blocked": 1,
		"reversed": 2, "needs_review": 2, "rejected": 6,
	}
	for status, n := range want {
		if got[status] != n {
			t.Errorf("count[%s] = %d, want %d", status, got[status], n)
		}
		if amounts[status] != float64(n)*100 {
			t.Errorf("amount[%s] = %v, want %v", status, amounts[status], float64(n)*100)
		}
	}

	var sum int64
	for _, n := range got {
		sum += n
	}
	if sum != 91 {
		t.Errorf("tallies sum to %d, want 91", sum)
	}
	// The whole point: more than one page, so the old page-scoped counting
	// could never have produced these numbers.
	if sum <= 20 {
		t.Error("the fixture no longer exceeds one page, so this proves nothing")
	}
}
