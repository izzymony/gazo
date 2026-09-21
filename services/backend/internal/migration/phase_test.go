package migration

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"testing/fstest"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// The two-phase runner (P5.5). `sql/pre` is applied BEFORE AutoMigrate, `sql`
// after, sharing one ledger and one version sequence.
//
// This is tested before it is used, because the thing it exists to protect is a
// rename of the tables the money lives in. The hazard: GORM's AutoMigrate does
// `if !HasTable(x) { CreateTable(x) }`, so the first boot after a table name
// changes it creates the new name EMPTY and orphans the old one — silently.
//
// Real Postgres, and not incidentally: `schema_migrations` uses `timestamptz`,
// the migrations use Postgres-specific DDL, and the property under test is what
// is DURABLE in the ledger across runs.

// bareDB opens a private, EMPTY schema — no AutoMigrate, no migrations. Each
// test drives the phases itself, which is the only way to observe their order.
func bareDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set — the phase order and the ledger are " +
			"Postgres behaviour, and a green run without it would mean nothing")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger:                                   logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	schema := fmt.Sprintf("phase_test_%d_%d", os.Getpid(), testCounter())
	if err := db.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() { db.Exec("DROP SCHEMA " + schema + " CASCADE") })
	if err := db.Exec("SET search_path TO " + schema).Error; err != nil {
		t.Fatalf("search_path: %v", err)
	}
	return db
}

func recordedVersions(t *testing.T, db *gorm.DB) []int64 {
	t.Helper()
	var versions []int64
	if err := db.Raw(`SELECT version FROM schema_migrations ORDER BY version`).
		Scan(&versions).Error; err != nil {
		t.Fatalf("read ledger: %v", err)
	}
	return versions
}

func ledgerRows(t *testing.T, db *gorm.DB) int64 {
	t.Helper()
	var n int64
	if err := db.Raw(`SELECT count(*) FROM schema_migrations`).Scan(&n).Error; err != nil {
		t.Fatalf("count ledger: %v", err)
	}
	return n
}

// `sql/pre` ships EMPTY and must be a clean no-op — not an error, and not a
// reason for the boot to fail.
//
// `go:embed` omits empty directories, so the directory is absent from the
// embedded FS entirely. applyPhase has to treat that as "nothing to do".
func TestPrePhase_IsANoOpWhileEmpty(t *testing.T) {
	db := bareDB(t)

	if err := runPreMigrations(db); err != nil {
		t.Fatalf("the empty pre phase failed: %v — this halts the boot in Migrate()", err)
	}
	// The ledger must still have been created, since phase 1 now runs first on a
	// fresh database.
	if !db.Migrator().HasTable("schema_migrations") {
		t.Error("the pre phase did not create schema_migrations; the post phase would " +
			"be the only thing that does, which breaks if a pre migration is ever added")
	}
	if n := ledgerRows(t, db); n != 0 {
		t.Errorf("the empty pre phase recorded %d version(s)", n)
	}
	// And again, because every phase must be re-runnable.
	if err := runPreMigrations(db); err != nil {
		t.Fatalf("second run of the empty pre phase failed: %v", err)
	}
}

// A fresh database: the pre phase applies, then AutoMigrate, then the post
// phase — and 014 still seeds the taxonomy, which is the case that rules out
// simply reordering the whole runner.
func TestPhaseOrder_FreshDatabaseStillSeeds(t *testing.T) {
	db := bareDB(t)

	// Phase 1.
	if err := runPreMigrations(db); err != nil {
		t.Fatalf("pre phase: %v", err)
	}
	// Phase 2, as Migrate does it: per-table, tolerating failures.
	for _, table := range migrationTables {
		_ = db.AutoMigrate(table)
	}
	// Phase 3.
	if err := runVersionedMigrations(db); err != nil {
		t.Fatalf("post phase: %v", err)
	}

	versions := recordedVersions(t, db)
	if len(versions) == 0 {
		t.Fatal("no migrations recorded")
	}
	// 014 is the taxonomy seed and is the reason the pre phase had to be added
	// rather than the runner reordered: it INSERTs into tables AutoMigrate
	// creates, so it cannot run before AutoMigrate.
	var seenTaxonomy bool
	for _, v := range versions {
		if v == 14 {
			seenTaxonomy = true
		}
	}
	if !seenTaxonomy {
		t.Fatalf("014 was not applied; recorded versions: %v", versions)
	}
	var categories int64
	db.Raw(`SELECT count(*) FROM external_categories`).Scan(&categories)
	if categories == 0 {
		t.Error("014 recorded as applied but external_categories is empty — the seed " +
			"ran before AutoMigrate created the table, or not at all")
	}
}

