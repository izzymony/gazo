-- Payout lifecycle: provider references, transfer state, and the constraints
-- that make repeated delivery safe WITHOUT trusting a webhook event id.
--
-- Before this, admin approval debited the wallet, wrote a ledger row marked
-- `completed` and notified the seller, with no Paystack call anywhere in the
-- path. There was no column able to hold a transfer reference, and no state
-- meaning "asked Paystack, waiting" — so there was nowhere to put the truth
-- even if someone had gone looking for it.
--
-- Idempotency here is structural, not remembered. Four guards, of which three
-- are in this file:
--   1. provider_reference UNIQUE — generated and committed BEFORE the network
--      call and reused on every retry, so Paystack itself dedupes the transfer
--      and a crash between claim and call is recoverable by verifying it.
--   2. provider_transfer_code UNIQUE — one Paystack transfer can never attach
--      to two withdrawals.
--   3. the partial unique index on wallet_transactions — one withdrawal yields
--      at most one `withdrawal` row and at most one `withdrawal_reversal` row,
--      however many times a webhook arrives.
-- The fourth is the guarded UPDATE in application code.

ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS provider               text,
  ADD COLUMN IF NOT EXISTS provider_reference     text,
  ADD COLUMN IF NOT EXISTS provider_transfer_code text,
  ADD COLUMN IF NOT EXISTS provider_status        text,
  ADD COLUMN IF NOT EXISTS failure_reason         text,
  ADD COLUMN IF NOT EXISTS transfer_fee           numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attempt_count          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_at            timestamptz,
  ADD COLUMN IF NOT EXISTS processing_at          timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at                timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at              timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_at            timestamptz;

-- Partial, because these columns hold no value until a transfer is claimed, and
-- "no value" must not collide with itself.
--
-- The predicate excludes the EMPTY STRING as well as NULL, and that is the
-- whole point rather than belt and braces. These are Go `string` fields, not
-- `*string`, so GORM inserts '' — never NULL — for every withdrawal request
-- that has not been claimed yet. An `IS NOT NULL` predicate therefore indexes
-- every unclaimed row under the same key '', and the SECOND withdrawal request
-- in the system fails with a unique violation. Verified against Postgres: two
-- rows with '' are rejected by `WHERE col IS NOT NULL`, accepted by this.
--
-- DROP first so a database that already ran an earlier form of this migration
-- is corrected rather than left on the broken predicate.
DROP INDEX IF EXISTS withdrawal_requests_provider_reference_key;
CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_requests_provider_reference_key
  ON withdrawal_requests (provider_reference)
  WHERE provider_reference IS NOT NULL AND provider_reference <> '';

DROP INDEX IF EXISTS withdrawal_requests_provider_transfer_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_requests_provider_transfer_code_key
  ON withdrawal_requests (provider_transfer_code)
  WHERE provider_transfer_code IS NOT NULL AND provider_transfer_code <> '';

-- The reconciler's working set: everything still awaiting a provider verdict.
CREATE INDEX IF NOT EXISTS withdrawal_requests_awaiting_provider_idx
  ON withdrawal_requests (status, processing_at)
  WHERE status IN ('processing', 'awaiting_otp');

-- `pending` was the old name for "seller asked, funds reserved, nothing sent".
-- That is exactly `requested`, so it maps forward cleanly.
UPDATE withdrawal_requests SET status = 'requested' WHERE status = 'pending';

-- `completed` is deliberately NOT mapped. It means "an admin pressed approve,
-- and a human may or may not have made a bank transfer by hand" — the system
-- never knew which, which is the defect this work exists to remove. Only a
-- person with the bank statement can say whether each one was really paid, so
-- they are left as-is for reconciliation rather than silently relabelled `paid`
-- (which would assert the same unverified claim in new vocabulary).
--
-- Local and staging both have zero such rows at time of writing. If production
-- does not, reconcile them before enabling payouts.

-- The money split, recorded per ledger entry so history never has to be
-- reconstructed from whatever the commission rate happens to be later.
-- Launch is 0% commission: platform_fee = 0 and seller_net = gross_amount.
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS gross_amount numeric,
  ADD COLUMN IF NOT EXISTS platform_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_net   numeric;

-- Scoped to the payout row types on purpose. Those are the entries a repeated
-- webhook could duplicate; the rest of the ledger has its own shapes and some
-- legitimately share a reference. Verified zero existing rows of these types,
-- so this cannot fail on live data.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_payout_reference_key
  ON wallet_transactions (reference, type)
  WHERE type IN ('withdrawal', 'withdrawal_reversal') AND reference <> '';

-- Promoted out of the JSONB `metadata` blob it was being written into by the
-- orphaned transfer code. A recipient code is looked up on every payout and
-- must be uniquely attributable to one account; neither is true of a key inside
-- a jsonb array. The old key is read as a fallback so cached codes survive.
ALTER TABLE business_bank_account_details
  ADD COLUMN IF NOT EXISTS paystack_recipient_code text;

-- Same empty-string reasoning as the withdrawal indexes above: GORM writes ''
-- for an account with no recipient yet, so without the `<> ''` clause the
-- second bank account added to the platform would be rejected.
DROP INDEX IF EXISTS business_bank_account_recipient_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS business_bank_account_recipient_code_key
  ON business_bank_account_details (paystack_recipient_code)
  WHERE paystack_recipient_code IS NOT NULL AND paystack_recipient_code <> '';
