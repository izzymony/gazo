package database

import (
	"bytes"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"sync/atomic"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/Tinovalabs/vibaar/services/backend/internal/dberr"
)

// The sanitizer against real Postgres.
//
// Postgres is not optional here. What is under test is what a DRIVER puts in
// an error message, which is the only reason this change exists — a fabricated
// error would prove that dberr can reduce a string I wrote myself. So each
// case opens TWO handles on the same schema: one with the sanitizer registered
// and one without, runs the identical failing statement on both, and asserts
// that the raw handle LEAKS the sentinel while the sanitized one does not.
//
// The raw assertion is the part that keeps this honest. Three tests in this
// project have already been caught passing vacuously, and a sentinel that was
// never in the driver message to begin with is exactly that failure: the
// absence assertion would hold no matter how the sanitizer was written.

// The sentinels are the ones sanitizedLogger_test.go already defines —
// sentinelEmail, sentinelPhone, sentinelStreet, sentinelProvTok — so this
// package has ONE sentinel vocabulary and a value proven absent from the log
// is the same value proven absent from the error.

var sanitizerSchemaCounter atomic.Int64

// sanitizerFixture is one private schema plus the two handles onto it.
type sanitizerFixture struct {
	sanitized *gorm.DB
	raw       *gorm.DB // no sanitizer: used to prove the leak is real
	gormLog   *bytes.Buffer
}

func newSanitizerFixture(t *testing.T) *sanitizerFixture {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set — what a pgx error puts in its " +
			"message is the whole subject of this test, and sqlite would " +
			"produce different text, so a green run here would mean nothing")
	}

	schema := fmt.Sprintf("dberr_%d_%d", os.Getpid(), sanitizerSchemaCounter.Add(1))
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

	scoped := sanitizerSearchPath(dsn, schema)

	// The sanitized handle is built the way ConnectDB builds the real one:
	// the sanitized logger, then RegisterErrorSanitizer. Anything less and the
	// test would be exercising a configuration that does not ship.
	gormLog := &bytes.Buffer{}
	sanitized, err := gorm.Open(postgres.Open(scoped), &gorm.Config{
		Logger: NewSanitizedGormLogger(log.New(gormLog, "", 0)),
	})
	if err != nil {
		t.Fatalf("connect (sanitized): %v", err)
	}
	if err := RegisterErrorSanitizer(sanitized); err != nil {
		t.Fatalf("register sanitizer: %v", err)
	}

	raw, err := gorm.Open(postgres.Open(scoped), &gorm.Config{Logger: gormlogger.Discard})
	if err != nil {
		t.Fatalf("connect (raw): %v", err)
	}

	t.Cleanup(func() {
		for _, db := range []*gorm.DB{sanitized, raw} {
			if sqlDB, err := db.DB(); err == nil {
				_ = sqlDB.Close()
			}
		}
	})

	f := &sanitizerFixture{sanitized: sanitized, raw: raw, gormLog: gormLog}
	f.createSchema(t)
	return f
}

// createSchema builds a table shaped like the one the staging leak came
// through: a shipping profile keyed by a UUID, with a typed numeric column. The
// types are what make a submitted string fail in a way that QUOTES it back.
func (f *sanitizerFixture) createSchema(t *testing.T) {
	t.Helper()
	stmts := []string{
		`CREATE TABLE owners (id uuid PRIMARY KEY)`,
		`CREATE TABLE probe_profiles (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			owner_id uuid REFERENCES owners(id),
			email text NOT NULL,
			phone text,
			street text,
			postcode numeric,
			CONSTRAINT probe_phone_len CHECK (phone IS NULL OR length(phone) <= 40)
		)`,
		`CREATE UNIQUE INDEX probe_profiles_email_key ON probe_profiles (email)`,
	}
	for _, s := range stmts {
		if err := f.raw.Exec(s).Error; err != nil {
			t.Fatalf("fixture: %v", err)
		}
	}
}

func sanitizerSearchPath(dsn, schema string) string {
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		sep := "?"
		if strings.Contains(dsn, "?") {
			sep = "&"
		}
		return dsn + sep + "search_path=" + schema
	}
	return strings.TrimSpace(dsn) + " search_path=" + schema
}

