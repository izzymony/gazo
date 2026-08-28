-- RW1 / money-safety: exactly ONE signup bonus per user, enforced by the database.
--
-- CreditSignupBonus checks for an existing signup_bonus entry and then inserts.
-- Inside one transaction that stops a RETRY, but under READ COMMITTED two
-- concurrent signups for the same user can both read zero rows and both insert,
-- double-granting the bonus. Application-level check-then-write cannot fix that;
-- a unique index can.
--
-- Partial index (not a table constraint) because uniqueness applies only to the
-- signup_bonus type — a user legitimately has many other credit entries.
--
-- Plain CREATE UNIQUE INDEX, not CONCURRENTLY: the boot runner wraps each file in
-- a transaction, and CONCURRENTLY cannot run inside one. The table is small at
-- launch scale, so the brief lock is fine.

-- Defensive de-duplication first: the index cannot be created while duplicates
-- exist. Keeps the EARLIEST entry per user (created_at, then id as tiebreak) and
-- removes later ones. A no-op where no duplicates exist.
DELETE FROM credit_entries a
USING credit_entries b
WHERE a.type = 'signup_bonus'
  AND b.type = 'signup_bonus'
  AND a.user_id = b.user_id
  AND (a.created_at > b.created_at OR (a.created_at = b.created_at AND a.id > b.id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_entries_one_signup_bonus_per_user
    ON credit_entries (user_id)
    WHERE type = 'signup_bonus';
