package database

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
)

// SQL logging that cannot put customer data into a log.
//
// The database logger was `LogLevel: logger.Info` in every environment, which
// logs every statement WITH ITS VALUES. So an ordinary checkout wrote lines
// like:
//
//	INSERT INTO "shipping_users" ("first_name","last_name","phone","email",…)
//	VALUES ('Ada','Obi','+234…','ada@example.com',…)
//
// into Render's retained logs — every address, phone, email, name and BVN
// reference the application has ever written, across every table. Verified
// present on staging.
//
// Two things leak, and fixing only one is not enough:
//
//  1. The STATEMENT. GORM interpolates `Vars` into the SQL before logging,
//     unless the logger's ParamsFilter suppresses them — which is what
//     `ParameterizedQueries` does. With it on, the log shows `$1, $2` and the
//     values never reach the formatter.
//
//  2. The ERROR. GORM prints `err` verbatim at Error level, and a driver error
//     is not a safe string. Measured, not assumed — for this driver:
//
//       - a cast/syntax error DOES carry the submitted value:
//         `invalid input syntax for type bigint: "ada@example.com" (SQLSTATE 22P02)`
//       - a unique violation does NOT, because pgconn's Error() is
//         severity + message + SQLSTATE and the `Key (email)=(…)` part lives in
//         DETAIL, which Error() omits.
//
//     One leaking class is enough: the error text is not a safe string, so it
//     is never printed. Dropping to Warn does not help either — Warn still
//     prints the error on a slow query, and Error level is exactly where the
//     message appears. This is why "Warn by itself is not sufficient".
//
// So the driver error is never printed. What is printed instead is its SQLSTATE
// — `23505` for a unique violation, `23503` for a foreign key — which is the
// part that tells an engineer what happened and contains no data. SQLSTATE is
// read through a tiny interface assertion rather than by importing pgconn, so
// this adds no dependency and works for any driver that exposes it.

// sqlStater is implemented by *pgconn.PgError (and lib/pq's *pq.Error, via
// Code). Asserted rather than imported to keep the driver out of this package.
type sqlStater interface{ SQLState() string }

// sanitizedGormLogger logs the shape of a query and the class of a failure,
// never a value.
type sanitizedGormLogger struct {
	level         gormlogger.LogLevel
	slowThreshold time.Duration
	out           *log.Logger
}

// NewSanitizedGormLogger returns the GORM logger for non-local environments.
//
// It deliberately does NOT offer a "log values" mode. A flag that re-enables
// value logging is a flag someone sets on staging to debug something and
// forgets, which is how the original setting survived.
func NewSanitizedGormLogger(out *log.Logger) gormlogger.Interface {
	if out == nil {
		out = log.New(os.Stdout, "", log.LstdFlags)
	}
	return &sanitizedGormLogger{
		// Error, so a failing query is still visible. The SQL it logs is
		// parameterized and the error is reduced to a SQLSTATE, so this level
		// cannot emit a value.
		level:         gormlogger.Error,
		slowThreshold: time.Second,
		out:           out,
	}
}

func (l *sanitizedGormLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	clone := *l
	clone.level = level
	return &clone
}

// Info, Warn and Error carry GORM's own diagnostics (for example "record not
// found"), which are format strings from the library rather than row data.
// They are forwarded with their arguments FORMATTED OUT: `data` on these calls
// can include a primary key or, in some code paths, a struct, and none of it is
// needed to understand a library-level message.
func (l *sanitizedGormLogger) Info(_ context.Context, msg string, _ ...interface{}) {
	if l.level >= gormlogger.Info {
		l.out.Printf("gorm info: %s", msg)
	}
}

func (l *sanitizedGormLogger) Warn(_ context.Context, msg string, _ ...interface{}) {
	if l.level >= gormlogger.Warn {
		l.out.Printf("gorm warn: %s", msg)
	}
}

func (l *sanitizedGormLogger) Error(_ context.Context, msg string, _ ...interface{}) {
	if l.level >= gormlogger.Error {
		l.out.Printf("gorm error: %s", msg)
	}
}

// Trace is the statement log. Duration, row count, parameterized SQL, and a
// CLASSIFICATION of any error — never the error's text.
func (l *sanitizedGormLogger) Trace(
	_ context.Context, begin time.Time, fc func() (string, int64), err error,
) {
	if l.level <= gormlogger.Silent {
		return
	}
	elapsed := time.Since(begin)

	switch {
	case err != nil && l.level >= gormlogger.Error:
		// ErrRecordNotFound is ordinary control flow — a lookup that found
		// nothing — and logging it as an error buries the real ones.
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return
		}
		sql, rows := fc()
		l.out.Printf("gorm query failed class=%s duration_ms=%.2f rows=%d sql=%q",
			classifyDBError(err), float64(elapsed.Nanoseconds())/1e6, rows, sql)

	case l.slowThreshold != 0 && elapsed > l.slowThreshold && l.level >= gormlogger.Warn:
		sql, rows := fc()
		l.out.Printf("gorm slow query duration_ms=%.2f rows=%d sql=%q",
			float64(elapsed.Nanoseconds())/1e6, rows, sql)

	case l.level >= gormlogger.Info:
		sql, rows := fc()
		l.out.Printf("gorm query duration_ms=%.2f rows=%d sql=%q",
			float64(elapsed.Nanoseconds())/1e6, rows, sql)
	}
}

// ParamsFilter is GORM's hook for deciding whether the statement's values are
// interpolated into the logged SQL. Returning nil params is what
// `ParameterizedQueries: true` does in the stock logger, and it is the reason
// the `sql` above reads `$1, $2` rather than the row.
//
// Unconditional: there is no environment in which this logger interpolates.
func (l *sanitizedGormLogger) ParamsFilter(
	_ context.Context, sql string, _ ...interface{},
) (string, []interface{}) {
	return sql, nil
}

// classifyDBError reduces a driver error to something safe to print.
//
// The SQLSTATE is the useful half — 23505 unique violation, 23503 foreign key,
// 23502 not-null, 42703 undefined column — and it carries no data. The
// message is discarded because pgx puts the offending value in it.
func classifyDBError(err error) string {
	if err == nil {
		return "none"
	}
	var stater sqlStater
	if errors.As(err, &stater) {
		return fmt.Sprintf("sqlstate_%s", stater.SQLState())
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "record_not_found"
	}
	// Deliberately not err.Error(): an unrecognised error is still a driver
	// error, and its text is still a place a value can hide.
	return "unclassified"
}

// newGormLogger picks the database logger for the current environment.
//
// Extracted from ConnectDB so the CHOICE is testable without a live database.
// The choice is the load-bearing part: the sanitized logger being correct is
// worth nothing if the stock one is still installed, and that wiring was
// previously only reachable by opening a real connection.
func newGormLogger(out *log.Logger) gormlogger.Interface {
	if IsLocalDevelopment() {
		// Local only: values interpolated, coloured, Info level. ParameterizedQueries
		// is deliberately NOT set here — this is the one environment that is
		// meant to show them.
		return gormlogger.New(out, gormlogger.Config{
			SlowThreshold: time.Second,
			LogLevel:      gormlogger.Info,
			Colorful:      true,
		})
	}
	return NewSanitizedGormLogger(out)
}

// IsLocalDevelopment reports whether value-level SQL logging is permissible.
//
// Local only, and via the canonical resolver rather than a raw ENV read, so a
// half-set deploy cannot accidentally qualify.
func IsLocalDevelopment() bool {
	return helper.ResolveEnv(os.Getenv) == "local"
}
