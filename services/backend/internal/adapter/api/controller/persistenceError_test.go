package controller

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/Tinovalabs/vibaar/services/backend/internal/database"
	"github.com/Tinovalabs/vibaar/services/backend/internal/dberr"
)

// Sentinels: distinctive, and shaped like the data a buyer actually submits.
const (
	handlerSentinelEmail = "handler-probe-3c8a@sentinel.example"
	handlerSentinelPhone = "+2349003330071"
	handlerSentinelAddr  = "92 Handler Way, Probe Layout, Ikeja"
	handlerSentinelToken = "guest-token-SENTINEL-b41e"
)

func handlerSentinels() map[string]string {
	return map[string]string{
		"email":   handlerSentinelEmail,
		"phone":   handlerSentinelPhone,
		"address": handlerSentinelAddr,
		"token":   handlerSentinelToken,
	}
}

func assertNoHandlerSentinels(t *testing.T, surface, text string) {
	t.Helper()
	for label, v := range handlerSentinels() {
		if strings.Contains(text, v) {
			t.Errorf("%s leaks the %s sentinel.\n  got: %s", surface, label, text)
		}
	}
}

// Requirement 4: a handler's status comes from the failure's CLASS, and a
// domain error is left entirely alone.
//
// The second half is the one worth pinning. 241 handler sites put `err.Error()`
// in the response, and most of them are returning "invalid user" or
// "insufficient balance" — messages that belong there. A containment change
// that replaced those with a generic string would be a regression dressed as a
// fix, so respondError passes anything that is not a persistence failure
// straight through with the handler's own status.
func TestRespondError_StatusFromClassAndDomainErrorsUntouched(t *testing.T) {
	gin.SetMode(gin.TestMode)

	persistence := func(sqlstate string) error {
		return dberr.From(&fakePgError{code: sqlstate,
			msg: fmt.Sprintf("driver said %q / %s", handlerSentinelEmail, handlerSentinelAddr)}, "create")
	}

	cases := []struct {
		name       string
		err        error
		wantStatus int
		wantBody   string
	}{
		{"duplicate is a conflict", persistence("23505"), http.StatusConflict, "this already exists"},
		{"foreign key is a bad request", persistence("23503"), http.StatusBadRequest,
			"a related record is missing or still in use"},
		{"invalid value is a bad request", persistence("22P02"), http.StatusBadRequest,
			"one of the submitted values could not be saved"},
		{"constraint is a bad request", persistence("23502"), http.StatusBadRequest,
			"the submitted data did not meet a required condition"},
		{"unknown is a server error", persistence("08006"), http.StatusInternalServerError,
			"the request could not be completed"},
		{"not found is a 404", dberr.From(gorm.ErrRecordNotFound, "query"), http.StatusNotFound, "not found"},
		// The pass-through cases.
		{"a domain error keeps its message and the handler's status",
			errors.New("insufficient balance"), http.StatusBadRequest, "insufficient balance"},
		{"a validation message keeps its message",
			errors.New("shipping_profile_id is required"), http.StatusBadRequest,
			"shipping_profile_id is required"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var logged bytes.Buffer
			restore := captureAppLog(&logged)
			defer restore()

			rec := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(rec)
			ctx.Request = httptest.NewRequest(http.MethodPost, "/probe", nil)

			respondError(ctx, http.StatusBadRequest, "probe_op", "rec-42", c.err)

			if rec.Code != c.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, c.wantStatus)
			}
			var body map[string]string
			if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
				t.Fatalf("body is not json: %s", rec.Body.String())
			}
			if body["error"] != c.wantBody {
				t.Errorf("body error = %q, want %q", body["error"], c.wantBody)
			}

			// Requirement 5: the log carries the operation, the internal id and
			// the classification — never the driver's text.
			assertNoHandlerSentinels(t, "response body", rec.Body.String())
			assertNoHandlerSentinels(t, "application log", logged.String())
			if !strings.Contains(logged.String(), "probe_op failed") ||
				!strings.Contains(logged.String(), "id=rec-42") {
				t.Errorf("the log lost the operation or the record id: %s", logged.String())
			}
			for _, banned := range []string{"SQLSTATE", "driver said", "invalid input syntax"} {
				if strings.Contains(logged.String(), banned) {
					t.Errorf("the log contains %q: %s", banned, logged.String())
				}
			}
		})
	}
}

