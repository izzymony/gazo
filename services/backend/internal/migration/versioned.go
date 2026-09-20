package migration

import (
	"embed"
	"fmt"
	"sort"
	"strconv"
	"strings"

	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

//go:embed sql/*.sql
var embeddedMigrations embed.FS

// runVersionedMigrations applies the embedded, ordered SQL migrations that GORM
// AutoMigrate can't express — functional/unique indexes, data backfills, and NOT
// NULL constraints (007 marketplace indexes, 009 business-tag identity, 010
// product-slug backfill, 011/012 product public_id). Each file is applied at most
// once per database and recorded in a `schema_migrations` version ledger — this
// REPLACES the previous MANUAL owner-run step (the changelog's "run 009/010/011/
// 012 on staging/prod at deploy").
//
// AutoMigrate (in Migrate) owns table STRUCTURE and must run first; these run
// after it, in numeric order. Each file is written idempotently (IF NOT EXISTS /
// guarded UPDATE / repeatable backfill), so the FIRST ledger run against a DB
// where they were already applied by hand (local now, staging/prod at cutover) is
// a safe no-op that just records them as applied.
//
// Going forward this is the ONE path for schema changes AutoMigrate can't own:
// drop a new `internal/migration/sql/NNN_name.sql` file. It is a deliberately
// small in-house runner (5 forward-only additive migrations) rather than a
// third-party tool — see B9 in the tracker.
func runVersionedMigrations(db *gorm.DB) error {
	if err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version    bigint      PRIMARY KEY,
		name       text        NOT NULL,
		applied_at timestamptz NOT NULL DEFAULT now()
	)`).Error; err != nil {
		return fmt.Errorf("schema_migrations table: %w", err)
	}

	entries, err := embeddedMigrations.ReadDir("sql")
	if err != nil {
		return fmt.Errorf("read embedded migrations: %w", err)
	}

	type migration struct {
		version    int64
		name       string
		statements []string
	}
	var migrations []migration
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		idx := strings.IndexByte(e.Name(), '_')
		if idx <= 0 {
			return fmt.Errorf("migration %q: expected NNN_name.sql", e.Name())
		}
		version, err := strconv.ParseInt(e.Name()[:idx], 10, 64)
		if err != nil {
			return fmt.Errorf("migration %q: bad version prefix: %w", e.Name(), err)
		}
		body, err := embeddedMigrations.ReadFile("sql/" + e.Name())
		if err != nil {
			return fmt.Errorf("read migration %q: %w", e.Name(), err)
		}
		migrations = append(migrations, migration{version, e.Name(), splitSQLStatements(string(body))})
	}
	sort.Slice(migrations, func(i, j int) bool { return migrations[i].version < migrations[j].version })

	for _, m := range migrations {
		var applied int64
		if err := db.Raw(`SELECT count(*) FROM schema_migrations WHERE version = ?`, m.version).Scan(&applied).Error; err != nil {
			return fmt.Errorf("check migration %d: %w", m.version, err)
		}
		if applied > 0 {
			continue
		}
		// Apply the file's statements + record the version in ONE transaction, so a
		// crash mid-file leaves it unrecorded and the next boot re-runs it cleanly
		// (the files are idempotent).
		if err := db.Transaction(func(tx *gorm.DB) error {
			for _, stmt := range m.statements {
				if err := tx.Exec(stmt).Error; err != nil {
					return fmt.Errorf("statement %q: %w", truncate(stmt, 80), err)
				}
			}
			return tx.Exec(`INSERT INTO schema_migrations (version, name) VALUES (?, ?)`, m.version, m.name).Error
		}); err != nil {
			return fmt.Errorf("apply migration %s: %w", m.name, err)
		}
		log.Infof("migration applied: %s", m.name)
	}
	return nil
}

// splitSQLStatements strips `--` line comments and splits into individual
// statements on `;`. Sufficient for the additive migrations here — they contain
// no functions / dollar-quoted blocks / semicolons inside string literals (those
// would need a real SQL parser). Driver-agnostic: pgx's extended protocol rejects
// multi-statement Exec, so each statement is run on its own.
// splitSQLStatements breaks a migration file into statements on `;`.
//
// It has to understand three kinds of text where a `;` or a `--` is just a
// character and not punctuation, because getting any of them wrong splits a
// statement in half and the migration fails with a syntax error that points
// nowhere useful:
//
//   - line comments, which are stripped;
//   - single-quoted literals, which may contain both;
//   - dollar-quoted bodies ($$ ... $$ or $tag$ ... $tag$), which is how a
//     DO block, function or trigger is written and which contain semicolons
//     by definition.
//
// The dollar-quote case is not hypothetical: the first migration to use a DO
// block failed with "unterminated dollar-quoted string", because the body was
// cut at its first internal semicolon.
func splitSQLStatements(sql string) []string {
	var (
		out     []string
		current strings.Builder
		runes   = []rune(sql)
	)

	flush := func() {
		if trimmed := strings.TrimSpace(current.String()); trimmed != "" {
			out = append(out, trimmed)
		}
		current.Reset()
	}

	for i := 0; i < len(runes); {
		switch {
		// Line comment: drop to the end of the line, keeping the newline so
		// tokens on either side do not run together.
		case runes[i] == '-' && i+1 < len(runes) && runes[i+1] == '-':
			for i < len(runes) && runes[i] != '\n' {
				i++
			}

		// Single-quoted literal, copied verbatim. '' is an escaped quote.
		case runes[i] == '\'':
			current.WriteRune(runes[i])
			i++
			for i < len(runes) {
				current.WriteRune(runes[i])
				if runes[i] == '\'' {
					if i+1 < len(runes) && runes[i+1] == '\'' {
						current.WriteRune(runes[i+1])
						i += 2
						continue
					}
					i++
					break
				}
				i++
			}

		// Dollar-quoted body, copied verbatim until its matching tag.
		case runes[i] == '$':
			if tag, ok := dollarTag(runes, i); ok {
				current.WriteString(tag)
				i += len([]rune(tag))
				for i < len(runes) {
					if runes[i] == '$' {
						if closing, ok := dollarTag(runes, i); ok && closing == tag {
							current.WriteString(tag)
							i += len([]rune(tag))
							break
						}
					}
					current.WriteRune(runes[i])
					i++
				}
			} else {
				current.WriteRune(runes[i])
				i++
			}

		case runes[i] == ';':
			flush()
			i++

		default:
			current.WriteRune(runes[i])
			i++
		}
	}
	flush()
	return out
}

// dollarTag reads a dollar-quote delimiter starting at i — `$$` or `$tag$` —
// and reports whether there was one. A lone `$` (a parameter placeholder, say)
// is not a delimiter.
func dollarTag(runes []rune, i int) (string, bool) {
	if runes[i] != '$' {
		return "", false
	}
	for j := i + 1; j < len(runes); j++ {
		if runes[j] == '$' {
			return string(runes[i : j+1]), true
		}
		// Tags are identifiers; anything else means this is not a delimiter.
		if !(runes[j] == '_' ||
			(runes[j] >= 'a' && runes[j] <= 'z') ||
			(runes[j] >= 'A' && runes[j] <= 'Z') ||
			(runes[j] >= '0' && runes[j] <= '9')) {
			return "", false
		}
	}
	return "", false
}

func truncate(s string, n int) string {
	s = strings.Join(strings.Fields(s), " ")
	if len(s) > n {
		return s[:n] + "…"
	}
	return s
}
