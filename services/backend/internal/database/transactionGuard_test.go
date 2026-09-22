package database

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// Transaction control belongs to WithTransaction, and this fails when a new
// call site takes it back.
//
// The rule is not stylistic. Three things go wrong when a repository drives a
// transaction by hand, and all three were present in this codebase:
//
//  1. `tx.Commit()` with no error check reports success on a failed commit.
//     Six methods did that.
//  2. `Begin()` with no commit at all — the write never becomes durable and the
//     connection is held. DeleteShippingProfile and DeleteOrder both did that,
//     so deleting a shipping address or an order silently did nothing.
//  3. `Begin()` on a handle that is ALREADY a transaction leaves ConnPool
//     pointing at the caller's transaction, so the inner Rollback() aborts the
//     outer one. This codebase has lost a just-created order that way
//     (OrderRepository.AppendActivity, 368a981).
//
// And, since 72a6aa2, a fourth: Commit talks to the driver directly and runs no
// callbacks, so a commit-time error is the one persistence failure that reaches
// a handler unsanitized.
func TestTransactionGuard_NoDirectTransactionControl(t *testing.T) {
	control := regexp.MustCompile(
		`\.Begin\(\)|\.Commit\(\)|\.Rollback\(\)|\.SavePoint\(|\.RollbackTo\(|\.Transaction\(`)

	// The helper is the one place allowed to call these, which is the point.
	allowed := map[string]bool{
		"transaction.go": true,
	}

	roots := []string{
		filepath.Join("..", "adapter", "repositories"),
		filepath.Join("..", "core", "services"),
		filepath.Join("..", "crons"),
		filepath.Join("..", "migration"),
		filepath.Join("..", "..", "cmd"),
		".",
	}

	var breaches []string
	for _, root := range roots {
		err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() || !strings.HasSuffix(path, ".go") {
				return err
			}
			// Tests drive transactions directly on purpose — that is how the
			// helper's own behaviour, and the nesting landmine, get exercised.
			if strings.HasSuffix(path, "_test.go") || allowed[filepath.Base(path)] {
				return nil
			}
			src, readErr := os.ReadFile(path)
			if readErr != nil {
				return readErr
			}
			// Comments are stripped first. The notes above, and the ones in
			// transaction.go and orderRespository.go, necessarily quote the
			// calls they forbid — a whole-file grep would flag the explanation
			// of the rule as a breach of it, which has happened three times in
			// this project.
			for i, line := range strings.Split(stripTxComments(string(src)), "\n") {
				if control.MatchString(line) {
					breaches = append(breaches, fmt.Sprintf("%s:%d: %s",
						filepath.ToSlash(path), i+1, strings.TrimSpace(line)))
				}
			}
			return nil
		})
		if err != nil {
			t.Fatalf("walk %s: %v", root, err)
		}
	}

	if len(breaches) > 0 {
		t.Errorf("these drive a transaction directly:\n  %s\n\n"+
			"Use database.WithTransaction(db, \"op\", func(tx *gorm.DB) error { ... }).\n"+
			"It checks the commit, sanitizes Begin/SavePoint/Commit errors, returns "+
			"fn's own error untouched, and nests through a SAVEPOINT.\n"+
			"(A failed ROLLBACK is not surfaced — GORM discards it. See the doc "+
			"comment on WithTransaction.)",
			strings.Join(breaches, "\n  "))
	}
}

// The guard has to be able to fail. A source check never seen failing may match
// nothing at all.
func TestTransactionGuard_DetectsPlantedBreaches(t *testing.T) {
	control := regexp.MustCompile(
		`\.Begin\(\)|\.Commit\(\)|\.Rollback\(\)|\.SavePoint\(|\.RollbackTo\(|\.Transaction\(`)

	planted := []string{
		`	tx := repo.db.Begin()`,
		`	tx.Commit()`,
		`	if err := tx.Commit().Error; err != nil {`,
		`		tx.Rollback()`,
		`	db.SavePoint("sp1")`,
		`	db.RollbackTo("sp1")`,
		`	return repo.db.Transaction(func(tx *gorm.DB) error {`,
	}
	for _, line := range planted {
		if !control.MatchString(stripTxComments(line)) {
			t.Errorf("the guard does not detect %q", strings.TrimSpace(line))
		}
	}

	benign := []string{
		`	// the old code called tx.Commit() without checking the error`,
		`	// Begin()/Commit() rolled the OUTER transaction back here`,
		`	return database.WithTransaction(repo.db, "op", func(tx *gorm.DB) error {`,
		`	if err := tx.Create(&input).Error; err != nil {`,
	}
	for _, line := range benign {
		if control.MatchString(stripTxComments(line)) {
			t.Errorf("the guard fires on benign source: %q", strings.TrimSpace(line))
		}
	}
}

func stripTxComments(src string) string {
	var out strings.Builder
	for _, line := range strings.Split(src, "\n") {
		if i := strings.Index(line, "//"); i >= 0 {
			line = line[:i]
		}
		out.WriteString(line)
		out.WriteByte('\n')
	}
	return out.String()
}
