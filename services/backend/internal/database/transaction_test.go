package database

import (
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/go-playground/validator/v10"
	"gorm.io/gorm"

	"github.com/Tinovalabs/vibaar/services/backend/internal/dberr"
)

// deferredFixture adds a table whose UNIQUE constraint is DEFERRABLE INITIALLY
// DEFERRED, so the violation is raised at COMMIT rather than at INSERT.
//
// That is the only way to exercise the gap this helper closes: GORM's Commit
// talks to the driver directly, runs no callbacks, and so returns an
// unsanitized *pgconn.PgError. Verified against this database — the inserts
// both succeed and the commit fails with:
//
//	ERROR: duplicate key value violates unique constraint
//	"deferred_probe_token_key" (SQLSTATE 23505)
func (f *sanitizerFixture) addDeferredTable(t *testing.T) {
	t.Helper()
	if err := f.raw.Exec(`CREATE TABLE deferred_probe (
		id text PRIMARY KEY,
		token text,
		CONSTRAINT deferred_probe_token_key UNIQUE (token) DEFERRABLE INITIALLY DEFERRED
	)`).Error; err != nil {
		t.Fatalf("fixture: %v", err)
	}
}

// insertColliding writes two rows that conflict on the deferred constraint.
// Both inserts succeed; only the commit fails.
func insertColliding(tx *gorm.DB, token string) error {
	if err := tx.Exec(`INSERT INTO deferred_probe (id, token) VALUES ('a', ?)`, token).Error; err != nil {
		return err
	}
	return tx.Exec(`INSERT INTO deferred_probe (id, token) VALUES ('b', ?)`, token).Error
}

// Requirement: a commit failure is typed, sanitized, and returned — never
// reported as success.
func TestWithTransaction_CommitFailureIsSanitizedAndReturned(t *testing.T) {
	f := newSanitizerFixture(t)
	f.addDeferredTable(t)

	// First, establish what the RAW commit error looks like, or the assertions
	// below are vacuous.
	//
	// Note what it does NOT contain: the submitted value. Measured —
	//
	//	ERROR: duplicate key value violates unique constraint
	//	"deferred_probe_token_key" (SQLSTATE 23505)
	//
	// pgconn's Error() is severity + message + SQLSTATE, and the
	// `Key (token)=(...)` part lives in DETAIL, which Error() omits. So for a
	// unique violation what leaks is the driver's PHRASING and the constraint
	// name, and that is what this case proves is contained. The value-carrying
	// commit failure is the next test, which uses a deferred constraint trigger.
	rawTx := f.raw.Begin()
	if err := insertColliding(rawTx, sentinelStreet); err != nil {
		t.Fatalf("the inserts should succeed — the constraint is deferred: %v", err)
	}
	rawCommit := rawTx.Commit().Error
	if rawCommit == nil {
		t.Fatal("the commit succeeded; the constraint is not deferred and nothing here " +
			"is under test")
	}
	for _, leak := range []string{"duplicate key value violates unique constraint", "SQLSTATE 23505"} {
		if !strings.Contains(rawCommit.Error(), leak) {
			t.Fatalf("the RAW commit error no longer contains %q, so this case cannot "+
				"demonstrate containment. Driver said: %q", leak, rawCommit.Error())
		}
	}
	if _, ok := dberr.ClassOf(rawCommit); ok {
		t.Fatal("the RAW commit error is already sanitized, so this test proves nothing " +
			"about the helper")
	}
	f.raw.Exec(`DELETE FROM deferred_probe`)

	// Now through the helper.
	var fnReturned bool
	err := WithTransaction(f.sanitized, "probe_commit", func(tx *gorm.DB) error {
		if err := insertColliding(tx, sentinelStreet); err != nil {
			return err
		}
		fnReturned = true
		return nil
	})

	if !fnReturned {
		t.Fatal("fn did not reach its end; the failure was not at commit time")
	}
	if err == nil {
		t.Fatal("WithTransaction reported SUCCESS on a failed commit — the write was " +
			"never durable and the caller was told it was")
	}

	// Typed and classified.
	class, ok := dberr.ClassOf(err)
	if !ok {
		t.Fatalf("the commit error is not a typed persistence error: %v", err)
	}
	if class != dberr.ClassDuplicate {
		t.Errorf("class = %q, want %q", class, dberr.ClassDuplicate)
	}
	var e *dberr.Error
	errors.As(err, &e)
	if e.SQLState != "23505" {
		t.Errorf("sqlstate = %q, want 23505", e.SQLState)
	}
	if e.Constraint != "deferred_probe_token_key" {
		t.Errorf("constraint = %q, want deferred_probe_token_key", e.Constraint)
	}
	if e.Op != "probe_commit" {
		t.Errorf("op = %q, want probe_commit — the label identifies the transaction", e.Op)
	}

	// Sanitized on every surface the error offers.
	assertNoSentinels(t, err.Error(), "commit error")
	assertNoSentinels(t, fmt.Sprintf("%v / %+v", err, err), "formatted commit error")
	assertNoSentinels(t, dberr.Detail(err), "commit log detail")
	for _, banned := range []string{
		"duplicate key value", "SQLSTATE", "23505",
		// The constraint name is safe to LOG but describes the schema, so it
		// does not belong in a message that reaches a client.
		"deferred_probe_token_key",
	} {
		if strings.Contains(err.Error(), banned) {
			t.Errorf("the commit error carries %q: %q", banned, err.Error())
		}
	}
	// It IS in the safe log detail, which is the whole point of separating them.
	if !strings.Contains(dberr.Detail(err), "constraint=deferred_probe_token_key") {
		t.Errorf("the log detail lost the constraint name: %q", dberr.Detail(err))
	}

	// Rollback behaviour: nothing survived the failed commit.
	var rows int64
	f.raw.Raw(`SELECT count(*) FROM deferred_probe`).Scan(&rows)
	if rows != 0 {
		t.Errorf("%d row(s) survived a failed commit", rows)
	}

	// And the GORM log carries the classification without the value.
	assertNoSentinels(t, f.gormLog.String(), "gorm output")
}

