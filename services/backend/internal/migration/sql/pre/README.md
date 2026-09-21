# `sql/pre` — migrations applied BEFORE AutoMigrate

This directory is **empty on purpose**. Nothing here yet, and no version number
consumed.

## What belongs here

Only structural changes GORM's `AutoMigrate` would mis-handle if it ran first.
In practice that means **renames**.

`AutoMigrate` does `if !HasTable(x) { CreateTable(x) }`. So on the first boot
after a model's table name changes, it looks for the new name, finds nothing,
and **creates it empty**. A versioned `ALTER TABLE … RENAME TO` then fails
because the target already exists — and the old table, with the data in it, is
left orphaned. No error, no warning, and the application serves the empty table.

Neither obvious workaround works:

- shipping the rename one deploy earlier leaves the running pods pointing at a
  name that no longer exists;
- guarding it with `IF to_regclass(new) IS NULL` skips the rename, because
  `AutoMigrate` has already created the table;
- reordering the whole runner breaks fresh-database provisioning —
  `014_seed_product_taxonomy.sql` does `INSERT INTO external_categories` and
  depends on `AutoMigrate` having created those tables.

## What does NOT belong here

Everything else: indexes, constraints, backfills, seeds, and **new** tables.
A new table is not a hazard — `AutoMigrate` creates it correctly, and the
versioned file adds only what `AutoMigrate` cannot express. Put those in
`sql/`.

## Rules

- **One ledger, one version sequence.** `schema_migrations` is shared with
  `sql/`, so a version number means the same thing whichever phase it came
  from. Never reuse a number that exists in either directory — and the runner
  now **enforces** this across both phases before either applies anything,
  because a collision is unrecoverable rather than untidy: whichever file
  applies first records the number, and the other is skipped as
  already-applied on every boot thereafter, so the schema quietly lacks what
  it did while the ledger says it ran.
- **Never rename a migration that has been applied.** The ledger records which
  FILE was applied, and the runner compares that name to the shipped one. A
  mismatch halts the boot rather than skipping the version silently, because
  the alternative is a file that never runs while the ledger asserts it did.
  Ship the change as a NEW version instead. (The recorded name is the bare
  filename, with no directory prefix — that is what every existing database
  already has.)
- **Safe where `AutoMigrate` has never run.** A `pre/` file executes on a fresh
  database before any table exists, so every statement must be guarded:
  `ALTER TABLE IF EXISTS`, `to_regclass(...) IS NOT NULL`, or a `DO $$` block
  that checks first. A clean no-op on a fresh database is the requirement, not a
  nicety.
- **Version numbers are allocation order, not ship order.** A `pre/` file can
  legitimately have a LOWER number than `sql/` files that ship before it — the
  runner's applied-check is per version (`WHERE version = ?`), never a
  high-water mark, so an earlier number being unrecorded suppresses nothing.
- **No `sql/` migration may name a table a `pre/` migration renames.** Otherwise
  a fresh database created after the rename ships runs the rename as a no-op,
  lets `AutoMigrate` create the NEW name, and then hits an `sql/` file still
  referring to the old one. Anything touching a renamed table belongs in a
  file that ships with the rename, after it.

Tests for all of the above: `internal/migration/phase_test.go`.