// requireLeak proves the case is real: the UNSANITIZED error must contain the
// sentinel, or the absence assertion beside it proves nothing.
func requireLeak(t *testing.T, sentinel string, err error) {
	t.Helper()
	if err == nil {
		t.Fatal("the statement did not fail — the fixture no longer reproduces " +
			"a driver error, so nothing here is under test")
	}
	if !strings.Contains(err.Error(), sentinel) {
		t.Fatalf("the UNSANITIZED driver error does not contain the sentinel, so "+
			"this case cannot demonstrate containment. Driver said: %q", err.Error())
	}
}

// The measured case from staging: a submitted value that the column's type
// rejects, and pgx quotes the value back inside the message.
func TestSanitizer_CastErrorDoesNotLeakTheSubmittedValue(t *testing.T) {
	f := newSanitizerFixture(t)

	// numeric = 'an address' → 22P02, with the address inside the message.
	const q = `SELECT id FROM probe_profiles WHERE postcode = ?`

	var out []string
	rawErr := f.raw.Raw(q, sentinelStreet).Scan(&out).Error
	requireLeak(t, sentinelStreet, rawErr)

	sanErr := f.sanitized.Raw(q, sentinelStreet).Scan(&out).Error
	if sanErr == nil {
		t.Fatal("the sanitized handle did not report the failure at all")
	}

	// Surface 1: the error the repository returns, and everything built from it.
	assertNoSentinels(t, sanErr.Error(), "err.Error()")
	assertNoSentinels(t, fmt.Sprintf("%v", sanErr), "%v")
	// Services wrap with %v and %w on this path — shippingService.go does both.
	assertNoSentinels(t, fmt.Errorf("error checking existing addresses: %v", sanErr).Error(), "service wrap")
	assertNoSentinels(t, fmt.Errorf("lookup failed: %w", sanErr).Error(), "service %w wrap")

	// Surface 2: the GORM logger.
	assertNoSentinels(t, f.gormLog.String(), "gorm output")
	if !strings.Contains(f.gormLog.String(), "class=sqlstate_22P02") {
		t.Errorf("the gorm log should still classify the failure; got: %s", f.gormLog.String())
	}

	// And it is classified, so a handler can pick a status.
	class, ok := dberr.ClassOf(sanErr)
	if !ok {
		t.Fatal("the error did not arrive as a persistence error")
	}
	if class != dberr.ClassInvalidValue {
		t.Errorf("class = %q, want %q", class, dberr.ClassInvalidValue)
	}
	if detail := dberr.Detail(sanErr); !strings.Contains(detail, "sqlstate=22P02") {
		t.Errorf("log detail = %q, want it to carry the sqlstate", detail)
	}
}

