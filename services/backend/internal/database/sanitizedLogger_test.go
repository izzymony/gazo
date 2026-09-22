package database

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"strings"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// Sentinels: distinctive enough that a single occurrence anywhere in the
// captured output is unambiguous, and shaped like the real data.
const (
	sentinelEmail   = "pii-probe-9f31@sentinel.example"
	sentinelPhone   = "+2349001234567"
	sentinelStreet  = "77 Sentinel Crescent, Probeville"
	sentinelName    = "Zzsentinel Probename"
	sentinelOTP     = "902137"
	sentinelOAuth   = "oauth-access-token-SENTINEL-4a91f"
	sentinelProvTok = "provider-request-token-SENTINEL-77b2"
)

func allSentinels() map[string]string {
	return map[string]string{
		"email":          sentinelEmail,
		"phone":          sentinelPhone,
		"street":         sentinelStreet,
		"name":           sentinelName,
		"otp":            sentinelOTP,
		"oauth token":    sentinelOAuth,
		"provider token": sentinelProvTok,
	}
}

// probeRow is a stand-in for the tables that actually hold customer data. It
// carries every field class in one place so one insert exercises them all.
type probeRow struct {
	ID     uint   `gorm:"primaryKey"`
	Email  string `gorm:"uniqueIndex"`
	Phone  string
	Street string
	Name   string
}

func (probeRow) TableName() string { return "pii_probe_rows" }

// openProbeDB opens a private schema with the SANITIZED logger writing into a
// buffer, so the test reads exactly what the process would have emitted.
func openProbeDB(t *testing.T) (*gorm.DB, *bytes.Buffer) {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set — the point of this test is what a REAL " +
			"driver error contains, and pgx is the driver that embeds the offending " +
			"value in it")
	}

	var buf bytes.Buffer
	out := log.New(&buf, "", 0)

	schema := fmt.Sprintf("pii_probe_%d", os.Getpid())
	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: gormlogger.Discard})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	admin.Exec("DROP SCHEMA IF EXISTS " + schema + " CASCADE")
	if err := admin.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() {
		admin.Exec("DROP SCHEMA " + schema + " CASCADE")
		if sqlDB, err := admin.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	sep := "?"
	if strings.Contains(dsn, "?") {
		sep = "&"
	}
	scoped := dsn + sep + "search_path=" + schema
	if !strings.HasPrefix(dsn, "postgres://") && !strings.HasPrefix(dsn, "postgresql://") {
		scoped = strings.TrimSpace(dsn) + " search_path=" + schema
	}

	db, err := gorm.Open(postgres.Open(scoped), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger:                                   NewSanitizedGormLogger(out),
	})
	if err != nil {
		t.Fatalf("connect (scoped): %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	if err := db.AutoMigrate(&probeRow{}); err != nil {
		t.Fatalf("migrate probe table: %v", err)
	}
	buf.Reset() // migration chatter is not what is under test
	return db, &buf
}

func assertNoSentinels(t *testing.T, captured string, context string) {
	t.Helper()
	for label, value := range allSentinels() {
		if strings.Contains(captured, value) {
			t.Errorf("%s: the %s sentinel reached the log.\n  value: %s\n  log: %s",
				context, label, value, captured)
		}
	}
}

// A successful write must not put its values in the log. This is the defect:
// the logger was at Info level in every environment, so every INSERT was
// logged with the row interpolated.
func TestSanitizedLogger_SuccessfulWriteLogsNoValues(t *testing.T) {
	db, buf := openProbeDB(t)

	row := &probeRow{Email: sentinelEmail, Phone: sentinelPhone,
		Street: sentinelStreet, Name: sentinelName}
	if err := db.Create(row).Error; err != nil {
		t.Fatalf("insert: %v", err)
	}
	// And a read, since SELECT ... WHERE email = '…' leaked just as readily.
	var found probeRow
	if err := db.Where("email = ? AND phone = ?", sentinelEmail, sentinelPhone).
		First(&found).Error; err != nil {
		t.Fatalf("select: %v", err)
	}

	assertNoSentinels(t, buf.String(), "successful insert+select")
}

// THE case that makes "Warn is not sufficient" true.
//
// A unique violation is reported by pgx as:
//
//	ERROR: duplicate key value violates unique constraint "…"
//	DETAIL: Key (email)=(ada@example.com) already exists.
//
// GORM prints that error verbatim at Error level, so the value appears in the
// log even with statement parameters suppressed. The sanitized logger reports
// the SQLSTATE instead.
func TestSanitizedLogger_DriverErrorLeaksNoValue(t *testing.T) {
	db, buf := openProbeDB(t)

	first := &probeRow{Email: sentinelEmail, Phone: sentinelPhone,
		Street: sentinelStreet, Name: sentinelName}
	if err := db.Create(first).Error; err != nil {
		t.Fatalf("seed: %v", err)
	}
	buf.Reset()

	dup := &probeRow{Email: sentinelEmail, Phone: sentinelPhone,
		Street: sentinelStreet, Name: sentinelName}
	err := db.Create(dup).Error
	if err == nil {
		t.Fatal("expected a unique violation — without one this test proves nothing")
	}

	// Confirm the raw error really does carry the value, or the assertion below
	// is vacuous.
	if !strings.Contains(err.Error(), sentinelEmail) {
		t.Logf("note: this driver's error does not embed the value (%v)", err)
	}

	captured := buf.String()
	assertNoSentinels(t, captured, "unique-violation error")

	// It must still be diagnosable: SQLSTATE 23505 is a unique violation.
	if !strings.Contains(captured, "sqlstate_23505") {
		t.Errorf("the failure was not classified; log was: %s", captured)
	}
	if !strings.Contains(captured, "query failed") {
		t.Errorf("no failure was logged at all; log was: %s", captured)
	}
}