// The asymmetry that keeps this change from swallowing useful errors: fn's own
// error is returned untouched, with its own message and its own type.
func TestWithTransaction_DomainErrorPassesThroughUntouched(t *testing.T) {
	f := newSanitizerFixture(t)
	f.addDeferredTable(t)

	domainErr := errors.New("insufficient balance: ₦500 available")
	err := WithTransaction(f.sanitized, "probe_domain", func(tx *gorm.DB) error {
		if err := tx.Exec(`INSERT INTO deferred_probe (id, token) VALUES ('a', 'x')`).Error; err != nil {
			return err
		}
		return domainErr
	})

	if !errors.Is(err, domainErr) {
		t.Fatalf("the domain error did not survive: %v", err)
	}
	if err.Error() != domainErr.Error() {
		t.Errorf("the message changed: %q, want %q", err.Error(), domainErr.Error())
	}
	if _, ok := dberr.ClassOf(err); ok {
		t.Error("a domain error was reduced to a persistence class; a handler would " +
			"replace its message with a generic one")
	}

	// And it still rolled back.
	var rows int64
	f.raw.Raw(`SELECT count(*) FROM deferred_probe`).Scan(&rows)
	if rows != 0 {
		t.Errorf("%d row(s) survived a failed transaction", rows)
	}
}

// A repository error from inside fn is already sanitized by the CRUD boundary,
// so it arrives typed — and must not be re-labelled by the helper.
func TestWithTransaction_RepositoryErrorKeepsItsOwnClass(t *testing.T) {
	f := newSanitizerFixture(t)
	f.addDeferredTable(t)

	err := WithTransaction(f.sanitized, "probe_repo", func(tx *gorm.DB) error {
		// Immediate (non-deferred) failure: a cast error inside fn.
		var out []string
		return tx.Raw(`SELECT id FROM deferred_probe WHERE id::int = ?`, sentinelStreet).
			Scan(&out).Error
	})
	if err == nil {
		t.Fatal("expected a failure")
	}
	class, ok := dberr.ClassOf(err)
	if !ok {
		t.Fatalf("not typed: %v", err)
	}
	if class != dberr.ClassInvalidValue {
		t.Errorf("class = %q, want %q — the helper re-labelled an error it should "+
			"have passed through", class, dberr.ClassInvalidValue)
	}
	assertNoSentinels(t, err.Error(), "repository error through the helper")
}