// Requirement 3: the five classes, each reached through a real Postgres failure
// rather than a hand-made error.
func TestSanitizer_ClassifiesRealPostgresFailures(t *testing.T) {
	f := newSanitizerFixture(t)

	owner := "11111111-1111-1111-1111-111111111111"
	if err := f.raw.Exec(`INSERT INTO owners (id) VALUES (?::uuid)`, owner).Error; err != nil {
		t.Fatalf("seed owner: %v", err)
	}
	if err := f.raw.Exec(
		`INSERT INTO probe_profiles (owner_id, email, phone, street)
		 VALUES (?::uuid, ?, ?, ?)`, owner, sentinelEmail, sentinelPhone, sentinelStreet,
	).Error; err != nil {
		t.Fatalf("seed profile: %v", err)
	}

	cases := []struct {
		name  string
		stmt  string
		args  []interface{}
		class dberr.Class
		state string
	}{
		{
			name:  "unique violation",
			stmt:  `INSERT INTO probe_profiles (owner_id, email) VALUES (?::uuid, ?)`,
			args:  []interface{}{owner, sentinelEmail},
			class: dberr.ClassDuplicate,
			state: "23505",
		},
		{
			name:  "foreign key violation",
			stmt:  `INSERT INTO probe_profiles (owner_id, email) VALUES ('22222222-2222-2222-2222-222222222222'::uuid, ?)`,
			args:  []interface{}{"other-" + sentinelEmail},
			class: dberr.ClassForeignKey,
			state: "23503",
		},
		{
			name:  "not null violation",
			stmt:  `INSERT INTO probe_profiles (owner_id, email) VALUES (?::uuid, NULL)`,
			args:  []interface{}{owner},
			class: dberr.ClassConstraint,
			state: "23502",
		},
		{
			name:  "check constraint violation",
			stmt:  `INSERT INTO probe_profiles (owner_id, email, phone) VALUES (?::uuid, ?, ?)`,
			args:  []interface{}{owner, "check-" + sentinelEmail, strings.Repeat(sentinelPhone, 4)},
			class: dberr.ClassConstraint,
			state: "23514",
		},
		{
			name:  "invalid text representation",
			stmt:  `SELECT id FROM probe_profiles WHERE owner_id = ?::uuid`,
			args:  []interface{}{sentinelProvTok},
			class: dberr.ClassInvalidValue,
			state: "22P02",
		},
		{
			name:  "undefined column is not guessed at",
			stmt:  `SELECT no_such_column FROM probe_profiles`,
			args:  nil,
			class: dberr.ClassUnknown,
			state: "42703",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := f.sanitized.Exec(c.stmt, c.args...).Error
			if err == nil {
				t.Fatal("the statement succeeded — this case pins nothing")
			}
			class, ok := dberr.ClassOf(err)
			if !ok {
				t.Fatalf("not a persistence error: %v", err)
			}
			if class != c.class {
				t.Errorf("class = %q, want %q", class, c.class)
			}
			var e *dberr.Error
			errors.As(err, &e)
			if e.SQLState != c.state {
				t.Errorf("sqlstate = %q, want %q", e.SQLState, c.state)
			}
			assertNoSentinels(t, err.Error(), "err.Error()")
			assertNoSentinels(t, dberr.Detail(err), "log detail")
		})
	}

	// The whole GORM log for the run, once: six real failures went through it.
	assertNoSentinels(t, f.gormLog.String(), "gorm output")
}

// Requirement 2, the part with sixty-plus dependants.
func TestSanitizer_PreservesRecordNotFoundAndDuplicateDetection(t *testing.T) {
	f := newSanitizerFixture(t)

	type row struct {
		ID string
	}
	var got row
	err := f.sanitized.Raw(
		`SELECT id FROM probe_profiles WHERE email = ?`, sentinelEmail,
	).First(&got).Error
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("errors.Is(err, gorm.ErrRecordNotFound) is false after sanitizing: %v", err)
	}
	if class, _ := dberr.ClassOf(err); class != dberr.ClassNotFound {
		t.Errorf("class = %q, want not_found", class)
	}
	// Not-found is ordinary control flow and must not be logged as a failure.
	if strings.Contains(f.gormLog.String(), "query failed") {
		t.Errorf("a not-found was logged as a failure: %s", f.gormLog.String())
	}

	owner := "33333333-3333-3333-3333-333333333333"
	f.raw.Exec(`INSERT INTO owners (id) VALUES (?::uuid)`, owner)
	ins := `INSERT INTO probe_profiles (owner_id, email) VALUES (?::uuid, ?)`
	if err := f.sanitized.Exec(ins, owner, sentinelEmail).Error; err != nil {
		t.Fatalf("first insert: %v", err)
	}
	dup := f.sanitized.Exec(ins, owner, sentinelEmail).Error
	if !errors.Is(dup, gorm.ErrDuplicatedKey) {
		t.Errorf("a real unique violation no longer answers to gorm.ErrDuplicatedKey: %v", dup)
	}
	if errors.Is(dup, gorm.ErrRecordNotFound) {
		t.Error("a duplicate answers to ErrRecordNotFound — the classes are crossed")
	}
}