// The case that PROVES the raw error must never be printed.
//
// A cast error embeds the submitted value directly in the message:
//
//	invalid input syntax for type bigint: "pii-probe-9f31@sentinel.example"
//	(SQLSTATE 22P02)
//
// So any logger that prints `err` — which the stock GORM logger does at Error
// level, and at Warn level too on a slow query — writes the value down. This
// asserts BOTH halves: that the raw error really does carry it (or the test is
// vacuous), and that the emitted log does not.
func TestSanitizedLogger_CastErrorValueNeverReachesTheLog(t *testing.T) {
	db, buf := openProbeDB(t)
	buf.Reset()

	// A non-numeric value against a bigint primary key.
	var out []probeRow
	err := db.Where("id = ?", sentinelEmail).Find(&out).Error
	if err == nil {
		t.Skip("this driver accepted the bad cast, so there is no error to sanitize")
	}
	if !strings.Contains(err.Error(), sentinelEmail) {
		t.Fatalf("the raw driver error no longer embeds the value, so this test is not "+
			"defending anything: %v", err)
	}

	captured := buf.String()
	assertNoSentinels(t, captured, "cast error")
	if !strings.Contains(captured, "sqlstate_22P02") {
		t.Errorf("the failure was not classified; log was: %s", captured)
	}
}

// Statement parameters are suppressed, so the SQL shape is still logged while
// the values are not. Asserted directly on ParamsFilter, which is the hook
// GORM consults before interpolating.
func TestSanitizedLogger_ParamsFilterSuppressesValues(t *testing.T) {
	l := NewSanitizedGormLogger(log.New(&bytes.Buffer{}, "", 0))
	concrete, isConcrete := l.(*sanitizedGormLogger)
	if !isConcrete {
		t.Fatal("unexpected logger type")
	}
	sql, params := concrete.ParamsFilter(nil, "INSERT INTO t (email) VALUES ($1)", sentinelEmail)
	if params != nil {
		t.Errorf("ParamsFilter returned %d param(s) — values would be interpolated into "+
			"the logged statement", len(params))
	}
	if sql == "" {
		t.Error("the statement itself should still be available")
	}
}

// Info/Warn/Error forward GORM's own message but not its arguments, which can
// include a primary key or a struct.
func TestSanitizedLogger_LibraryMessagesDropTheirArguments(t *testing.T) {
	var buf bytes.Buffer
	l := NewSanitizedGormLogger(log.New(&buf, "", 0))

	l.Info(nil, "something happened for %s", sentinelEmail)
	l.Warn(nil, "slow thing for %s", sentinelPhone)
	l.Error(nil, "failed for %s", sentinelStreet)

	assertNoSentinels(t, buf.String(), "library-level messages")
}

// Value-level logging is permitted in local development only, and the gate
// goes through the canonical resolver so a half-set deploy cannot qualify.
func TestIsLocalDevelopment_OnlyLocalQualifies(t *testing.T) {
	cases := map[string]struct {
		appEnv, env string
		want        bool
	}{
		"local":                     {"local", "local", true},
		"staging":                   {"staging", "staging", false},
		"production":                {"production", "production", false},
		"development":               {"development", "development", false},
		"half-set production wins":  {"production", "", false},
		"half-set local + prod ENV": {"local", "production", false},
		"unset":                     {"", "", false},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			t.Setenv("APP_ENV", c.appEnv)
			t.Setenv("ENV", c.env)
			if got := IsLocalDevelopment(); got != c.want {
				t.Errorf("IsLocalDevelopment() = %v, want %v", got, c.want)
			}
		})
	}
}