// Success commits. Stated because a helper that quietly rolled everything back
// would pass every failure test above.
func TestWithTransaction_SuccessCommits(t *testing.T) {
	f := newSanitizerFixture(t)
	f.addDeferredTable(t)

	if err := WithTransaction(f.sanitized, "probe_ok", func(tx *gorm.DB) error {
		return tx.Exec(`INSERT INTO deferred_probe (id, token) VALUES ('a', 'unique-1')`).Error
	}); err != nil {
		t.Fatalf("WithTransaction: %v", err)
	}

	var rows int64
	f.raw.Raw(`SELECT count(*) FROM deferred_probe`).Scan(&rows)
	if rows != 1 {
		t.Errorf("rows = %d, want 1 — the commit did not happen", rows)
	}
}

// Nesting, which is the reason this delegates to db.Transaction instead of
// calling Begin itself.
//
// A manual Begin() on a handle that is already a transaction leaves ConnPool
// pointing at the CALLER's transaction, so the inner Rollback() aborts the
// outer one. This codebase has already lost a created order that way. Here the
// inner failure must roll back only its own savepoint.
func TestWithTransaction_NestedFailureDoesNotKillTheOuterTransaction(t *testing.T) {
	f := newSanitizerFixture(t)
	f.addDeferredTable(t)

	err := WithTransaction(f.sanitized, "outer", func(outer *gorm.DB) error {
		if err := outer.Exec(`INSERT INTO deferred_probe (id, token) VALUES ('outer', 'tok-outer')`).Error; err != nil {
			return err
		}

		// An inner transaction that fails. Its error is deliberately swallowed
		// here, which is what a caller doing best-effort work would do.
		innerRan := false
		innerErr := WithTransaction(outer, "inner", func(inner *gorm.DB) error {
			innerRan = true
			if err := inner.Exec(`INSERT INTO deferred_probe (id, token) VALUES ('inner', 'tok-inner')`).Error; err != nil {
				return err
			}
			return errors.New("inner failed on purpose")
		})
		// Both halves matter. A helper that refuses to nest at all — which is
		// what a manual Begin() on a tx handle does, since *sql.Tx is not a
		// TxBeginner and GORM returns ErrInvalidTransaction — would also leave
		// the outer row intact, and would look identical without this.
		if !innerRan {
			return errors.New("the inner fn never ran: nesting is not supported")
		}
		if innerErr == nil {
			return errors.New("the inner transaction reported success")
		}
		return nil
	})
	if err != nil {
		t.Fatalf("the OUTER transaction failed because of an inner rollback: %v", err)
	}

	// The outer row committed; the inner row did not.
	var ids []string
	f.raw.Raw(`SELECT id FROM deferred_probe ORDER BY id`).Scan(&ids)
	if len(ids) != 1 || ids[0] != "outer" {
		t.Errorf("rows = %v, want exactly [outer] — the savepoint boundary is wrong", ids)
	}
}

// A Begin failure is sanitized too. Induced by closing the pool, which is the
// one Begin failure reachable without breaking the server.
func TestWithTransaction_BeginFailureIsSanitized(t *testing.T) {
	f := newSanitizerFixture(t)

	sqlDB, err := f.sanitized.DB()
	if err != nil {
		t.Fatalf("pool: %v", err)
	}
	_ = sqlDB.Close()

	called := false
	txErr := WithTransaction(f.sanitized, "probe_begin", func(tx *gorm.DB) error {
		called = true
		return nil
	})
	if txErr == nil {
		t.Fatal("WithTransaction reported success although Begin failed")
	}
	if called {
		t.Error("fn ran although the transaction was never opened")
	}
	if _, ok := dberr.ClassOf(txErr); !ok {
		t.Errorf("the Begin error is not typed: %v", txErr)
	}
	assertNoSentinels(t, txErr.Error(), "begin error")
}

