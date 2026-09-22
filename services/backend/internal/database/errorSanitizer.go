package database

import (
	"gorm.io/gorm"

	"github.com/Tinovalabs/vibaar/services/backend/internal/dberr"
)

// The repository boundary, in one place.
//
// Every repository method in this codebase — 316 of them across 25 files —
// obtains its error from GORM. Converting it here means none of them has to be
// edited, and none of the 241 handler sites that echo `err.Error()` into a
// response has to be either: what they echo is already safe.
//
// The alternative was editing those 241 sites, and it was the wrong shape.
// Most of them are returning a DOMAIN error — "invalid user", "insufficient
// balance", a validation message — and those belong in the response. Replacing
// them wholesale would have removed the useful ones to contain the unsafe ones.
//
// # Why a callback rather than a wrapper per method
//
// A helper called by hand at 316 call sites is 316 chances to forget one, and
// the one that is forgotten is the one that leaks. This runs for every
// operation, including the ones added next year.
//
// # What it does not change
//
//   - TRANSACTIONS. `db.Transaction` rolls back on a non-nil error and does not
//     inspect its type; the converted error is still non-nil, so rollback is
//     unaffected.
//   - SENTINEL CHECKS. `errors.Is(err, gorm.ErrRecordNotFound)` is relied on at
//     sixty-plus sites and keeps working, because *dberr.Error implements Is
//     for it. What it breaks is `err == gorm.ErrRecordNotFound` — direct
//     equality — which five sites in the seeders used and which are converted
//     to errors.Is in this change. Direct equality was already fragile: it
//     fails against any wrapped error.
//   - MIGRATIONS. The versioned runner logs the failing STATEMENT (our own SQL,
//     not user data) and now a SQLSTATE instead of the driver text. Statement
//     plus SQLSTATE is enough to diagnose a migration, which is why no
//     passthrough escape hatch exists: an opt-out is a thing someone enables
//     while debugging and leaves on.
func registerErrorSanitizer(db *gorm.DB) error {
	const hookName = "vibaar:sanitize_error"

	// A closure per operation, so the label on the resulting error says which
	// kind of statement failed without naming the statement.
	sanitize := func(op string) func(*gorm.DB) {
		return func(tx *gorm.DB) {
			if tx.Error != nil {
				tx.Error = dberr.From(tx.Error, op)
			}
		}
	}

	// Every callback GORM exposes. Listed explicitly rather than derived: a
	// missing one is a silent hole.
	registrations := []func() error{
		func() error {
			return db.Callback().Create().After("gorm:create").Register(hookName, sanitize("create"))
		},
		func() error {
			return db.Callback().Query().After("gorm:query").Register(hookName, sanitize("query"))
		},
		func() error {
			return db.Callback().Update().After("gorm:update").Register(hookName, sanitize("update"))
		},
		func() error {
			return db.Callback().Delete().After("gorm:delete").Register(hookName, sanitize("delete"))
		},
		func() error {
			return db.Callback().Row().After("gorm:row").Register(hookName, sanitize("row"))
		},
		func() error {
			return db.Callback().Raw().After("gorm:raw").Register(hookName, sanitize("raw"))
		},
	}
	for _, register := range registrations {
		if err := register(); err != nil {
			return err
		}
	}
	return nil
}

// RegisterErrorSanitizer exposes the registration so a test can build a
// database that behaves exactly as the application's does. The containment is
// only meaningful if the thing under test is the thing that ships.
func RegisterErrorSanitizer(db *gorm.DB) error { return registerErrorSanitizer(db) }
