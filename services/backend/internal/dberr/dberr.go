// Package dberr contains persistence failures so that a driver's error text
// cannot reach a log, an API response, or anything a person reads.
//
// # Why this exists
//
// A driver error is not a safe string. Measured against this database:
//
//	invalid input syntax for type bigint: "ada@example.com" (SQLSTATE 22P02)
//
// The submitted value is inside the message. Sanitizing the SQL logger closed
// one route for that, but the error itself kept travelling: a repository
// returned it, a service wrapped it with `%w`, a handler logged it and put
// `err.Error()` in the response body. Verified on staging — a controlled
// failure produced a clean `class=sqlstate_22021` line from the logger AND a
// second line carrying the raw message, plus the same text in the HTTP body.
//
// So the containment has to happen where the driver error is BORN, not where
// it is printed. Everything downstream — 316 repository methods, 241 handler
// sites that echo `err.Error()` — is then safe without being touched, which is
// also why this approach was chosen over editing them: rewriting 241 response
// sites would have meant replacing the domain and validation messages that
// genuinely belong there.
//
// # What is kept
//
// Three things, each because something depends on it:
//
//   - The CLASS, which drives the public message and the HTTP status.
//   - The SQLSTATE, a five-character code that appears in logs only.
//   - The CONSTRAINT NAME, because a unique violation's identity is the only
//     way to tell an EXPECTED duplicate from an unexpected one. The signup
//     bonus is guarded by a partial unique index and a concurrent loser must be
//     treated as success; without the constraint name that branch cannot tell
//     itself from a genuine failure on a money path. Constraint and index names
//     are schema-controlled — they are written in migrations, never by a user —
//     so they carry no customer data.
//
// Nothing else. Not the driver's message, not PostgreSQL's DETAIL (which does
// contain values: `Key (email)=(ada@example.com)`), not the table, not the
// column contents, and not the original error: Unwrap is deliberately not
// implemented, so nothing downstream can reach through to the text.
package dberr

import (
	"errors"
	"fmt"
	"net/http"

	// pgconn is imported for ONE field: PgError.ConstraintName. It is a struct
	// field, not a method, so the interface assertion used for SQLState cannot
	// reach it. This is the driver the application runs on and it is already a
	// direct dependency, so the import costs nothing — but it is the only
	// driver-specific thing in this package, and it is confined to
	// constraintNameOf below.
	"github.com/jackc/pgx/v5/pgconn"

	"gorm.io/gorm"
)

// Class is the deliberately small set of persistence outcomes the application
// distinguishes. Anything unrecognised is ClassUnknown rather than a passthrough.
type Class string

const (
	// ClassNotFound — the row does not exist. Ordinary control flow, and the
	// one class that must keep satisfying errors.Is(err, gorm.ErrRecordNotFound).
	ClassNotFound Class = "not_found"
	// ClassDuplicate — a unique constraint rejected the write. This is the
	// class idempotency depends on: "someone already claimed this".
	ClassDuplicate Class = "duplicate"
	// ClassForeignKey — a referenced row is missing, or a referencing row still
	// exists.
	ClassForeignKey Class = "foreign_key"
	// ClassInvalidValue — the value could not be stored as submitted: a bad
	// cast, an out-of-range number, a byte sequence the encoding rejects. This
	// is the class whose DRIVER message quotes the submitted value.
	ClassInvalidValue Class = "invalid_value"
	// ClassConstraint — a CHECK or NOT NULL constraint refused the row.
	ClassConstraint Class = "constraint"
	// ClassUnknown — everything else, including connection and syntax faults.
	ClassUnknown Class = "unknown"
)

// publicMessage is what a person sees. Stable per class, so it can be asserted
// against and translated, and carrying no SQL, no SQLSTATE and no value.
var publicMessage = map[Class]string{
	ClassNotFound:     "not found",
	ClassDuplicate:    "this already exists",
	ClassForeignKey:   "a related record is missing or still in use",
	ClassInvalidValue: "one of the submitted values could not be saved",
	ClassConstraint:   "the submitted data did not meet a required condition",
	ClassUnknown:      "the request could not be completed",
}