// A commit-time failure whose driver message DOES quote the submitted value.
//
// A deferred CONSTRAINT TRIGGER runs at commit and can raise with the row in
// its message, so this is the commit-path equivalent of the cast error that
// motivated the whole change — and unlike a unique violation, the value really
// is in the text. Postgres allows deferring UNIQUE, PK, FK, EXCLUDE and
// constraint triggers; CHECK cannot be deferred, which is why a trigger is the
// mechanism here.
func TestWithTransaction_CommitFailureCarryingAValueIsContained(t *testing.T) {
	f := newSanitizerFixture(t)
	f.addDeferredTable(t)

	// The trigger names the offending value, exactly as a driver error would.
	if err := f.raw.Exec(`CREATE FUNCTION reject_probe_token() RETURNS trigger AS $fn$
		BEGIN
			IF NEW.token LIKE '%Sentinel%' THEN
				RAISE EXCEPTION 'token rejected at commit: %', NEW.token;
			END IF;
			RETURN NEW;
		END;
	$fn$ LANGUAGE plpgsql`).Error; err != nil {
		t.Fatalf("fixture function: %v", err)
	}
	if err := f.raw.Exec(`CREATE CONSTRAINT TRIGGER deferred_probe_token_check
		AFTER INSERT ON deferred_probe
		DEFERRABLE INITIALLY DEFERRED
		FOR EACH ROW EXECUTE FUNCTION reject_probe_token()`).Error; err != nil {
		t.Fatalf("fixture trigger: %v", err)
	}

	// Non-vacuity: the raw commit error really does quote the sentinel.
	rawTx := f.raw.Begin()
	if err := rawTx.Exec(`INSERT INTO deferred_probe (id, token) VALUES ('a', ?)`, sentinelStreet).Error; err != nil {
		t.Fatalf("the insert should succeed — the trigger is deferred: %v", err)
	}
	rawCommit := rawTx.Commit().Error
	requireLeak(t, sentinelStreet, rawCommit)

	f.raw.Exec(`DELETE FROM deferred_probe`)

	// Through the helper.
	insideOK := false
	err := WithTransaction(f.sanitized, "probe_trigger", func(tx *gorm.DB) error {
		if err := tx.Exec(`INSERT INTO deferred_probe (id, token) VALUES ('a', ?)`, sentinelStreet).Error; err != nil {
			return err
		}
		insideOK = true
		return nil
	})
	if !insideOK {
		t.Fatal("the insert failed inside the transaction; the trigger is not deferred")
	}
	if err == nil {
		t.Fatal("WithTransaction reported success although the commit was rejected")
	}

	// Typed, and not guessed at: RAISE EXCEPTION is P0001, which is not a code
	// this application maps, so it must classify as unknown rather than be
	// forced into a familiar class.
	class, ok := dberr.ClassOf(err)
	if !ok {
		t.Fatalf("not typed: %v", err)
	}
	if class != dberr.ClassUnknown {
		t.Errorf("class = %q, want %q for an unmapped SQLSTATE", class, dberr.ClassUnknown)
	}
	var e *dberr.Error
	errors.As(err, &e)
	if e.SQLState != "P0001" {
		t.Errorf("sqlstate = %q, want P0001", e.SQLState)
	}

	// The value is gone from every surface.
	assertNoSentinels(t, err.Error(), "commit error")
	assertNoSentinels(t, fmt.Sprintf("%v / %+v", err, err), "formatted")
	assertNoSentinels(t, dberr.Detail(err), "log detail")
	assertNoSentinels(t, f.gormLog.String(), "gorm output")
	if strings.Contains(err.Error(), "token rejected at commit") {
		t.Errorf("the trigger's message survived: %q", err.Error())
	}

	// Rollback held.
	var rows int64
	f.raw.Raw(`SELECT count(*) FROM deferred_probe`).Scan(&rows)
	if rows != 0 {
		t.Errorf("%d row(s) survived a rejected commit", rows)
	}
}

// The other half of nesting: an inner transaction that SUCCEEDS commits with
// the outer one.
//
// This is what distinguishes real savepoint nesting from a helper that simply
// refuses to nest. A manual Begin() on a transaction handle returns
// ErrInvalidTransaction, so the inner work never happens — and a test that only
// checks the failure path cannot tell that apart from correct behaviour.
func TestWithTransaction_NestedSuccessCommitsWithTheOuter(t *testing.T) {
	f := newSanitizerFixture(t)
	f.addDeferredTable(t)

	err := WithTransaction(f.sanitized, "outer", func(outer *gorm.DB) error {
		if err := outer.Exec(`INSERT INTO deferred_probe (id, token) VALUES ('outer', 'tok-1')`).Error; err != nil {
			return err
		}
		return WithTransaction(outer, "inner", func(inner *gorm.DB) error {
			return inner.Exec(`INSERT INTO deferred_probe (id, token) VALUES ('inner', 'tok-2')`).Error
		})
	})
	if err != nil {
		t.Fatalf("nested transaction failed: %v", err)
	}

	var ids []string
	f.raw.Raw(`SELECT id FROM deferred_probe ORDER BY id`).Scan(&ids)
	if len(ids) != 2 || ids[0] != "inner" || ids[1] != "outer" {
		t.Errorf("rows = %v, want [inner outer] — nested work was lost", ids)
	}
}