// The property the whole scheme rests on: the applied-check is PER VERSION
// (`WHERE version = ?`), not a high-water mark.
//
// It matters because version numbers are allocation order, not ship order — a
// `pre/` migration can carry a LOWER number than `sql/` files that ship before
// it. If the check were "greater than the max recorded", recording pre/017
// would silently skip 007-016 on a fresh database and the schema would be
// missing every index and backfill.
func TestApplyPhase_PerVersionCheckDoesNotSkipLowerNumbers(t *testing.T) {
	db := bareDB(t)

	// Record a HIGH version first, exactly as shipping a pre/ migration would.
	synthetic := fstest.MapFS{
		"fake/900_high_water.sql": &fstest.MapFile{
			Data: []byte(`CREATE TABLE IF NOT EXISTS phase_probe_high (id int);`),
		},
	}
	if err := applyPhase(db, synthetic, "fake"); err != nil {
		t.Fatalf("apply synthetic 900: %v", err)
	}
	if got := recordedVersions(t, db); len(got) != 1 || got[0] != 900 {
		t.Fatalf("recorded %v, want [900]", got)
	}

	// Now the real post phase. Every one of its LOWER versions must still apply.
	for _, table := range migrationTables {
		_ = db.AutoMigrate(table)
	}
	if err := runVersionedMigrations(db); err != nil {
		t.Fatalf("post phase after a high version was recorded: %v", err)
	}

	versions := recordedVersions(t, db)
	if len(versions) < 2 {
		t.Fatalf("only %v recorded — a high-water-mark check would suppress everything "+
			"below 900, leaving the schema without its indexes and backfills", versions)
	}
	if versions[len(versions)-1] != 900 {
		t.Errorf("900 is not the highest recorded version: %v", versions)
	}
	for _, want := range []int64{7, 14} {
		var found bool
		for _, v := range versions {
			if v == want {
				found = true
			}
		}
		if !found {
			t.Errorf("version %d was skipped: %v", want, versions)
		}
	}
}

// A version recorded by the PRE phase must not suppress an `sql/` file, and
// vice versa — one ledger, one sequence, and the phase a version came from is
// not part of its identity.
func TestApplyPhase_PhasesShareOneLedgerWithoutSuppressingEachOther(t *testing.T) {
	db := bareDB(t)

	pre := fstest.MapFS{
		"pre/030_from_pre.sql": &fstest.MapFile{
			Data: []byte(`CREATE TABLE IF NOT EXISTS phase_probe_pre (id int);`),
		},
	}
	post := fstest.MapFS{
		"post/031_from_post.sql": &fstest.MapFile{
			Data: []byte(`CREATE TABLE IF NOT EXISTS phase_probe_post (id int);`),
		},
	}

	if err := applyPhase(db, pre, "pre"); err != nil {
		t.Fatalf("pre: %v", err)
	}
	if err := applyPhase(db, post, "post"); err != nil {
		t.Fatalf("post: %v", err)
	}

	if got := recordedVersions(t, db); len(got) != 2 || got[0] != 30 || got[1] != 31 {
		t.Fatalf("recorded %v, want [30 31]", got)
	}
	for _, table := range []string{"phase_probe_pre", "phase_probe_post"} {
		if !db.Migrator().HasTable(table) {
			t.Errorf("%s was not created — its phase was suppressed by the other's ledger row", table)
		}
	}
}