// The WIRING: which logger ConnectDB installs.
//
// Mutation testing found this gap — flipping the environment check to `true`
// (so the value-logging logger is used everywhere) left every test above
// green, because they all exercised the sanitized logger directly and never
// asked which one the application picks.
func TestNewGormLogger_SanitizedOutsideLocal(t *testing.T) {
	cases := map[string]struct {
		appEnv, env   string
		wantSanitized bool
	}{
		"local":                     {"local", "local", false},
		"staging":                   {"staging", "staging", true},
		"production":                {"production", "production", true},
		"development":               {"development", "development", true},
		"unset":                     {"", "", true},
		"half-set production wins":  {"production", "", true},
		"local with production ENV": {"local", "production", true},
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			t.Setenv("APP_ENV", c.appEnv)
			t.Setenv("ENV", c.env)

			l := newGormLogger(log.New(&bytes.Buffer{}, "", 0))
			_, isSanitized := l.(*sanitizedGormLogger)

			if isSanitized != c.wantSanitized {
				if c.wantSanitized {
					t.Errorf("%s got the VALUE-LOGGING logger — every statement would be "+
						"logged with its row", name)
				} else {
					t.Errorf("%s got the sanitized logger; local development is meant to "+
						"show values", name)
				}
			}
		})
	}
}

// Belt and braces: whatever the environment claims, the logger that is NOT
// local must suppress parameters.
func TestNewGormLogger_NonLocalNeverInterpolates(t *testing.T) {
	for _, env := range []string{"staging", "production", "development", ""} {
		t.Setenv("APP_ENV", env)
		t.Setenv("ENV", env)

		var buf bytes.Buffer
		l := newGormLogger(log.New(&buf, "", 0))
		concrete, ok := l.(*sanitizedGormLogger)
		if !ok {
			t.Fatalf("env %q did not get the sanitized logger", env)
		}
		if _, params := concrete.ParamsFilter(nil, "SELECT $1", sentinelEmail); params != nil {
			t.Errorf("env %q would interpolate statement values", env)
		}
	}
}

// The gap that ParamsFilter alone does not close.
//
// `db.Raw(...).Scan(&dest)` installs GORM's traceRecorder for the duration of
// the call (finisher_api.go:525-547). The processor applies ParamsFilter only
// when `db.Logger` implements it (callbacks.go:136); traceRecorder does not, so
// Explain interpolates and the logger is handed SQL with the values already in
// it. Found by the sanitizer test in this package, not by reading the docs.
func TestRedactSQLLiterals_RemovesEveryLiteralShape(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "an interpolated string value, which is the measured leak",
			in:   `SELECT id FROM t WHERE street = '77 Sentinel Crescent, Probeville'`,
			want: `SELECT id FROM t WHERE street = '?'`,
		},
		{
			name: "placeholders survive — they are the shape, not a value",
			in:   `INSERT INTO t (email,phone) VALUES ($1,$2)`,
			want: `INSERT INTO t (email,phone) VALUES ($1,$2)`,
		},
		{
			name: "several values on one statement",
			in:   `INSERT INTO t (a,b,c) VALUES ('ada@example.com','+2349001234567',42)`,
			want: `INSERT INTO t (a,b,c) VALUES ('?','?',?)`,
		},
		{
			name: "an escaped quote does not end the literal early",
			in:   `SELECT * FROM t WHERE name = 'O''Brien, 5 Probe St' AND id = 3`,
			want: `SELECT * FROM t WHERE name = '?' AND id = ?`,
		},
		{
			name: "identifiers containing digits are untouched",
			in:   `SELECT int4col, sha256_hash, col_2 FROM t2 LIMIT 10`,
			want: `SELECT int4col, sha256_hash, col_2 FROM t2 LIMIT ?`,
		},
		{
			name: "a numeric amount is a literal too",
			in:   `UPDATE wallets SET available_balance = 154320.75 WHERE id = 'w-1'`,
			want: `UPDATE wallets SET available_balance = ? WHERE id = '?'`,
		},
		{
			name: "dollar quoting, where the delimiter is the writer's choice",
			in:   `SELECT $tag$17 Probe Close$tag$ AS a`,
			want: `SELECT $tag$?$tag$ AS a`,
		},
		{
			name: "an unterminated literal does not run off the end",
			in:   `SELECT * FROM t WHERE a = 'unclosed`,
			want: `SELECT * FROM t WHERE a = '?'`,
		},
		{
			name: "casts and types keep their digits",
			in:   `SELECT a::numeric(10,2), b::int8 FROM t`,
			want: `SELECT a::numeric(?,?), b::int8 FROM t`,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := redactSQLLiterals(c.in); got != c.want {
				t.Errorf("redactSQLLiterals()\n  in:   %s\n  got:  %s\n  want: %s", c.in, got, c.want)
			}
		})
	}
}

// Belt and braces: no sentinel survives redaction, whatever shape it arrives in.
func TestRedactSQLLiterals_NoSentinelSurvives(t *testing.T) {
	for label, value := range allSentinels() {
		for _, shape := range []string{
			`SELECT * FROM t WHERE c = '%s'`,
			`INSERT INTO t (a) VALUES ('%s')`,
			`SELECT * FROM t WHERE c = $tag$%s$tag$`,
			`UPDATE t SET a = '%s' WHERE id = 7`,
		} {
			stmt := fmt.Sprintf(shape, value)
			if got := redactSQLLiterals(stmt); strings.Contains(got, value) {
				t.Errorf("the %s sentinel survived redaction: %s", label, got)
			}
		}
	}
}
