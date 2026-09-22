package dberr

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"testing"

	"gorm.io/gorm"
)

// Sentinels, shaped like the values a driver error actually quotes back.
const (
	sentEmail = "dberr-probe-51a7@sentinel.example"
	sentPhone = "+2349005550001"
	sentAddr  = "41 Dberr Close, Probeville"
	sentToken = "provider-token-SENTINEL-c3d9"
)

func sentinels() map[string]string {
	return map[string]string{"email": sentEmail, "phone": sentPhone,
		"address": sentAddr, "token": sentToken}
}

// pgError stands in for *pgconn.PgError: it exposes SQLState() and, crucially,
// embeds the submitted value in its message — which is the real behaviour
// measured against this database:
//
//	invalid input syntax for type bigint: "ada@example.com" (SQLSTATE 22P02)
type pgError struct {
	code string
	msg  string
}

func (e *pgError) Error() string    { return e.msg }
func (e *pgError) SQLState() string { return e.code }

func TestFrom_ClassifiesDeliberately(t *testing.T) {
	cases := []struct {
		code  string
		class Class
	}{
		{"23505", ClassDuplicate},
		{"23503", ClassForeignKey},
		{"23502", ClassConstraint},
		{"23514", ClassConstraint},
		{"23P01", ClassConstraint},
		{"22P02", ClassInvalidValue},
		{"22021", ClassInvalidValue},
		{"22001", ClassInvalidValue},
		{"22003", ClassInvalidValue},
		// Unmapped codes must NOT be guessed at: an unfamiliar code becoming
		// "duplicate" is how a disk failure gets reported as a conflict.
		{"08006", ClassUnknown},
		{"42601", ClassUnknown},
		{"XX000", ClassUnknown},
	}
	for _, c := range cases {
		t.Run(c.code, func(t *testing.T) {
			driver := &pgError{code: c.code,
				msg: fmt.Sprintf("something about %q and %q", sentEmail, sentPhone)}
			got := From(driver, "create")

			class, ok := ClassOf(got)
			if !ok {
				t.Fatal("not recognised as a persistence error")
			}
			if class != c.class {
				t.Errorf("class = %q, want %q", class, c.class)
			}
			var e *Error
			errors.As(got, &e)
			if e.SQLState != c.code {
				t.Errorf("SQLState = %q, want %q", e.SQLState, c.code)
			}
		})
	}
}

// The central guarantee: nothing the driver said survives, on any surface the
// error itself offers.
func TestFrom_RetainsNothingFromTheDriverMessage(t *testing.T) {
	driver := &pgError{
		code: "22P02",
		msg: fmt.Sprintf(`invalid input syntax for type bigint: %q; ctx phone=%s addr=%q token=%s`,
			sentEmail, sentPhone, sentAddr, sentToken),
	}
	// Confirm the input really is dangerous, or the assertions are vacuous.
	for label, v := range sentinels() {
		if !strings.Contains(driver.Error(), v) {
			t.Fatalf("the fixture driver error does not contain the %s sentinel", label)
		}
	}

	wrapped := From(driver, "create")

	surfaces := map[string]string{
		"Error()":           wrapped.Error(),
		"%v":                fmt.Sprintf("%v", wrapped),
		"%s":                fmt.Sprintf("%s", wrapped),
		"%+v":               fmt.Sprintf("%+v", wrapped),
		"LogDetail()":       Detail(wrapped),
		"errors.Unwrap(%v)": fmt.Sprintf("%v", errors.Unwrap(wrapped)),
	}
	for surface, text := range surfaces {
		for label, v := range sentinels() {
			if strings.Contains(text, v) {
				t.Errorf("%s leaks the %s sentinel: %q", surface, label, text)
			}
		}
	}

	// And no SQL fragment either.
	if strings.Contains(wrapped.Error(), "invalid input syntax") {
		t.Errorf("Error() carries the driver phrasing: %q", wrapped.Error())
	}
	// Unwrap must not reach the driver error at all.
	if errors.Unwrap(wrapped) != nil {
		t.Error("Unwrap reaches through to the original error — something can print it")
	}
}