// Re-running the whole thing changes nothing and duplicates no ledger row.
// `schema_migrations.version` is the primary key, so a second INSERT would
// error and halt the boot rather than be harmlessly ignored.
func TestApplyPhase_ReRunIsANoOp(t *testing.T) {
	db := bareDB(t)

	synthetic := fstest.MapFS{
		"d/040_first.sql":  &fstest.MapFile{Data: []byte(`CREATE TABLE IF NOT EXISTS phase_probe_a (id int);`)},
		"d/041_second.sql": &fstest.MapFile{Data: []byte(`CREATE TABLE IF NOT EXISTS phase_probe_b (id int);`)},
	}

	for run := 1; run <= 3; run++ {
		if err := applyPhase(db, synthetic, "d"); err != nil {
			t.Fatalf("run %d: %v", run, err)
		}
		if n := ledgerRows(t, db); n != 2 {
			t.Fatalf("run %d recorded %d ledger rows, want 2 — a duplicate INSERT would "+
				"violate the primary key and halt the boot", run, n)
		}
	}
}

// A `pre/` file runs on a database where AutoMigrate has NEVER run, so it must
// be written defensively. This is the shape a real one has to take, and it must
// be a clean no-op when the tables it names do not exist.
func TestPrePhase_GuardedStatementsAreSafeOnAFreshDatabase(t *testing.T) {
	db := bareDB(t)

	guarded := fstest.MapFS{
		"pre/050_guarded_rename.sql": &fstest.MapFile{Data: []byte(`
-- The shape every pre/ migration must take: nothing here may assume a table
-- exists, because on a fresh database AutoMigrate has not run yet.
ALTER TABLE IF EXISTS phase_probe_absent RENAME TO phase_probe_renamed;

DO $$
BEGIN
	IF to_regclass('phase_probe_absent') IS NOT NULL THEN
		EXECUTE 'ALTER TABLE phase_probe_absent RENAME COLUMN old_name TO new_name';
	END IF;
END
$$;
`)},
	}

	if err := applyPhase(db, guarded, "pre"); err != nil {
		t.Fatalf("a guarded pre migration failed on a fresh database: %v", err)
	}
	if got := recordedVersions(t, db); len(got) != 1 || got[0] != 50 {
		t.Errorf("recorded %v, want [50] — a no-op still has to be recorded, or it "+
			"re-runs on every boot", got)
	}

	// And it must actually DO the rename when the table is there, or the test
	// above only proves it does nothing.
	db2 := bareDB(t)
	if err := db2.Exec(`CREATE TABLE phase_probe_absent (old_name text)`).Error; err != nil {
		t.Fatalf("seed table: %v", err)
	}
	if err := applyPhase(db2, guarded, "pre"); err != nil {
		t.Fatalf("guarded pre migration with the table present: %v", err)
	}
	if !db2.Migrator().HasTable("phase_probe_renamed") {
		t.Error("the table was not renamed — the guards are skipping unconditionally")
	}
	if db2.Migrator().HasTable("phase_probe_absent") {
		t.Error("the old table still exists after the rename")
	}
}

// A malformed filename must fail loudly rather than be skipped. A migration
// silently not running is the failure mode this whole runner exists to avoid.
func TestApplyPhase_RejectsMalformedFilenames(t *testing.T) {
	db := bareDB(t)

	for name, bad := range map[string]fstest.MapFS{
		"no version prefix":   {"d/rename_things.sql": &fstest.MapFile{Data: []byte(`SELECT 1;`)}},
		"unparseable version": {"d/xx_rename.sql": &fstest.MapFile{Data: []byte(`SELECT 1;`)}},
	} {
		if err := applyPhase(db, bad, "d"); err == nil {
			t.Errorf("%s: applyPhase accepted it silently", name)
		}
	}
}