// A persistence failure's classification must reach the log, or the change
// trades a leak for an undiagnosable 500.
func TestRespondError_LogsTheClassification(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var logged bytes.Buffer
	restore := captureAppLog(&logged)
	defer restore()

	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/probe", nil)

	respondError(ctx, http.StatusBadRequest, "add_shipping_profile", "",
		dberr.From(&fakePgError{code: "23505", msg: handlerSentinelEmail}, "create"))

	for _, want := range []string{"add_shipping_profile failed", "class=duplicate", "sqlstate=23505"} {
		if !strings.Contains(logged.String(), want) {
			t.Errorf("the log is missing %q: %s", want, logged.String())
		}
	}
	// No record id was supplied, so no empty id= fragment.
	if strings.Contains(logged.String(), "id=") {
		t.Errorf("an empty record id was logged anyway: %s", logged.String())
	}
}

// captureAppLog redirects the application logger (package-level logrus) into
// buf and returns a restore func.
func captureAppLog(buf *bytes.Buffer) func() {
	previous := logrus.StandardLogger().Out
	logrus.SetOutput(buf)
	return func() { logrus.SetOutput(previous) }
}

// fakePgError stands in for *pgconn.PgError where a REAL failure is not the
// point — the status map and the log line. The real-driver cases are the
// Postgres test below and internal/database/errorSanitizer_test.go.
type fakePgError struct {
	code string
	msg  string
}

func (e *fakePgError) Error() string    { return e.msg }
func (e *fakePgError) SQLState() string { return e.code }

// ---------------------------------------------------------------------------
// The complete path: HTTP request → handler → service → repository → Postgres,
// and back. Requirement 7's third surface, and requirement 8's "at least one
// complete repository-to-handler path".
// ---------------------------------------------------------------------------

var handlerSchemaCounter atomic.Int64