// Requirement: preserve errors.Is(..., gorm.ErrRecordNotFound). Sixty-plus
// call sites depend on it, and a not-found that stopped answering would turn
// "no such user" into a 500 across the application.
func TestFrom_PreservesSentinelSemantics(t *testing.T) {
	notFound := From(gorm.ErrRecordNotFound, "query")
	if !errors.Is(notFound, gorm.ErrRecordNotFound) {
		t.Error("errors.Is(err, gorm.ErrRecordNotFound) no longer holds")
	}
	if class, _ := ClassOf(notFound); class != ClassNotFound {
		t.Errorf("class = %q, want %q", class, ClassNotFound)
	}

	// Duplicate detection, which idempotency depends on.
	dup := From(&pgError{code: "23505", msg: "duplicate key " + sentEmail}, "create")
	if !errors.Is(dup, gorm.ErrDuplicatedKey) {
		t.Error("a unique violation does not answer to gorm.ErrDuplicatedKey")
	}
	if errors.Is(dup, gorm.ErrRecordNotFound) {
		t.Error("a duplicate answers to ErrRecordNotFound — the classes are crossed")
	}

	fk := From(&pgError{code: "23503", msg: "fk"}, "create")
	if !errors.Is(fk, gorm.ErrForeignKeyViolated) {
		t.Error("a foreign-key violation does not answer to gorm.ErrForeignKeyViolated")
	}
	if errors.Is(fk, gorm.ErrDuplicatedKey) {
		t.Error("a foreign-key violation answers to ErrDuplicatedKey")
	}
}

func TestHTTPStatus_MapsClassesAndPassesDomainErrorsThrough(t *testing.T) {
	cases := map[string]struct {
		code   string
		status int
	}{
		"duplicate is a conflict":        {"23505", http.StatusConflict},
		"foreign key is a bad request":   {"23503", http.StatusBadRequest},
		"invalid value is a bad request": {"22P02", http.StatusBadRequest},
		"constraint is a bad request":    {"23502", http.StatusBadRequest},
		"unknown is a server error":      {"08006", http.StatusInternalServerError},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			status, message, ok := HTTPStatus(From(&pgError{code: c.code, msg: sentEmail}, "create"))
			if !ok {
				t.Fatal("not recognised as a persistence error")
			}
			if status != c.status {
				t.Errorf("status = %d, want %d", status, c.status)
			}
			if strings.Contains(message, sentEmail) {
				t.Errorf("the public message leaks the sentinel: %q", message)
			}
			if message == "" {
				t.Error("no public message")
			}
		})
	}

	// Not-found keeps its own status.
	if status, _, _ := HTTPStatus(From(gorm.ErrRecordNotFound, "query")); status != http.StatusNotFound {
		t.Errorf("not-found status = %d, want 404", status)
	}

	// A DOMAIN error must pass through untouched — this is what stops the
	// change from swallowing validation messages.
	domain := errors.New("insufficient balance: ₦500 available")
	if _, _, ok := HTTPStatus(domain); ok {
		t.Error("a domain error was treated as a persistence failure; its message " +
			"would be replaced by a generic one")
	}
	if _, ok := ClassOf(domain); ok {
		t.Error("a domain error was classified")
	}
}

// Public messages are stable, because responses are asserted against them and
// they may be translated.
func TestPublicMessages_AreStableAndCarryNoDiagnostics(t *testing.T) {
	for class := range publicMessage {
		e := &Error{Class: class, SQLState: "23505", Op: "create"}
		msg := e.Error()
		if msg == "" {
			t.Errorf("class %q has no public message", class)
		}
		for _, banned := range []string{"23505", "sqlstate", "SQLSTATE", "create", string(class)} {
			if strings.Contains(msg, banned) {
				t.Errorf("class %q public message contains %q: %q", class, banned, msg)
			}
		}
	}
	// The log detail, by contrast, is where those belong.
	detail := (&Error{Class: ClassDuplicate, SQLState: "23505", Op: "create"}).LogDetail()
	for _, want := range []string{"op=create", "class=duplicate", "sqlstate=23505"} {
		if !strings.Contains(detail, want) {
			t.Errorf("LogDetail is missing %q: %q", want, detail)
		}
	}
}

// Double wrapping is harmless, so a repository that also calls From by hand
// cannot produce a nested error whose message changes.
func TestFrom_IsIdempotent(t *testing.T) {
	once := From(&pgError{code: "23505", msg: sentEmail}, "create")
	twice := From(once, "update")
	if once != twice {
		t.Error("wrapping twice produced a different error")
	}
	if strings.Contains(twice.Error(), sentEmail) {
		t.Error("the second wrap leaked the sentinel")
	}
}

func TestFrom_NilIsNil(t *testing.T) {
	if From(nil, "create") != nil {
		t.Error("From(nil) is not nil — every success path would look like a failure")
	}
}