// Requirement 2: rollback. db.Transaction decides by nil-ness, not by type, but
// the claim is worth measuring rather than reasoning about — a callback that
// swallowed the error would silently commit half a money move.
func TestSanitizer_TransactionStillRollsBack(t *testing.T) {
	f := newSanitizerFixture(t)

	owner := "44444444-4444-4444-4444-444444444444"
	f.raw.Exec(`INSERT INTO owners (id) VALUES (?::uuid)`, owner)

	err := f.sanitized.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(
			`INSERT INTO probe_profiles (owner_id, email) VALUES (?::uuid, ?)`,
			owner, sentinelEmail,
		).Error; err != nil {
			return err
		}
		// Fails on the type, after a successful write in the same transaction.
		return tx.Exec(
			`INSERT INTO probe_profiles (owner_id, email, postcode) VALUES (?::uuid, ?, ?)`,
			owner, "second-"+sentinelEmail, sentinelStreet,
		).Error
	})
	if err == nil {
		t.Fatal("the transaction reported success")
	}
	assertNoSentinels(t, err.Error(), "transaction error")

	var count int64
	f.raw.Raw(`SELECT count(*) FROM probe_profiles`).Scan(&count)
	if count != 0 {
		t.Fatalf("%d row(s) survived — the transaction did not roll back", count)
	}
}

// Requirement 4/5 at this layer: the public message is safe and generic, and
// the diagnostic that IS safe is available separately.
func TestSanitizer_PublicMessageAndLogDetailAreSeparate(t *testing.T) {
	f := newSanitizerFixture(t)

	var out []string
	// sentinelStreet, not sentinelPhone: "+2349001234567" is a VALID numeric
	// (Postgres allows a leading +), so the phone produced no cast error at all
	// and this test's own guard caught it passing vacuously.
	err := f.sanitized.Raw(
		`SELECT id FROM probe_profiles WHERE postcode = ?`, sentinelStreet,
	).Scan(&out).Error
	if err == nil {
		t.Fatal("expected a cast failure")
	}

	status, message, ok := dberr.HTTPStatus(err)
	if !ok {
		t.Fatal("not recognised as a persistence error")
	}
	if status != 400 {
		t.Errorf("status = %d, want 400", status)
	}
	assertNoSentinels(t, message, "public message")
	for _, banned := range []string{"SQLSTATE", "22P02", "postcode", "SELECT", "numeric"} {
		if strings.Contains(message, banned) {
			t.Errorf("the public message contains %q: %q", banned, message)
		}
	}
	if d := dberr.Detail(err); !strings.Contains(d, "sqlstate=22P02") {
		t.Errorf("the safe detail lost the sqlstate: %q", d)
	}
}

// probeModel goes through GORM's MODEL api — Create, Update, Delete, First —
// which is how every repository in this codebase writes. The tests above all
// used Exec, so they only ever exercised the `gorm:raw` callback; removing the
// `gorm:create` registration left them green. Found by mutation.
type probeModel struct {
	ID    uint   `gorm:"primaryKey"`
	Email string `gorm:"uniqueIndex"`
	Code  int64
}