// multiError's dynamic type is NOT comparable: it carries a slice. Comparing
// two error interfaces that both hold it is a runtime panic.
type multiError struct{ causes []string }

func (e multiError) Error() string { return strings.Join(e.causes, "; ") }

// Regression: WithTransaction must not compare error interfaces.
//
// The first version of this helper decided "did fn fail, or did the commit?"
// with `err == fnErr`. That is an interface comparison, and Go panics on one
// when the dynamic type cannot be compared:
//
//	runtime error: comparing uncomparable type validator.ValidationErrors
//
// ValidationErrors is not a contrived type — it is a slice type, and it is what
// c.ShouldBind returns throughout this application, so any fn that validates
// and returns that error would have taken down the request. Any error carrying
// a slice, map or func field does the same.
//
// errors.Is is not the fix. It guards the comparison so it does not panic, but
// it returns false for a non-comparable error compared against itself, so the
// domain error would fall through to dberr.From and be replaced by a generic
// message. The subtests below assert both halves: no panic, AND the original
// error returned unchanged.
func TestWithTransaction_NonComparableErrorNeitherPanicsNorIsSanitized(t *testing.T) {
	// First, establish that the old implementation really would have panicked,
	// or this test is defending against nothing.
	t.Run("the comparison it replaced does panic", func(t *testing.T) {
		for name, err := range map[string]error{
			"a struct error with a slice field": multiError{causes: []string{"a", "b"}},
			"validator.ValidationErrors":        validator.ValidationErrors{},
		} {
			t.Run(name, func(t *testing.T) {
				var recovered interface{}
				func() {
					defer func() { recovered = recover() }()
					var a, b error = err, err
					// Exactly the expression WithTransaction used to evaluate.
					_ = a == b
				}()
				if recovered == nil {
					t.Fatalf("`err == fnErr` did not panic for %T, so this type no "+
						"longer reproduces the defect", err)
				}
				if !strings.Contains(fmt.Sprint(recovered), "uncomparable") {
					t.Errorf("panicked for another reason: %v", recovered)
				}
			})
		}
	})

	cases := map[string]error{
		"a struct error with a slice field": multiError{causes: []string{"insufficient balance", "no bank account"}},
		"validator.ValidationErrors":        validator.ValidationErrors{},
	}

	for name, domainErr := range cases {
		t.Run(name, func(t *testing.T) {
			f := newSanitizerFixture(t)
			f.addDeferredTable(t)

			var returned error
			func() {
				defer func() {
					if r := recover(); r != nil {
						t.Fatalf("WithTransaction panicked on a non-comparable error "+
							"from fn: %v", r)
					}
				}()
				returned = WithTransaction(f.sanitized, "probe_noncomparable",
					func(tx *gorm.DB) error {
						if err := tx.Exec(
							`INSERT INTO deferred_probe (id, token) VALUES ('a', ?)`,
							sentinelStreet,
						).Error; err != nil {
							return err
						}
						return domainErr
					})
			}()

			if returned == nil {
				t.Fatal("WithTransaction reported success although fn failed")
			}

			// The ORIGINAL error, unchanged: same dynamic type, same message.
			if fmt.Sprintf("%T", returned) != fmt.Sprintf("%T", domainErr) {
				t.Errorf("type = %T, want %T — fn's error was replaced", returned, domainErr)
			}
			if returned.Error() != domainErr.Error() {
				t.Errorf("message = %q, want %q", returned.Error(), domainErr.Error())
			}
			if _, ok := dberr.ClassOf(returned); ok {
				t.Error("fn's own error was reduced to a persistence class; a handler " +
					"would replace its message with a generic one")
			}

			// And the transaction still rolled back.
			var rows int64
			f.raw.Raw(`SELECT count(*) FROM deferred_probe`).Scan(&rows)
			if rows != 0 {
				t.Errorf("%d row(s) survived", rows)
			}
		})
	}
}