// httpStatus maps a class to the status a handler should return.
var httpStatus = map[Class]int{
	ClassNotFound:     http.StatusNotFound,
	ClassDuplicate:    http.StatusConflict,
	ClassForeignKey:   http.StatusBadRequest,
	ClassInvalidValue: http.StatusBadRequest,
	ClassConstraint:   http.StatusBadRequest,
	ClassUnknown:      http.StatusInternalServerError,
}

// Error is a persistence failure, reduced.
//
// There is deliberately no field holding the driver's message and no wrapped
// driver error: Unwrap is not implemented, so nothing downstream can reach
// through this to the original text.
type Error struct {
	Class Class
	// SQLState is the five-character code, or "" when the failure had none.
	// Safe to log; never part of Error().
	SQLState string
	// Constraint is the name of the constraint or index that rejected the
	// statement, or "" when the failure had none. Schema-controlled, so safe to
	// log and safe to branch on — and branching on it is the point: see
	// isSignupBonusRaceLoss. Never part of Error(), because the public message
	// should not describe the schema.
	Constraint string
	// Op labels the operation, e.g. "create" or "query". Not the SQL.
	Op string
}

// Error is the stable public message. No class name, no SQLSTATE, no op —
// this string reaches API responses, and 241 handler sites put it there.
func (e *Error) Error() string {
	if msg, ok := publicMessage[e.Class]; ok {
		return msg
	}
	return publicMessage[ClassUnknown]
}

// Is makes the sentinel checks the codebase already relies on keep working
// WITHOUT retaining the original error.
//
// Sixty-plus call sites do errors.Is(err, gorm.ErrRecordNotFound), and a
// not-found that stopped answering to it would turn "no such user" into a 500
// across the application.
func (e *Error) Is(target error) bool {
	switch {
	case errors.Is(target, gorm.ErrRecordNotFound):
		return e.Class == ClassNotFound
	case errors.Is(target, gorm.ErrDuplicatedKey):
		return e.Class == ClassDuplicate
	case errors.Is(target, gorm.ErrForeignKeyViolated):
		return e.Class == ClassForeignKey
	}
	return false
}

// LogDetail is the safe diagnostic string: operation, class and SQLSTATE.
// Requirement: logs may carry these; they may not carry the driver message.
func (e *Error) LogDetail() string {
	detail := fmt.Sprintf("op=%s class=%s", e.Op, e.Class)
	if e.SQLState != "" {
		detail += " sqlstate=" + e.SQLState
	}
	if e.Constraint != "" {
		detail += " constraint=" + e.Constraint
	}
	return detail
}

// sqlStater is implemented by *pgconn.PgError. Asserted rather than imported so
// this package does not depend on a driver.
type sqlStater interface{ SQLState() string }

// From reduces a database error to an *Error. It returns nil for nil, and
// leaves an existing *Error alone so double-wrapping is harmless.
func From(err error, op string) error {
	if err == nil {
		return nil
	}
	var already *Error
	if errors.As(err, &already) {
		return err
	}

	out := &Error{Op: op, Class: ClassUnknown}

	// Not-found is checked first: GORM raises it itself, with no SQLSTATE.
	if errors.Is(err, gorm.ErrRecordNotFound) {
		out.Class = ClassNotFound
		return out
	}

	var stater sqlStater
	if errors.As(err, &stater) {
		out.SQLState = stater.SQLState()
		out.Class = classForSQLState(out.SQLState)
		out.Constraint = constraintNameOf(err)
		return out
	}

	// GORM's own translated errors, for drivers configured to produce them.
	switch {
	case errors.Is(err, gorm.ErrDuplicatedKey):
		out.Class = ClassDuplicate
	case errors.Is(err, gorm.ErrForeignKeyViolated):
		out.Class = ClassForeignKey
	}
	// gorm v1.25 has no check-constraint sentinel; that class arrives via
	// SQLSTATE 23514 above.
	return out
}