// The route is `POST /shipping-profile` as it ships: the real
// ShippingController, the real ShippingService, the real ShippingRepository.
// Only the SCHEMA is arranged — `town` is numeric — and that is deliberate:
//
// The failure class is the measured one (a submitted value the column's type
// rejects, SQLSTATE 22P02, whose driver message quotes the value back). What a
// fixture cannot reproduce from the live schema is a column typed narrowly
// enough to reject a string, because on `shipping_profiles` every queried
// column is `text`. Typing `town` puts a real driver error on a real code path
// rather than a fabricated one — and the raw handle beside it PROVES the driver
// still quotes the value, so the absence assertions are not vacuous.
func TestAddShippingProfile_DriverErrorReachesNoSurface(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set — the subject is what a pgx error " +
			"carries through a real handler, which sqlite cannot reproduce")
	}
	gin.SetMode(gin.TestMode)

	schema := fmt.Sprintf("dberr_handler_%d_%d", os.Getpid(), handlerSchemaCounter.Add(1))
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

	gormLog := &bytes.Buffer{}
	db, err := gorm.Open(postgres.Open(scoped), &gorm.Config{
		Logger: database.NewSanitizedGormLogger(log.New(gormLog, "", 0)),
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

	// users_guest must exist and be empty: the service tolerates a not-found
	// guest, and a MISSING table would fail earlier with an undefined-table
	// error, short-circuiting the path under test.
	for _, stmt := range []string{
		`CREATE TABLE users_guest (id text PRIMARY KEY)`,
		`CREATE TABLE shipping_profiles_guest (
			id text PRIMARY KEY,
			created_at timestamptz, updated_at timestamptz,
			street text, town numeric, state text, country text,
			longitude numeric, latitude numeric,
			user_id text, is_default boolean, shipbubble_address_code bigint
		)`,
	} {
		if err := db.Exec(stmt).Error; err != nil {
			t.Fatalf("fixture: %v", err)
		}
	}

	// First, on a handle WITHOUT the sanitizer: prove the driver quotes the
	// submitted town back, so the assertions below are about containment and
	// not about an error that never carried the value.
	rawDB, err := gorm.Open(postgres.Open(scoped), &gorm.Config{Logger: gormlogger.Discard})
	if err != nil {
		t.Fatalf("connect (raw): %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := rawDB.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	var scratch []string
	rawErr := rawDB.Table("shipping_profiles_guest").
		Where("town = ?", handlerSentinelAddr).Pluck("id", &scratch).Error
	if rawErr == nil {
		t.Fatal("the fixture no longer produces a driver error — nothing is under test")
	}
	if !strings.Contains(rawErr.Error(), handlerSentinelAddr) {
		t.Fatalf("the UNSANITIZED driver error does not quote the submitted value, so "+
			"this test cannot demonstrate containment. Driver said: %q", rawErr.Error())
	}

	// Now the real route.
	var appLog bytes.Buffer
	restore := captureAppLog(&appLog)
	defer restore()

	router := gin.New()
	controller := NewShippingController(db)
	router.POST("/shipping-profile", func(c *gin.Context) {
		// What the auth middleware sets for a guest checkout.
		c.Set("guest_id", handlerSentinelToken)
		controller.AddShippingProfile(c)
	})

	body, _ := json.Marshal(map[string]interface{}{
		"street":  "92 Handler Way",
		"town":    handlerSentinelAddr,
		"state":   "Lagos",
		"country": "Nigeria",
		"shipping_user": map[string]string{
			"firstname": "Probe",
			"lastname":  "Sentinel",
			"phone":     handlerSentinelPhone,
			"email":     handlerSentinelEmail,
		},
	})
	req := httptest.NewRequest(http.MethodPost, "/shipping-profile", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code == http.StatusOK {
		t.Fatalf("the request succeeded; it was supposed to fail in the repository. body: %s",
			rec.Body.String())
	}

	// Surface 1: the HTTP response body. Pinned exactly, because the whole
	// question is what a client is told. The service's own phrasing survives —
	// it wraps with %v — and what it wraps is now the stable public message
	// instead of `invalid input syntax for type numeric: "92 Handler Way, ..."`.
	const wantBody = `{"error":"error checking existing addresses: ` +
		`one of the submitted values could not be saved"}`
	if rec.Body.String() != wantBody {
		t.Errorf("response body\n  got:  %s\n  want: %s", rec.Body.String(), wantBody)
	}
	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", rec.Code)
	}
	assertNoHandlerSentinels(t, "response body", rec.Body.String())
	for _, banned := range []string{"SQLSTATE", "22P02", "invalid input syntax", "SELECT", "numeric"} {
		if strings.Contains(rec.Body.String(), banned) {
			t.Errorf("the response body contains %q: %s", banned, rec.Body.String())
		}
	}

	// Surface 2: the application log.
	assertNoHandlerSentinels(t, "application log", appLog.String())
	if !strings.Contains(appLog.String(), "add_shipping_profile failed") {
		t.Errorf("the handler logged no failure at all: %s", appLog.String())
	}

	// Surface 3: the GORM output.
	assertNoHandlerSentinels(t, "gorm output", gormLog.String())
	if !strings.Contains(gormLog.String(), "class=sqlstate_22P02") {
		t.Errorf("the gorm log lost the classification: %s", gormLog.String())
	}
}

// A commit-time failure, all the way out to the HTTP response.
//
// This is the surface the transaction helper exists for. GORM's Commit talks to
// the driver directly and runs no callbacks, so before database.WithTransaction
// a deferred-constraint violation arrived at a handler as a raw
// *pgconn.PgError — and a handler that echoes err.Error() would have put the
// trigger's message, and the value inside it, in the response body.
func TestCommitFailure_ReachesNoHTTPSurface(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set — a deferred constraint firing at COMMIT " +
			"is the subject, and only Postgres defers constraints")
	}
	gin.SetMode(gin.TestMode)

	schema := fmt.Sprintf("dberr_commit_%d_%d", os.Getpid(), handlerSchemaCounter.Add(1))
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

	scoped := strings.TrimSpace(dsn) + " search_path=" + schema
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		sep := "?"
		if strings.Contains(dsn, "?") {
			sep = "&"
		}
		scoped = dsn + sep + "search_path=" + schema
	}

	gormLog := &bytes.Buffer{}
	db, err := gorm.Open(postgres.Open(scoped), &gorm.Config{
		Logger: database.NewSanitizedGormLogger(log.New(gormLog, "", 0)),
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

	// A deferred constraint trigger that rejects at COMMIT, quoting the value.
	for _, stmt := range []string{
		`CREATE TABLE commit_probe (id text PRIMARY KEY, address text)`,
		`CREATE FUNCTION reject_commit_probe() RETURNS trigger AS $fn$
			BEGIN
				RAISE EXCEPTION 'rejected at commit: %', NEW.address;
			END;
		$fn$ LANGUAGE plpgsql`,
		`CREATE CONSTRAINT TRIGGER commit_probe_check
			AFTER INSERT ON commit_probe
			DEFERRABLE INITIALLY DEFERRED
			FOR EACH ROW EXECUTE FUNCTION reject_commit_probe()`,
	} {
		if err := db.Exec(stmt).Error; err != nil {
			t.Fatalf("fixture: %v", err)
		}
	}

	// Non-vacuity: an unsanitized commit really does carry the value.
	rawDB, err := gorm.Open(postgres.Open(scoped), &gorm.Config{Logger: gormlogger.Discard})
	if err != nil {
		t.Fatalf("connect (raw): %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := rawDB.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	rawTx := rawDB.Begin()
	if err := rawTx.Exec(`INSERT INTO commit_probe VALUES ('a', ?)`, handlerSentinelAddr).Error; err != nil {
		t.Fatalf("the insert should succeed — the trigger is deferred: %v", err)
	}
	rawCommit := rawTx.Commit().Error
	if rawCommit == nil || !strings.Contains(rawCommit.Error(), handlerSentinelAddr) {
		t.Fatalf("the UNSANITIZED commit error does not carry the submitted value, so "+
			"this test cannot demonstrate containment: %v", rawCommit)
	}

	// The route: a handler whose repository fails at commit and which responds
	// through respondError, exactly as the migrated handlers do.
	var appLog bytes.Buffer
	restore := captureAppLog(&appLog)
	defer restore()

	router := gin.New()
	router.POST("/commit-probe", func(c *gin.Context) {
		var body struct {
			Address string `json:"address"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		err := database.WithTransaction(db, "commit_probe", func(tx *gorm.DB) error {
			return tx.Exec(`INSERT INTO commit_probe VALUES ('b', ?)`, body.Address).Error
		})
		if err != nil {
			respondError(c, http.StatusBadRequest, "commit_probe", "rec-7", err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": "ok"})
	})

	payload, _ := json.Marshal(map[string]string{"address": handlerSentinelAddr})
	req := httptest.NewRequest(http.MethodPost, "/commit-probe", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	// It must not report success.
	if rec.Code == http.StatusOK {
		t.Fatalf("the request succeeded although the commit was rejected: %s", rec.Body.String())
	}
	// An unmapped SQLSTATE is a server error, not a client error.
	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500 for an unclassified persistence failure", rec.Code)
	}
	if rec.Body.String() != `{"error":"the request could not be completed"}` {
		t.Errorf("body = %s", rec.Body.String())
	}

	assertNoHandlerSentinels(t, "response body", rec.Body.String())
	assertNoHandlerSentinels(t, "application log", appLog.String())
	assertNoHandlerSentinels(t, "gorm output", gormLog.String())
	// The response body carries no diagnostics at all — not the driver's
	// message, not the SQL, not the SQLSTATE.
	for _, banned := range []string{"rejected at commit", "SQLSTATE", "P0001", "INSERT INTO", "commit_probe"} {
		if strings.Contains(rec.Body.String(), banned) {
			t.Errorf("the response body contains %q: %s", banned, rec.Body.String())
		}
	}
	// The log carries the DIAGNOSTICS but not the driver's message. The
	// SQLSTATE is deliberately present — it is the one thing that says what
	// happened, and it is five characters of schema-independent code.
	for _, banned := range []string{"rejected at commit", "INSERT INTO", "RAISE"} {
		if strings.Contains(appLog.String(), banned) {
			t.Errorf("the application log contains the driver message (%q): %s",
				banned, appLog.String())
		}
	}
	// The log still says what happened.
	for _, want := range []string{"commit_probe failed", "id=rec-7", "class=unknown", "sqlstate=P0001"} {
		if !strings.Contains(appLog.String(), want) {
			t.Errorf("the log is missing %q: %s", want, appLog.String())
		}
	}

	// Rollback held: neither row exists.
	var rows int64
	rawDB.Raw(`SELECT count(*) FROM commit_probe`).Scan(&rows)
	if rows != 0 {
		t.Errorf("%d row(s) survived a rejected commit", rows)
	}
}
