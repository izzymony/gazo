package migration

import (
	"fmt"
	"os"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// 014 is the taxonomy migration: it must put a complete, LINKED product taxonomy
// into any database exactly once, during deployment, without demo data.
//
// These run against real Postgres, not sqlite, and that is not incidental. The
// migration's guards raise errors by casting a message to integer — sqlite
// silently returns 0 for that instead of failing, so on sqlite a broken
// migration would look like a passing one. CI provides TEST_DATABASE_DSN; with
// no DSN the tests skip loudly rather than pretending to have run.
func testDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set — these need real Postgres (the guards are no-ops on sqlite)")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		// Same as database.ConnectDB. Without it AutoMigrate orders tables by
		// declaration and trips over forward FK references.
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger:                                   logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}

	// A schema private to this test, dropped afterwards, so tests never collide
	// and never touch anything else in the database.
	schema := fmt.Sprintf("mig_test_%d", os.Getpid()+int(testCounter()))
	if err := db.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() { db.Exec("DROP SCHEMA " + schema + " CASCADE") })
	if err := db.Exec("SET search_path TO " + schema).Error; err != nil {
		t.Fatalf("search_path: %v", err)
	}
	// The SAME model set a real deploy migrates. Migrating only the three taxonomy
	// tables looked sufficient and was not: the earlier versioned migrations touch
	// order_items and products, so the run aborted at 007 and the rollback test
	// "passed" without ever reaching 014's guards.
	// Per-table, tolerating failures exactly as Migrate() does in production: one
	// drifted model must not stop the rest, and the taxonomy tables are what
	// matter here.
	for _, table := range migrationTables {
		_ = db.AutoMigrate(table)
	}
	for _, required := range []string{"external_categories", "categories", "sub_categories"} {
		if !db.Migrator().HasTable(required) {
			t.Fatalf("test schema is missing %s", required)
		}
	}
	return db
}

var counter int64

func testCounter() int64 { counter++; return counter }

type tally struct{ external, categories, subs, linked int64 }

func count(t *testing.T, db *gorm.DB) tally {
	t.Helper()
	var x tally
	db.Raw("SELECT count(*) FROM external_categories").Scan(&x.external)
	db.Raw("SELECT count(*) FROM categories").Scan(&x.categories)
	db.Raw("SELECT count(*) FROM sub_categories").Scan(&x.subs)
	db.Raw(`SELECT count(*) FROM categories c JOIN external_categories e ON e.id = c.external_category_id`).Scan(&x.linked)
	return x
}

func applied14(t *testing.T, db *gorm.DB) int64 {
	t.Helper()
	var n int64
	db.Raw("SELECT count(*) FROM schema_migrations WHERE version = 14").Scan(&n)
	return n
}

func TestTaxonomyMigration_FreshDatabase(t *testing.T) {
	db := testDB(t)

	if err := runVersionedMigrations(db); err != nil {
		t.Fatalf("migrating a fresh database must succeed: %v", err)
	}

	got := count(t, db)
	want := tally{external: 11, categories: 13, subs: 52, linked: 13}
	if got != want {
		t.Errorf("after one run = %+v, want %+v", got, want)
	}
	if applied14(t, db) != 1 {
		t.Error("014 was not recorded in schema_migrations")
	}

	// Shipping defaults are the half that was already working before this change
	// and must not regress: productService reads them for a product's weight.
	var withWeight int64
	db.Raw("SELECT count(*) FROM sub_categories WHERE default_weight > 0").Scan(&withWeight)
	if withWeight != 52 {
		t.Errorf("sub-categories with a shipping weight = %d, want 52", withWeight)
	}
}

func TestTaxonomyMigration_SecondRunSkipsRatherThanRewrites(t *testing.T) {
	db := testDB(t)
	if err := runVersionedMigrations(db); err != nil {
		t.Fatalf("first run: %v", err)
	}

	// `updated_at` is the witness. Every row is written with updated_at = now(),
	// so if the statements executed again this value would move — proving the
	// difference between "skipped" and "re-applied harmlessly".
	var before, after string
	db.Raw("SELECT max(updated_at)::text FROM categories").Scan(&before)
	firstCounts := count(t, db)

	if err := runVersionedMigrations(db); err != nil {
		t.Fatalf("second run: %v", err)
	}

	db.Raw("SELECT max(updated_at)::text FROM categories").Scan(&after)
	if before != after {
		t.Errorf("categories were rewritten on the second run (%s -> %s); the ledger should have skipped it", before, after)
	}
	if got := count(t, db); got != firstCounts {
		t.Errorf("counts changed on the second run: %+v -> %+v", firstCounts, got)
	}
}

func TestTaxonomyMigration_AlreadyMigratedIsNotReapplied(t *testing.T) {
	db := testDB(t)

	// A database that already carries the taxonomy — recorded in the ledger by an
	// earlier deploy — must not have these writes run against it at all.
	if err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version bigint PRIMARY KEY, name text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`).Error; err != nil {
		t.Fatalf("ledger: %v", err)
	}
	if err := db.Exec(`INSERT INTO schema_migrations (version, name) VALUES (14, '014_seed_product_taxonomy.sql')`).Error; err != nil {
		t.Fatalf("pre-record: %v", err)
	}

	if err := runVersionedMigrations(db); err != nil {
		t.Fatalf("run: %v", err)
	}

	if got := count(t, db); got.categories != 0 || got.external != 0 || got.subs != 0 {
		t.Errorf("a pre-recorded migration still wrote rows: %+v", got)
	}
}

func TestTaxonomyMigration_RollsBackWhenAMappingIsMissing(t *testing.T) {
	db := testDB(t)

	// Simulate the failure the guards exist for: the external categories do not
	// land, so no category can be linked. A rule makes those inserts no-ops
	// without erroring, which is exactly the silent-partial-success shape the old
	// seeder had.
	if err := db.Exec("CREATE RULE skip_ext AS ON INSERT TO external_categories DO INSTEAD NOTHING").Error; err != nil {
		t.Fatalf("rule: %v", err)
	}

	err := runVersionedMigrations(db)
	if err == nil {
		t.Fatal("a missing external-category mapping must fail the migration, not pass quietly")
	}

	// The whole file is one transaction: nothing may survive, and the version must
	// not be recorded, so the next deploy retries it.
	if got := count(t, db); got.categories != 0 || got.subs != 0 {
		t.Errorf("rollback left rows behind: %+v", got)
	}
	if applied14(t, db) != 0 {
		t.Error("a failed migration was recorded as applied — the next deploy would skip it")
	}
}