// classForSQLState maps the codes that carry meaning for this application.
//
// Deliberate, not exhaustive: every code that is not mapped becomes
// ClassUnknown, because guessing a class from an unfamiliar code is how a
// "duplicate" turns out to have been a disk failure.
func classForSQLState(code string) Class {
	switch code {
	case "23505": // unique_violation
		return ClassDuplicate
	case "23503", // foreign_key_violation
		"23504": // (reserved in some servers) dependent objects
		return ClassForeignKey
	case "23502", // not_null_violation
		"23514", // check_violation
		"23P01": // exclusion_violation
		return ClassConstraint
	case "22001", // string_data_right_truncation
		"22003", // numeric_value_out_of_range
		"22007", // invalid_datetime_format
		"22021", // character_not_in_repertoire
		"22023", // invalid_parameter_value
		"22P02", // invalid_text_representation — the cast error that quotes the value
		"22P05": // untranslatable_character
		return ClassInvalidValue
	default:
		return ClassUnknown
	}
}

// constraintNameOf returns the failing constraint's name, or "".
//
// Read from the typed field rather than parsed out of the message, because
// parsing the message means handling the message, and the message is the thing
// this package exists to discard.
func constraintNameOf(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.ConstraintName
	}
	return ""
}

// ConstraintName returns the constraint or index that rejected the statement,
// or "" when err is not a persistence failure or carried no constraint.
//
// This is how an EXPECTED duplicate is distinguished from an unexpected one.
// Compare it against a named index from a migration — never against a substring
// of an error message.
func ConstraintName(err error) string {
	var e *Error
	if errors.As(err, &e) {
		return e.Constraint
	}
	return ""
}

// IsDuplicateOn reports whether err is a unique violation raised by the named
// constraint or index.
//
// Both halves are required. A duplicate on a DIFFERENT constraint is a real
// failure and must not be swallowed, and a non-duplicate error on the same
// constraint is not a race loss either.
//
// It accepts an error that has NOT been through the boundary and reduces it
// here. Every persistence path is sanitized, so that should not arise — but the
// point of this function is that a CALLER never has to know what a driver error
// looks like, and "unless it arrives raw, in which case inspect pgconn
// yourself" would defeat it. All driver knowledge stays in this package.
func IsDuplicateOn(err error, constraint string) bool {
	if err == nil {
		return false
	}
	var e *Error
	if !errors.As(err, &e) {
		if reduced, ok := From(err, "unknown").(*Error); ok {
			e = reduced
		} else {
			return false
		}
	}
	return e.Class == ClassDuplicate && e.Constraint == constraint
}

// ClassOf reports the class of err, and whether it was a persistence failure
// at all. Handlers and logs use this instead of inspecting the error.
func ClassOf(err error) (Class, bool) {
	var e *Error
	if errors.As(err, &e) {
		return e.Class, true
	}
	return "", false
}

// HTTPStatus returns the status and public message for a persistence failure.
//
// `ok` is false for anything that is not one — a domain error or a validation
// message — so a handler can pass those through untouched. That distinction is
// the point: this contains persistence failures and leaves the application's
// own errors alone.
func HTTPStatus(err error) (status int, message string, ok bool) {
	var e *Error
	if !errors.As(err, &e) {
		return 0, "", false
	}
	code, found := httpStatus[e.Class]
	if !found {
		code = http.StatusInternalServerError
	}
	return code, e.Error(), true
}

// Detail returns the safe log string for a persistence failure, or "" when err
// is not one.
func Detail(err error) string {
	var e *Error
	if errors.As(err, &e) {
		return e.LogDetail()
	}
	return ""
}