// Migrate() must call the phases in order: pre, AutoMigrate, post.
//
// A source assertion, because Migrate() connects to the real database from the
// environment and calls log.Fatalf — it cannot be driven from a test. Mutation
// testing showed the gap: deleting the runPreMigrations call entirely still
// compiles and leaves every behavioural test above green, since they drive the
// phases themselves.
//
// Order is the whole point. A pre migration that runs AFTER AutoMigrate is not
// merely late, it is useless: AutoMigrate will already have created the
// renamed table empty, which is the exact failure the phase exists to prevent.
func TestMigrate_CallsPreMigrationsBeforeAutoMigrate(t *testing.T) {
	source, err := os.ReadFile("migration.go")
	if err != nil {
		t.Fatalf("read migration.go: %v", err)
	}
	src := string(source)

	pre := strings.Index(src, "runPreMigrations(db)")
	if pre < 0 {
		t.Fatal("Migrate() does not call runPreMigrations — the pre phase never runs, so " +
			"a rename migration placed in sql/pre would be silently ignored and " +
			"AutoMigrate would create the renamed table empty")
	}
	auto := strings.Index(src, "db.AutoMigrate(table)")
	if auto < 0 {
		t.Fatal("the AutoMigrate loop is gone; update this test to match the new runner")
	}
	post := strings.Index(src, "runVersionedMigrations(db)")
	if post < 0 {
		t.Fatal("Migrate() does not call runVersionedMigrations")
	}

	if pre > auto {
		t.Error("runPreMigrations is called AFTER the AutoMigrate loop — AutoMigrate will " +
			"already have created any renamed table empty, and the rename will then " +
			"fail because its target exists")
	}
	if post < auto {
		t.Error("runVersionedMigrations is called BEFORE AutoMigrate — 014 INSERTs into " +
			"tables AutoMigrate creates, so fresh-database provisioning breaks")
	}
}

// Two migrations numbered the same is unrecoverable, not untidy: whichever
// applies first records the number, and the other is then skipped as
// already-applied on every boot thereafter. The schema quietly lacks whatever
// that file did, and the ledger asserts it ran.
//
// The phase split is what makes this newly likely — two directories, one
// sequence, and nothing previously stopping `sql/pre/030_x.sql` from landing
// beside `sql/030_y.sql`.
func TestApplyPhase_RejectsDuplicateVersionsAcrossPhases(t *testing.T) {
	db := bareDB(t)

	collision := fstest.MapFS{
		"pre/030_rename_wallets.sql": &fstest.MapFile{
			Data: []byte(`CREATE TABLE IF NOT EXISTS dup_probe_pre (id int);`),
		},
		"post/030_ledger_indexes.sql": &fstest.MapFile{
			Data: []byte(`CREATE TABLE IF NOT EXISTS dup_probe_post (id int);`),
		},
	}

	// Refused from EITHER phase, so adding the file to whichever runs second
	// cannot sneak it in.
	for _, dir := range []struct{ apply, peer string }{
		{"pre", "post"},
		{"post", "pre"},
	} {
		err := applyPhase(db, collision, dir.apply, dir.peer)
		if err == nil {
			t.Fatalf("applying %q with peer %q accepted two files numbered 030", dir.apply, dir.peer)
		}
		if !strings.Contains(err.Error(), "duplicate migration version 030") &&
			!strings.Contains(err.Error(), "duplicate migration version 30") {
			t.Errorf("error does not name the collision: %v", err)
		}
		// The error must name BOTH files, or nobody can find the second one.
		if !strings.Contains(err.Error(), "030_rename_wallets.sql") ||
			!strings.Contains(err.Error(), "030_ledger_indexes.sql") {
			t.Errorf("error does not name both files: %v", err)
		}
	}

	// And nothing was applied or recorded — the check runs before any statement.
	if n := ledgerRows(t, db); n != 0 {
		t.Errorf("recorded %d version(s) despite the collision", n)
	}
	for _, table := range []string{"dup_probe_pre", "dup_probe_post"} {
		if db.Migrator().HasTable(table) {
			t.Errorf("%s was created despite the collision", table)
		}
	}
}

