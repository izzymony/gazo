# Database migrations

## Active — auto-run at boot (B9)

Schema changes that GORM `AutoMigrate` can't express — functional / unique
indexes, data backfills, `NOT NULL` constraints — live in
[`../internal/migration/sql/`](../internal/migration/sql/) as `NNN_name.sql` and
are applied automatically at startup by the boot migration runner
([`internal/migration/versioned.go`](../internal/migration/versioned.go)), each
recorded once in the **`schema_migrations`** version table. There is **no manual
step** any more: a fresh DB boot runs AutoMigrate (base tables from the domain
structs) and then these, in numeric order.

**To add a migration:** drop a new `internal/migration/sql/NNN_name.sql`. Write it
idempotently (`IF NOT EXISTS`, guarded `UPDATE`, repeatable backfill). One
statement per `;`; no functions / `DO $$` dollar-quoted blocks / semicolons inside
string literals — the runner strips `--` comments and splits on `;`, so those
would need a real parser. It runs inside a transaction and is recorded on success.

## Historical (this directory)

- **`001`–`006`** — early admin/variant table creates + drops. **Superseded by
  AutoMigrate** (base tables now come from the domain structs). Kept for history.
- **`008_credit_existing_users_signup_bonus.sql`** — one-time money data op; the
  signup bonus is now applied in code at signup. **Not** auto-run.
- **`007`, `009`–`012`** — **moved** to `internal/migration/sql/` and are now
  auto-run + tracked. Do **not** run these by hand any more.
- **`staging/`** — one-off staging data fixes (historical).