// One case per GORM callback, each reaching Postgres through the model api.
// A callback that is registered for `raw` but not for `create` leaks on every
// repository insert in the application, and nothing else here would notice.
func TestSanitizer_CoversEveryModelOperation(t *testing.T) {
	f := newSanitizerFixture(t)
	if err := f.sanitized.AutoMigrate(&probeModel{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	// gorm:create — a unique violation through db.Create.
	first := &probeModel{Email: sentinelEmail, Code: 1}
	if err := f.sanitized.Create(first).Error; err != nil {
		t.Fatalf("seed: %v", err)
	}
	dupErr := f.sanitized.Create(&probeModel{Email: sentinelEmail, Code: 2}).Error
	assertCleanPersistenceError(t, "create", dupErr, dberr.ClassDuplicate, "23505")
	if !errors.Is(dupErr, gorm.ErrDuplicatedKey) {
		t.Error("a duplicate through db.Create does not answer to gorm.ErrDuplicatedKey")
	}

	// The remaining three each fail on a cast: `code` is bigint and the value
	// is an address, so pgx quotes the address back. Proven leaking on the raw
	// handle first, or these assertions would be vacuous.
	rawErr := f.raw.Model(&probeModel{}).Where("code = ?", sentinelStreet).
		Update("email", "x").Error
	requireLeak(t, sentinelStreet, rawErr)

	// gorm:update
	updErr := f.sanitized.Model(&probeModel{}).Where("code = ?", sentinelStreet).
		Update("email", "x").Error
	assertCleanPersistenceError(t, "update", updErr, dberr.ClassInvalidValue, "22P02")

	// gorm:delete
	delErr := f.sanitized.Where("code = ?", sentinelStreet).Delete(&probeModel{}).Error
	assertCleanPersistenceError(t, "delete", delErr, dberr.ClassInvalidValue, "22P02")

	// gorm:query
	var found probeModel
	qErr := f.sanitized.Where("code = ?", sentinelStreet).First(&found).Error
	assertCleanPersistenceError(t, "query", qErr, dberr.ClassInvalidValue, "22P02")

	// Pluck runs through the QUERY callback, not the row one — measured, after
	// asserting the label and being told otherwise.
	var codes []int64
	pluckErr := f.sanitized.Model(&probeModel{}).
		Where("code = ?", sentinelStreet).Pluck("code", &codes).Error
	assertCleanPersistenceError(t, "query", pluckErr, dberr.ClassInvalidValue, "22P02")

	// gorm:row — db.Raw(...).Scan(), the path whose LOGGING also bypasses
	// ParamsFilter (see redactSQLLiterals).
	var scanned []int64
	rowErr := f.sanitized.Raw(
		`SELECT code FROM probe_models WHERE code = ?`, sentinelStreet,
	).Scan(&scanned).Error
	assertCleanPersistenceError(t, "row", rowErr, dberr.ClassInvalidValue, "22P02")

	assertNoSentinels(t, f.gormLog.String(), "gorm output across all operations")
}

func assertCleanPersistenceError(t *testing.T, op string, err error, want dberr.Class, state string) {
	t.Helper()
	if err == nil {
		t.Fatalf("%s: the operation succeeded, so this case pins nothing", op)
	}
	class, ok := dberr.ClassOf(err)
	if !ok {
		t.Fatalf("%s: the error did not pass the boundary: %v", op, err)
	}
	if class != want {
		t.Errorf("%s: class = %q, want %q", op, class, want)
	}
	var e *dberr.Error
	errors.As(err, &e)
	if e.SQLState != state {
		t.Errorf("%s: sqlstate = %q, want %q", op, e.SQLState, state)
	}
	if e.Op != op {
		t.Errorf("%s: the error is labelled %q — the wrong callback handled it", op, e.Op)
	}
	assertNoSentinels(t, err.Error(), op+" err.Error()")
	assertNoSentinels(t, fmt.Sprintf("%v / %+v", err, err), op+" formatted")
	assertNoSentinels(t, dberr.Detail(err), op+" log detail")
}

// The wiring, tested on the real ConnectDB rather than asserted in a comment.
//
// Every test above builds its own handle and registers the sanitizer itself, so
// all of them would stay green if ConnectDB stopped calling it — and then
// nothing in production would be sanitized at all. This drives the actual
// function the application boots through.
func TestConnectDB_RegistersTheSanitizer(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set — ConnectDB opens a real connection")
	}

	t.Setenv("DB_DSN", dsn)
	t.Setenv("DB_DRIVER", "postgres")
	// Non-local, so the sanitized logger is the one that should be installed.
	t.Setenv("APP_ENV", "staging")
	t.Setenv("ENV", "staging")
	previous := DBInstance
	t.Cleanup(func() { DBInstance = previous })

	db := ConnectDB()
	if db == nil {
		t.Fatal("ConnectDB returned nil")
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	// A cast failure that quotes the value, on the connection the application
	// actually uses.
	var out []string
	err := db.Raw(`SELECT 1 WHERE 1 = ?::int`, sentinelStreet).Scan(&out).Error
	if err == nil {
		t.Fatal("expected a cast failure")
	}
	if _, ok := dberr.ClassOf(err); !ok {
		t.Fatalf("ConnectDB's database does not sanitize its errors — the boundary "+
			"is not registered where it matters: %v", err)
	}
	assertNoSentinels(t, err.Error(), "ConnectDB error")

	// And the logger it installed is the sanitized one. newGormLogger being
	// correct is worth nothing if ConnectDB does not call it, and nothing else
	// pinned that — a mutation swapping in gormlogger.New stayed green.
	if _, ok := db.Config.Logger.(*sanitizedGormLogger); !ok {
		t.Errorf("ConnectDB installed %T outside local; the sanitized logger is "+
			"the only one that does not interpolate values", db.Config.Logger)
	}
}