// A duplicate WITHIN one directory is the same failure and is also refused.
func TestApplyPhase_RejectsDuplicateVersionsInOneDirectory(t *testing.T) {
	db := bareDB(t)

	collision := fstest.MapFS{
		"d/031_first.sql":  &fstest.MapFile{Data: []byte(`SELECT 1;`)},
		"d/031_second.sql": &fstest.MapFile{Data: []byte(`SELECT 1;`)},
	}
	if err := applyPhase(db, collision, "d"); err == nil {
		t.Error("two files numbered 031 in one directory were accepted")
	}
}

// The ledger records WHICH FILE was applied. If a recorded version's file is
// later renamed or replaced, the version is skipped as applied while the file
// that is actually shipping has never run — silently, with the ledger asserting
// something untrue about the schema.
//
// There is no safe automatic answer (re-running could be destructive, skipping
// hides a missing change), so it halts and says what to do.
func TestApplyPhase_RejectsARecordedVersionWhoseFilenameChanged(t *testing.T) {
	db := bareDB(t)

	original := fstest.MapFS{
		"d/032_add_index.sql": &fstest.MapFile{
			Data: []byte(`CREATE TABLE IF NOT EXISTS name_probe (id int);`),
		},
	}
	if err := applyPhase(db, original, "d"); err != nil {
		t.Fatalf("first apply: %v", err)
	}
	if got := recordedVersions(t, db); len(got) != 1 || got[0] != 32 {
		t.Fatalf("recorded %v, want [32]", got)
	}

	// Same version, different filename — a rename, or a replacement.
	renamed := fstest.MapFS{
		"d/032_add_index_and_backfill.sql": &fstest.MapFile{
			Data: []byte(`CREATE TABLE IF NOT EXISTS name_probe_two (id int);`),
		},
	}
	err := applyPhase(db, renamed, "d")
	if err == nil {
		t.Fatal("a recorded version with a different shipped filename was silently " +
			"skipped — the new file never runs and the ledger claims it did")
	}
	for _, want := range []string{"032_add_index.sql", "032_add_index_and_backfill.sql"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error does not name %s: %v", want, err)
		}
	}
	// The renamed file's effect must NOT have been applied.
	if db.Migrator().HasTable("name_probe_two") {
		t.Error("the renamed migration ran anyway")
	}

	// Re-applying the ORIGINAL name is still a clean no-op, so the check does
	// not break ordinary re-runs.
	if err := applyPhase(db, original, "d"); err != nil {
		t.Errorf("re-applying the unchanged file failed: %v", err)
	}
}

// The name check compares against the BARE filename, which is what the ledger
// has always stored. Storing `dir/name` instead would make every existing
// database fail this check on the next boot, which would be a far worse outcome
// than the problem it guards against.
func TestApplyPhase_RecordsTheBareFilename(t *testing.T) {
	db := bareDB(t)

	synthetic := fstest.MapFS{
		"some/deep/dir/033_probe.sql": &fstest.MapFile{Data: []byte(`SELECT 1;`)},
	}
	if err := applyPhase(db, synthetic, "some/deep/dir"); err != nil {
		t.Fatalf("apply: %v", err)
	}
	var name string
	if err := db.Raw(`SELECT name FROM schema_migrations WHERE version = 33`).
		Scan(&name).Error; err != nil {
		t.Fatalf("read ledger: %v", err)
	}
	if name != "033_probe.sql" {
		t.Errorf("recorded name = %q, want %q — a directory-qualified name would make "+
			"every already-migrated database trip the filename check on its next boot",
			name, "033_probe.sql")
	}
}

// The real shipped set must satisfy the rule it now enforces.
func TestShippedMigrationsHaveUniqueVersions(t *testing.T) {
	if err := assertVersionsUnique(embeddedMigrations, preMigrationDir, postMigrationDir); err != nil {
		t.Fatalf("the shipped migrations collide: %v", err)
	}
}
