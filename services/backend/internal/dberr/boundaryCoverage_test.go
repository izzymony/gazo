package dberr_test

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// The boundary covers every repository method because every repository method
// goes through GORM — 316 of them across 25 files, none of which touches
// database/sql directly. That is a property of the codebase today, and it is
// the single assumption the whole approach rests on: a query issued on the
// *sql.DB behind GORM runs no callbacks, so its driver error would reach a
// handler unconverted.
//
// This guard fails when someone adds one. It is a source check, which catches a
// shape rather than a behaviour, so it stands BESIDE the Postgres tests in
// internal/database rather than instead of them.
func TestBoundary_NothingBypassesGORM(t *testing.T) {
	// Comments are stripped before matching. The sanitizer's own documentation
	// explains why raw sql is a problem and necessarily names the calls — a
	// whole-file grep would flag the explanation of the rule as a breach of it,
	// which has happened three times in this project.
	bypass := regexp.MustCompile(
		`\.DB\(\)|sql\.Open\(|\bQueryRowContext\(|\bQueryContext\(|\bExecContext\(|\bsql\.DB\b`)

	// db.go owns the pool configuration and is the one legitimate .DB() caller.
	allowed := map[string]bool{
		filepath.Join("internal", "database", "db.go"): true,
	}

	roots := []string{
		filepath.Join("..", "adapter", "repositories"),
		filepath.Join("..", "core", "services"),
		filepath.Join("..", "database"),
		filepath.Join("..", "migration"),
	}

	var breaches []string
	for _, root := range roots {
		err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() || !strings.HasSuffix(path, ".go") {
				return err
			}
			if strings.HasSuffix(path, "_test.go") {
				return nil
			}
			// Normalise for the allow-list, which is written repo-relative.
			rel := strings.TrimPrefix(filepath.ToSlash(path), "../")
			if allowed[filepath.FromSlash("internal/"+rel)] {
				return nil
			}
			src, readErr := os.ReadFile(path)
			if readErr != nil {
				return readErr
			}
			for i, line := range strings.Split(stripComments(string(src)), "\n") {
				if bypass.MatchString(line) {
					breaches = append(breaches,
						filepath.ToSlash(path)+":"+itoa(i+1)+": "+strings.TrimSpace(line))
				}
			}
			return nil
		})
		if err != nil {
			t.Fatalf("walk %s: %v", root, err)
		}
	}

	if len(breaches) > 0 {
		t.Errorf("these call the database outside GORM, so no callback converts their "+
			"errors and a driver message can reach a handler:\n  %s\n\n"+
			"Route the query through GORM (db.Raw/db.Exec both run the boundary), or "+
			"wrap the error with dberr.From at the call site.",
			strings.Join(breaches, "\n  "))
	}
}

// The guard has to be able to fail, so it is exercised against a planted
// breach. A source check that has never been seen failing is a source check
// that might match nothing at all.
func TestBoundary_GuardDetectsAPlantedBreach(t *testing.T) {
	bypass := regexp.MustCompile(
		`\.DB\(\)|sql\.Open\(|\bQueryRowContext\(|\bQueryContext\(|\bExecContext\(|\bsql\.DB\b`)

	planted := []string{
		`	sqlDB, _ := repo.db.DB()`,
		`	row := conn.QueryRowContext(ctx, "SELECT 1")`,
		`	db, err := sql.Open("postgres", dsn)`,
		`	_, err = pool.ExecContext(ctx, stmt)`,
	}
	for _, line := range planted {
		if !bypass.MatchString(stripComments(line)) {
			t.Errorf("the guard does not detect a real bypass: %s", line)
		}
	}

	// And it must not fire on the documentation that explains the rule, nor on
	// ordinary GORM use.
	benign := []string{
		`	// never call repo.db.DB() — it bypasses the boundary`,
		`	if err := db.Exec(stmt).Error; err != nil {`,
		`	return repo.db.Raw(q, id).Scan(&out).Error`,
		`	// sql.Open would skip the callbacks entirely`,
	}
	for _, line := range benign {
		if bypass.MatchString(stripComments(line)) {
			t.Errorf("the guard fires on benign source: %s", line)
		}
	}
}

func stripComments(src string) string {
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

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b []byte
	for n > 0 {
		b = append([]byte{byte('0' + n%10)}, b...)
		n /= 10
	}
	return string(b)
}
