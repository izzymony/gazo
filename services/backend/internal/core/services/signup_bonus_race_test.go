package services

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/database"
	"github.com/Tinovalabs/vibaar/services/backend/internal/dberr"
)

// The signup bonus is guarded by the partial unique index from migration 013.
// When a concurrent call loses that race, CreditSignupBonus must treat it as
// success — but it must NOT swallow any other unique violation, which would
// hide a double credit on a money path.
//
// These cases are stated in terms of the SANITIZED error, because that is what
// the application now produces. The previous version of this test built raw
// *pgconn.PgError values only, so it kept passing after the repository boundary
// began discarding the constraint name and the driver message — while the real
// code path had stopped matching entirely. Every race loser would have surfaced
// as a failed signup. That is why the Postgres tests below exist beside it:
// a unit case can only assert what it was told the error looks like.
func TestIsSignupBonusRaceLoss(t *testing.T) {
	const idx = signupBonusIndex

	// sanitized returns what the boundary produces for a given driver error.
	sanitized := func(code, constraint string) error {
		return dberr.From(&pgconn.PgError{
			Code:           code,
			ConstraintName: constraint,
			// A driver message quoting a value, to confirm nothing downstream
			// needs it.
			Message: `duplicate key value violates unique constraint "` + constraint + `"`,
		}, "create")
	}

	cases := []struct {
		name string
		err  error
		want bool
	}{
		{"nil", nil, false},
		{
			name: "sanitized duplicate on our index — the race loss",
			err:  sanitized("23505", idx),
			want: true,
		},
		{
			name: "sanitized, then wrapped with %w by the service",
			err:  fmt.Errorf("failed to create signup bonus credit entry: %w", sanitized("23505", idx)),
			want: true,
		},
		{
			// The critical negative: another unique violation in the same
			// transaction must surface as a real error.
			name: "sanitized duplicate on a DIFFERENT constraint",
			err:  sanitized("23505", "idx_products_public_id"),
			want: false,
		},
		{
			name: "sanitized duplicate with no constraint name at all",
			err:  sanitized("23505", ""),
			want: false,
		},
		{
			name: "sanitized non-duplicate carrying our index name",
			err:  sanitized("23514", idx),
			want: false,
		},
		{
			// Accepted and reduced by dberr, so a caller never inspects pgconn.
			name: "an UNSANITIZED driver error, reduced by dberr",
			err:  &pgconn.PgError{Code: "23505", ConstraintName: idx},
			want: true,
		},
		{
			name: "a domain error is never a race loss",
			err:  errors.New("insufficient balance"),
			want: false,
		},
		{
			// It used to match this, by substring. It must not now: a message is
			// not evidence, and this one could be attacker-influenced text.
			name: "a string that merely NAMES the index",
			err:  errors.New(`duplicate key value violates unique constraint "` + idx + `"`),
			want: false,
		},
		{"unrelated error", errors.New("connection refused"), false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isSignupBonusRaceLoss(tc.err); got != tc.want {
				t.Fatalf("isSignupBonusRaceLoss(%v) = %v, want %v", tc.err, got, tc.want)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// The same question against real Postgres, through the real service.
// ---------------------------------------------------------------------------

var signupSchemaCounter atomic.Int64

// openSignupBonusDB builds a database that behaves as the application's does —
// sanitized logger, boundary registered — with the users and credit_entries
// tables and migration 013's partial unique index.
func openSignupBonusDB(t *testing.T) (*gorm.DB, string) {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set — a unique index rejecting a genuine " +
			"concurrent insert is the whole subject here, and sqlite has one " +
			"writer, so a green run would mean nothing")
	}

	schema := fmt.Sprintf("signup_race_%d_%d", os.Getpid(), signupSchemaCounter.Add(1))
	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: gormlogger.Discard})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	if err := admin.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() {
		admin.Exec("DROP SCHEMA " + schema + " CASCADE")
		if sqlDB, err := admin.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

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
		Logger:                                   gormlogger.Discard,
	})
	if err != nil {
		t.Fatalf("connect (scoped): %v", err)
	}
	if err := database.RegisterErrorSanitizer(db); err != nil {
		t.Fatalf("register sanitizer: %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	// credit_entries is AutoMigrated from the model the repository writes, so
	// the fixture cannot drift from it. users is hand-rolled: domain.User drags
	// most of the schema in behind its associations, and only one column here
	// is under test.
	if err := db.AutoMigrate(&domain.CreditEntry{}); err != nil {
		t.Fatalf("migrate credit_entries: %v", err)
	}
	if err := db.Exec(`CREATE TABLE users (
		id text PRIMARY KEY,
		shopping_credit numeric DEFAULT 0,
		withdrawable_credit numeric DEFAULT 0,
		firstname text, lastname text, phone text, email text,
		created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
	)`).Error; err != nil {
		t.Fatalf("create users: %v", err)
	}
	// Migration 013's guard, created by the LITERAL name the migration uses —
	// deliberately not from signupBonusIndex. Building the fixture from the
	// constant made the test agree with itself: renaming the constant renamed
	// the index too, so a branch pointing at a nonexistent index still passed.
	if err := db.Exec(`CREATE UNIQUE INDEX idx_credit_entries_one_signup_bonus_per_user
		ON credit_entries (user_id) WHERE type = 'signup_bonus'`).Error; err != nil {
		t.Fatalf("create partial unique index: %v", err)
	}

	userID := "user-signup-race"
	if err := db.Exec(`INSERT INTO users (id, shopping_credit) VALUES (?, 0)`, userID).Error; err != nil {
		t.Fatalf("seed user: %v", err)
	}
	return db, userID
}

func newSignupBonusService(db *gorm.DB) *ReferralService {
	return &ReferralService{
		repo:       mysql_repo.NewReferralRepository(db),
		db:         db,
		dispatcher: NewNotificationDispatcher(db),
	}
}

// The regression the review caught: a sanitized duplicate from
// idx_credit_entries_one_signup_bonus_per_user must be treated as the expected
// race loss, end to end.
//
// Two genuinely concurrent callers, released together, so one really does lose
// the index race. Without contention this test would pass however the branch
// was written.
func TestCreditSignupBonus_ConcurrentLoserIsTreatedAsSuccess(t *testing.T) {
	db, userID := openSignupBonusDB(t)
	service := newSignupBonusService(db)

	const callers = 2
	var (
		start   = make(chan struct{})
		ready   sync.WaitGroup
		done    sync.WaitGroup
		results = make([]error, callers)
	)
	ready.Add(callers)
	done.Add(callers)

	for i := 0; i < callers; i++ {
		go func(i int) {
			defer done.Done()
			ready.Done()
			<-start
			results[i] = service.CreditSignupBonus(userID)
		}(i)
	}
	ready.Wait()
	close(start)
	done.Wait()

	for i, err := range results {
		if err != nil {
			t.Errorf("caller %d returned an error; a race loser must be treated as "+
				"success or the user's signup fails: %v", i, err)
		}
	}

	// The money assertions: credited exactly once.
	var entries int64
	if err := db.Raw(`SELECT count(*) FROM credit_entries WHERE user_id = ? AND type = ?`,
		userID, domain.CreditTypeSignupBonus).Scan(&entries).Error; err != nil {
		t.Fatalf("count entries: %v", err)
	}
	if entries != 1 {
		t.Errorf("credit_entries = %d, want exactly 1", entries)
	}

	var credit float64
	if err := db.Raw(`SELECT shopping_credit FROM users WHERE id = ?`, userID).
		Scan(&credit).Error; err != nil {
		t.Fatalf("read credit: %v", err)
	}
	if credit != domain.SignupBonusAmount {
		t.Errorf("shopping_credit = %v, want %v — the loser's increment was not rolled back",
			credit, domain.SignupBonusAmount)
	}
}

// And the other half, which is what makes the branch safe rather than merely
// quiet: a unique violation on a DIFFERENT constraint must surface.
func TestCreditSignupBonus_OtherUniqueViolationIsNotSwallowed(t *testing.T) {
	db, userID := openSignupBonusDB(t)
	service := newSignupBonusService(db)

	// A second unique index that the insert will also violate. Stand-in for any
	// other constraint on this table; what matters is that it is NOT the
	// signup-bonus guard.
	if err := db.Exec(`CREATE UNIQUE INDEX idx_credit_entries_probe_description
		ON credit_entries (description)`).Error; err != nil {
		t.Fatalf("create probe index: %v", err)
	}
	// Occupy the description the service is about to write, for a DIFFERENT user
	// so the signup-bonus index is not the one that fires.
	if err := db.Exec(`INSERT INTO credit_entries (id, user_id, amount, remaining, type, source, description, created_at, updated_at)
		VALUES ('seed-1', 'someone-else', 1000, 1000, 'other', 'signup',
		'₦1,000 welcome bonus - thank you for joining Vibaar!', now(), now())`).Error; err != nil {
		t.Fatalf("seed conflicting row: %v", err)
	}

	err := service.CreditSignupBonus(userID)
	if err == nil {
		t.Fatal("CreditSignupBonus reported success on a unique violation that was " +
			"NOT the signup-bonus guard — a real failure was swallowed")
	}
	if isSignupBonusRaceLoss(err) {
		t.Error("the error was classified as a signup-bonus race loss")
	}
	// The failure is still contained: no driver text in the message.
	for _, banned := range []string{"SQLSTATE", "duplicate key value", "idx_credit_entries_probe_description"} {
		if strings.Contains(err.Error(), banned) {
			t.Errorf("the returned error leaks driver detail (%q): %v", banned, err)
		}
	}

	// And nothing was credited.
	var credit float64
	db.Raw(`SELECT shopping_credit FROM users WHERE id = ?`, userID).Scan(&credit)
	if credit != 0 {
		t.Errorf("shopping_credit = %v, want 0 — the transaction did not roll back", credit)
	}
}

// The constant must name the index migration 013 actually creates.
//
// isSignupBonusRaceLoss compares against a string; if the migration renames the
// index, or the constant drifts, the comparison silently stops matching and
// every race loser's signup fails. Nothing else would notice, so this reads the
// migration.
func TestSignupBonusIndex_MatchesMigration013(t *testing.T) {
	const migration = "../../migration/sql/013_one_signup_bonus_per_user.sql"

	sql, err := os.ReadFile(migration)
	if err != nil {
		t.Fatalf("read %s: %v", migration, err)
	}
	if !strings.Contains(string(sql), signupBonusIndex) {
		t.Errorf("%s does not create an index named %q.\n"+
			"isSignupBonusRaceLoss branches on that name, so a mismatch makes every "+
			"concurrent signup-bonus loser fail instead of succeeding.",
			migration, signupBonusIndex)
	}
	// And it is the guard that makes CreditSignupBonus safe, so it must be
	// UNIQUE and partial.
	for _, want := range []string{"CREATE UNIQUE INDEX", "signup_bonus"} {
		if !strings.Contains(string(sql), want) {
			t.Errorf("%s no longer contains %q", migration, want)
		}
	}
}
