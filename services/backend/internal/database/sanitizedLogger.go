package database

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/Tinovalabs/vibaar/services/backend/internal/dberr"
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
			classifyDBError(err), float64(elapsed.Nanoseconds())/1e6, rows,
			redactSQLLiterals(sql))

	case l.slowThreshold != 0 && elapsed > l.slowThreshold && l.level >= gormlogger.Warn:
		sql, rows := fc()
		l.out.Printf("gorm slow query duration_ms=%.2f rows=%d sql=%q",
			float64(elapsed.Nanoseconds())/1e6, rows, redactSQLLiterals(sql))

	case l.level >= gormlogger.Info:
		sql, rows := fc()
		l.out.Printf("gorm query duration_ms=%.2f rows=%d sql=%q",
			float64(elapsed.Nanoseconds())/1e6, rows, redactSQLLiterals(sql))
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
	// A boundary-sanitized error (internal/dberr) has already replaced the
	// driver error by the time the logger runs — GORM's processor executes the
	// callbacks first and passes the RESULTING error to Trace. It carries the
	// SQLSTATE forward, so read it; otherwise every failure would log as
	// "unclassified" and this line would lose the only diagnostic it has.
	if class, ok := dberr.ClassOf(err); ok {
		var e *dberr.Error
		if errors.As(err, &e) && e.SQLState != "" {
			return fmt.Sprintf("sqlstate_%s", e.SQLState)
		}
		return string(class)
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

// redactSQLLiterals removes every literal from a statement, leaving its shape.
//
// ParamsFilter is not sufficient on its own, and this was MEASURED rather than
// assumed. `db.Raw(...).Scan(&dest)` — used throughout this codebase for counts
// and projections — does not log through the configured logger's filter:
//
//	// gorm@v1.25.7/finisher_api.go:525-547
//	currentLogger, newLogger := config.Logger, logger.Recorder.New()
//	config.Logger = newLogger
//	...
//	currentLogger.Trace(ctx, newLogger.BeginAt, func() (string, int64) {
//	    return newLogger.SQL, tx.RowsAffected
//	}, tx.Error)
//
// Scan installs GORM's traceRecorder for the duration of the call. The
// processor only applies ParamsFilter when `db.Logger` implements it
// (callbacks.go:136), and traceRecorder does not — so Explain interpolates the
// values, the recorder stores the interpolated string, and our logger is handed
// SQL whose values are already inside it. A failing Scan on a shipping lookup
// logged the buyer's street in full.
//
// A logger cannot tell whether its input was filtered, so it stops trusting the
// input: literals are removed at the point of printing. What survives is the
// operation, the tables and the columns — the diagnostic part — and a `?` where
// each value was.
func redactSQLLiterals(sql string) string {
	var b strings.Builder
	b.Grow(len(sql))

	for i := 0; i < len(sql); {
		c := sql[i]

		switch {
		// A single-quoted string literal, which is how Explain renders every
		// text, time and uuid value. '' is an escaped quote, not a terminator.
		case c == '\'':
			b.WriteString("'?'")
			i++
			for i < len(sql) {
				if sql[i] == '\'' {
					if i+1 < len(sql) && sql[i+1] == '\'' {
						i += 2
						continue
					}
					i++
					break
				}
				i++
			}

		// $1, $2 — a placeholder, which is what a FILTERED statement looks
		// like. Kept: it is the shape, not a value.
		case c == '$' && i+1 < len(sql) && isDigit(sql[i+1]):
			b.WriteByte(c)
			i++
			for i < len(sql) && isDigit(sql[i]) {
				b.WriteByte(sql[i])
				i++
			}

		// $tag$ ... $tag$ — dollar quoting. Skipped wholesale; the delimiter is
		// chosen by the writer, so the only safe reading is "everything between
		// the two occurrences".
		case c == '$':
			if end, tag := dollarQuoteTag(sql, i); tag != "" {
				b.WriteString(tag + "?" + tag)
				if next := strings.Index(sql[end:], tag); next >= 0 {
					i = end + next + len(tag)
				} else {
					i = len(sql)
				}
			} else {
				b.WriteByte(c)
				i++
			}

		// A bare numeric literal: how Explain renders ints and numerics. Only
		// when it STARTS a token, so int4, sha256 and column_2 are untouched.
		case isDigit(c) && !isIdentChar(prevByte(sql, i)):
			b.WriteByte('?')
			for i < len(sql) && (isDigit(sql[i]) || sql[i] == '.') {
				i++
			}

		default:
			b.WriteByte(c)
			i++
		}
	}
	return b.String()
}

// dollarQuoteTag reports the $tag$ opening at i, and the index just past it.
func dollarQuoteTag(sql string, i int) (end int, tag string) {
	for j := i + 1; j < len(sql); j++ {
		if sql[j] == '$' {
			return j + 1, sql[i : j+1]
		}
		if !isIdentChar(sql[j]) {
			return 0, ""
		}
	}
	return 0, ""
}

func isDigit(c byte) bool { return c >= '0' && c <= '9' }

func isIdentChar(c byte) bool {
	return c == '_' || c == '$' ||
		(c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || isDigit(c)
}

func prevByte(s string, i int) byte {
	if i == 0 {
		return ' '
	}
	return s[i-1]
}
