package migration

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strconv"
	"strings"

	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"github.com/Tinovalabs/vibaar/services/backend/internal/database"
)

// Directory form, which is RECURSIVE — so `sql/pre/*.sql` is picked up without
// a second directive. `go:embed` omits empty directories, so an empty
// `sql/pre/` is simply absent from the FS and applyPhase treats that as "no
// pre-migrations" rather than an error.
//
//go:embed sql
var embeddedMigrations embed.FS

// The two phases, in the order Migrate runs them.
//
// preMigrationDir holds structural changes AutoMigrate would MIS-HANDLE, and is
// applied BEFORE it. postMigrationDir holds everything else — indexes, seeds,
// backfills — and is applied after, as it always has been.
//
// The phase split exists for one specific hazard, and it is worth stating
// because nothing else in the runner hints at it. GORM's AutoMigrate does
// `if !HasTable(x) { CreateTable(x) }`. So the first boot after a model's table
// NAME changes, AutoMigrate looks for the new name, finds nothing, and creates
// it EMPTY — then a versioned `ALTER TABLE ... RENAME TO` fails because the
// target now exists, and the old table, with the money in it, is orphaned. No
// error, no warning, and the app serves an empty earnings account to every
// seller.
//
// Neither obvious workaround survives contact: shipping the rename first leaves
// the running pods pointing at a name that no longer exists, and guarding the
// rename with `IF to_regclass(new) IS NULL` skips it, because AutoMigrate has
// already created the table. Reordering the whole runner is not available
// either — 014 does `INSERT INTO external_categories` and depends on
// AutoMigrate having created those tables, so fresh-database provisioning
// breaks.
//
// Hence a `pre/` phase. Nothing uses it yet: it ships empty, and is proven by
// its tests, so the mechanism is in place and verified BEFORE the migration
// that needs it is written.
const (
	preMigrationDir  = "sql/pre"
	postMigrationDir = "sql"
)

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
// ensureMigrationLedger creates the version ledger. Idempotent, and called by
// both phases — the pre phase runs first on a fresh database, so it cannot
// assume the table is already there.
func ensureMigrationLedger(db *gorm.DB) error {
	if err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version    bigint      PRIMARY KEY,
		name       text        NOT NULL,
		applied_at timestamptz NOT NULL DEFAULT now()
	)`).Error; err != nil {
		return fmt.Errorf("schema_migrations table: %w", err)
	}
	return nil
}

// runPreMigrations applies the `sql/pre` phase, before AutoMigrate.
func runPreMigrations(db *gorm.DB) error {
	return applyPhase(db, embeddedMigrations, preMigrationDir, postMigrationDir)
}

// runVersionedMigrations applies the `sql` phase, after AutoMigrate. The name is
// kept because it is what Migrate has always called.
func runVersionedMigrations(db *gorm.DB) error {
	return applyPhase(db, embeddedMigrations, postMigrationDir, preMigrationDir)
}

// applyPhase applies every not-yet-recorded migration in one directory, in
// ascending version order, each in its own transaction.
//
// Takes an fs.FS rather than reaching for the package-level embed so the tests
// can hand it an fstest.MapFS with synthetic versions. That is what makes it
// possible to ship `sql/pre` EMPTY: the mechanism is exercised without
// committing a migration whose only purpose is to be tested, and without
// consuming a version number that a real migration will want.
//
// BOTH phases share this one ledger and one version sequence, so a version
// number means the same thing whichever phase it came from. `peers` names the
// other phase's directory, because "one sequence" has to be ENFORCED across
// both — see assertVersionsUnique.
func applyPhase(db *gorm.DB, fsys fs.FS, dir string, peers ...string) error {
	if err := ensureMigrationLedger(db); err != nil {
		return err
	}

	// Two versions with the same number is unrecoverable rather than merely
	// untidy: whichever applies first records the number, and the second is
	// then skipped FOREVER as already-applied. So this is checked across both
	// phases before anything runs, and it halts the boot.
	if err := assertVersionsUnique(fsys, append([]string{dir}, peers...)...); err != nil {
		return err
	}

	migrations, err := listMigrations(fsys, dir)
	if err != nil {
		return err
	}

	for _, m := range migrations {
		// Per version, never a high-water mark — that property is load-bearing
		// (see the phase tests), because a `pre/` file can carry a LOWER number
		// than `sql/` files that ship before it.
		//
		// The recorded NAME is compared too. The ledger says which file was
		// applied, so if a recorded version's file has since been renamed or
		// replaced, the version is skipped as applied while the file that is
		// actually shipping has never run — silently, and with the ledger
		// asserting something untrue about the schema. There is no safe
		// automatic answer to that, so it halts.
		var recorded []string
		if err := db.Raw(`SELECT name FROM schema_migrations WHERE version = ?`, m.version).
			Scan(&recorded).Error; err != nil {
			return fmt.Errorf("check migration %d: %w", m.version, err)
		}
		if len(recorded) > 0 {
			if recorded[0] != m.name {
				return fmt.Errorf(
					"migration %d is recorded as %q but the shipped file is %s/%s — the "+
						"recorded version would be skipped as applied while this file has "+
						"never run; rename it back, or ship the change as a NEW version",
					m.version, recorded[0], dir, m.name)
			}
			continue
		}
		// Apply the file's statements + record the version in ONE transaction, so a
		// crash mid-file leaves it unrecorded and the next boot re-runs it cleanly
		// (the files are idempotent).
		if err := database.WithTransaction(db, "apply_phase", func(tx *gorm.DB) error {
			for _, stmt := range m.statements {
				if err := tx.Exec(stmt).Error; err != nil {
					return fmt.Errorf("statement %q: %w", truncate(stmt, 80), err)
				}
			}
			return tx.Exec(`INSERT INTO schema_migrations (version, name) VALUES (?, ?)`, m.version, m.name).Error
		}); err != nil {
			return fmt.Errorf("apply migration %s: %w", m.name, err)
		}
		log.Infof("migration applied: %s/%s", dir, m.name)
	}
	return nil
}

// migration is one embedded SQL file, ready to apply.
type migration struct {
	version    int64
	name       string
	statements []string
}

// listMigrations reads one directory's migrations in ascending version order.
//
// A missing directory is "nothing to do", not a failure: `go:embed` omits empty
// directories, and `sql/pre` ships empty.
func listMigrations(fsys fs.FS, dir string) ([]migration, error) {
	entries, err := fs.ReadDir(fsys, dir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, nil
		}
		return nil, fmt.Errorf("read embedded migrations in %s: %w", dir, err)
	}

	var migrations []migration
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		version, err := parseVersion(dir, e.Name())
		if err != nil {
			return nil, err
		}
		body, err := fs.ReadFile(fsys, path.Join(dir, e.Name()))
		if err != nil {
			return nil, fmt.Errorf("read migration %s/%s: %w", dir, e.Name(), err)
		}
		migrations = append(migrations, migration{version, e.Name(), splitSQLStatements(string(body))})
	}
	sort.Slice(migrations, func(i, j int) bool { return migrations[i].version < migrations[j].version })
	return migrations, nil
}

// parseVersion reads the NNN prefix. A malformed name is an error rather than a
// skip: a migration that silently does not run is the failure this whole runner
// exists to avoid.
func parseVersion(dir, name string) (int64, error) {
	idx := strings.IndexByte(name, '_')
	if idx <= 0 {
		return 0, fmt.Errorf("migration %s/%s: expected NNN_name.sql", dir, name)
	}
	version, err := strconv.ParseInt(name[:idx], 10, 64)
	if err != nil {
		return 0, fmt.Errorf("migration %s/%s: bad version prefix: %w", dir, name, err)
	}
	return version, nil
}

// assertVersionsUnique fails if any version number appears twice across the
// given directories.
//
// The two phases share one ledger and one version sequence, and until now that
// was a convention rather than a rule. Two files numbered the same — one in
// `sql/pre`, one in `sql`, which is exactly the mistake the phase split invites
// — would not conflict at the database: the first to apply records the number,
// and the other is then treated as already-applied and skipped on every boot
// thereafter. The schema quietly lacks whatever that file did, and the ledger
// says it ran.
//
// Checked across BOTH directories before either phase applies anything, so the
// collision cannot be introduced by adding a file to the phase that happens to
// run second.
func assertVersionsUnique(fsys fs.FS, dirs ...string) error {
	type seen struct{ dir, name string }
	byVersion := map[int64]seen{}

	// Deterministic order, so the error names the same pair every run.
	sorted := append([]string(nil), dirs...)
	sort.Strings(sorted)

	for _, dir := range sorted {
		entries, err := fs.ReadDir(fsys, dir)
		if err != nil {
			if errors.Is(err, fs.ErrNotExist) {
				continue
			}
			return fmt.Errorf("read embedded migrations in %s: %w", dir, err)
		}
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
				continue
			}
			version, err := parseVersion(dir, e.Name())
			if err != nil {
				return err
			}
			if prev, ok := byVersion[version]; ok {
				return fmt.Errorf(
					"duplicate migration version %d: %s/%s and %s/%s — both phases share "+
						"one version sequence, so only the first to apply would ever run "+
						"and the other would be skipped as already-applied on every boot",
					version, prev.dir, prev.name, dir, e.Name())
			}
			byVersion[version] = seen{dir, e.Name()}
		}
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