// The specific value identity, for a type where it can be checked: what comes
// back is fn's error, not a copy assembled from it.
func TestWithTransaction_NonComparableErrorKeepsItsContents(t *testing.T) {
	f := newSanitizerFixture(t)
	f.addDeferredTable(t)

	domainErr := multiError{causes: []string{"first cause", "second cause"}}
	returned := WithTransaction(f.sanitized, "probe_contents", func(tx *gorm.DB) error {
		return domainErr
	})

	var got multiError
	if !errors.As(returned, &got) {
		t.Fatalf("the returned error is not a multiError: %T", returned)
	}
	if len(got.causes) != 2 || got.causes[0] != "first cause" || got.causes[1] != "second cause" {
		t.Errorf("causes = %v, want the original two", got.causes)
	}
}

// A failed ROLLBACK is not surfaced, and this pins that so the documentation on
// WithTransaction stays true rather than merely plausible.
//
// GORM rolls back from a deferred closure and drops the result
// (finisher_api.go: `defer func() { if panicked || err != nil { tx.Rollback() } }()`),
// so there is nothing for this helper to sanitize or return. Measured here by
// killing the backend mid-transaction, which makes Rollback() fail with
// `conn closed`.
//
// What must hold: fn's error still comes back unchanged, and the rollback
// failure does not replace or contaminate it.
func TestWithTransaction_RollbackFailureIsNotSurfaced(t *testing.T) {
	f := newSanitizerFixture(t)
	f.addDeferredTable(t)

	// Confirm a rollback really does fail this way, on a handle we then discard.
	probe := f.raw.Begin()
	probe.Exec(`INSERT INTO deferred_probe (id, token) VALUES ('probe', 'tok')`)
	var probePID int64
	probe.Raw(`SELECT pg_backend_pid()`).Scan(&probePID)
	_ = probe.Exec(`SELECT pg_terminate_backend(?)`, probePID).Error
	rollbackErr := probe.Rollback().Error
	if rollbackErr == nil {
		t.Skip("this server does not fail the rollback after the backend is " +
			"terminated, so there is no rollback failure to observe")
	}

	domainErr := errors.New("insufficient balance: ₦500 available")
	returned := WithTransaction(f.sanitized, "probe_rollback", func(tx *gorm.DB) error {
		if err := tx.Exec(`INSERT INTO deferred_probe (id, token) VALUES ('a', ?)`,
			sentinelStreet).Error; err != nil {
			return err
		}
		var pid int64
		tx.Raw(`SELECT pg_backend_pid()`).Scan(&pid)
		// Terminating our own backend makes the deferred ROLLBACK fail. The
		// statement's own error is expected and irrelevant.
		_ = tx.Exec(`SELECT pg_terminate_backend(?)`, pid).Error
		return domainErr
	})

	if returned == nil {
		t.Fatal("WithTransaction reported success")
	}
	// fn's error, unchanged — the rollback failure did not displace it.
	if !errors.Is(returned, domainErr) {
		t.Errorf("returned %v, want fn's own error", returned)
	}
	if returned.Error() != domainErr.Error() {
		t.Errorf("message = %q, want %q", returned.Error(), domainErr.Error())
	}
	// The documented gap: the rollback error is nowhere in the result, because
	// GORM discarded it. If this ever starts failing, WithTransaction has
	// gained the ability to see rollback failures and its doc comment must be
	// rewritten.
	if strings.Contains(returned.Error(), rollbackErr.Error()) {
		t.Errorf("the rollback error surfaced after all (%q); the doc comment on "+
			"WithTransaction says it cannot and must be corrected", rollbackErr)
	}
	assertNoSentinels(t, returned.Error(), "returned error")

	// Nothing was persisted: the server discarded the aborted transaction when
	// its backend died, which is why a lost rollback costs a diagnostic rather
	// than durability.
	var rows int64
	f.raw.Raw(`SELECT count(*) FROM deferred_probe WHERE id = 'a'`).Scan(&rows)
	if rows != 0 {
		t.Errorf("%d row(s) survived an aborted transaction", rows)
	}
}
