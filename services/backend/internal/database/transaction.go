package database

import (
	"gorm.io/gorm"

	"github.com/Tinovalabs/vibaar/services/backend/internal/dberr"
)

// WithTransaction is the one way this application runs a transaction.
//
// # Why a helper, when db.Transaction already exists
//
// Two problems, and neither is fixed by the callback boundary in
// errorSanitizer.go.
//
// FIRST: transaction control does not run callbacks. Measured in GORM's source
// rather than assumed —
//
//	// gorm@v1.25.7/finisher_api.go
//	func (db *DB) Commit() *DB {
//	    if committer, ok := db.Statement.ConnPool.(TxCommitter); ok && ... {
//	        db.AddError(committer.Commit())      // <- straight to the driver
//	    }
//	    ...
//	}
//
// Commit, Rollback and Begin call the driver and AddError the result directly;
// no processor runs, so no callback converts the error. The same is true of the
// final commit inside db.Transaction, which ends `return tx.Commit().Error`.
// A constraint declared DEFERRABLE INITIALLY DEFERRED fails THERE, at commit,
// as a raw *pgconn.PgError — verified against this database:
//
//	ERROR: duplicate key value violates unique constraint
//	"deferred_rows_token_key" (SQLSTATE 23505)
//
// so a commit-time failure was the one persistence error still reaching a
// handler unsanitized.
//
// SECOND: a commit that is not checked reports success. Six repository methods
// called `tx.Commit()` and returned nil regardless, and three opened a
// transaction and never committed it at all — so the write was never durable
// and the caller was told it was.
//
// # What it guarantees
//
//   - Begin, SavePoint and Commit failures are sanitized AND returned. A commit
//     failure can never become application success.
//   - An error from fn is returned UNTOUCHED. This is the important asymmetry:
//     fn's error is the application's own — "insufficient balance", a
//     validation message, or a repository error the CRUD boundary already
//     sanitized — and running it through dberr.From would replace a useful
//     message with a generic one. Only transaction-control errors, which carry
//     nothing but driver text, are converted.
//
// # What it does NOT do: a failed ROLLBACK is invisible
//
// Stated because the earlier wording claimed otherwise. GORM rolls back from a
// deferred closure and DISCARDS the result:
//
//	// gorm@v1.25.7/finisher_api.go, inside Transaction
//	defer func() {
//	    if panicked || err != nil {
//	        tx.Rollback()          // <- return value dropped
//	    }
//	}()
//
// So a rollback failure is neither sanitized nor returned, and this helper
// cannot surface one: the only way to see it would be to own the transaction
// lifecycle instead of delegating, which means re-implementing the savepoint
// nesting that the note above explains must not be re-implemented.
//
// The consequence is bounded, which is why delegating is still the right
// trade. A rollback runs in exactly two situations, and in both the
// transaction's work is already discarded by the server: after a failed
// COMMIT, where Postgres has aborted the transaction itself, and after fn
// returned an error, where the statements are abandoned. A rollback that then
// fails costs a diagnostic, not durability — and database/sql discards a
// connection it could not reset rather than returning it to the pool. What is
// lost is the ability to LOG that it happened. TestWithTransaction_RollbackFailureIsNotSurfaced
// pins that behaviour so this paragraph stays true.
//   - Nesting is safe. It delegates to db.Transaction, which opens a SAVEPOINT
//     when the handle is already inside a transaction. That is not a detail to
//     re-implement: a manual Begin() on a tx handle leaves ConnPool pointing at
//     the CALLER's transaction, so the inner Rollback() aborts the outer one.
//     This codebase has already lost a created order to exactly that (see the
//     note on OrderRepository.AppendActivity, fixed in 368a981).
//
// `op` labels the transaction in logs — "add_shipping_profile", not the SQL.
func WithTransaction(db *gorm.DB, op string, fn func(tx *gorm.DB) error) error {
	// Which failed — fn, or transaction control? db.Transaction returns fn's
	// error verbatim when fn fails and its own error otherwise, but it does not
	// say which, and the two need opposite treatment.
	//
	// Recorded as a BOOLEAN. The obvious `err == fnErr` is a comparison of two
	// error INTERFACES, and that panics at runtime when the dynamic type is not
	// comparable:
	//
	//	runtime error: comparing uncomparable type validator.ValidationErrors
	//
	// which is not a hypothetical type: ValidationErrors is a slice type, and
	// it is what c.ShouldBind returns throughout this application. Any error
	// carrying a slice, map or func field does the same. errors.Is is not the
	// fix either — it guards the comparison, so it does not panic, but it
	// returns FALSE for a non-comparable error compared against itself, and the
	// domain error would then be sanitized into a generic message. A flag
	// answers the question without comparing anything.
	var (
		fnErr    error
		fnFailed bool
	)

	err := db.Transaction(func(tx *gorm.DB) error {
		fnErr = fn(tx)
		fnFailed = fnErr != nil
		return fnErr
	})
	if err == nil {
		return nil
	}

	// fn failed: return its own error, the value fn produced.
	if fnFailed {
		return fnErr
	}

	// Anything else came from Begin, SavePoint or the final Commit.
	return dberr.From(err, op)
}
