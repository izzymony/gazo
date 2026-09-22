# Payout readiness — Paystack Transfers

Run before `PAYOUTS_LIVE` is ever set to `true`, in each environment
separately. Payouts default to **off**, and that default is tested.

```bash
cd services/backend
make paystack-preflight
```

Read-only: it lists and reads, and initiates nothing.

## What it checks, and why each one is here

| Check | Why it can't be assumed |
|---|---|
| key mode | Running against `sk_live_` moves real money. It should never be a surprise which key is loaded. |
| balance readable | Proves the secret key is accepted and the API is reachable. A 401 here is the whole integration. |
| transfers enabled | **Transfers are not on by default.** Paystack enables them per business. Without this the first thing to discover it is a seller's withdrawal. |
| OTP not required | With "confirm transfers before sending" ON, `POST /transfer` succeeds with `status: "otp"` and waits for a human. Nothing in this service can move it, so the withdrawal parks in `awaiting_otp` **and the seller's funds stay reserved**. Detected by reading transfer history: it can prove OTP is on, and cannot prove it is off on an account that has never sent one. |
| settlement visible | Transfers are funded from the Paystack **balance**. An account that settles straight to its bank keeps a zero balance, and then every transfer fails for insufficient funds no matter how correct the code is. |

## What it cannot check

The API does not expose these, so they are confirmed by hand:

- The Paystack dashboard shows Transfers enabled for **this** business.
- Settings → Preferences → **"Confirm transfers before sending" is OFF**. This is
  required for Phase 1: there is no OTP finalisation path, so an OTP-gated
  transfer escalates to `needs_review` after the retry budget and waits for a
  person. The reservation is held throughout — no money is lost — but the payout
  does not complete.
- A real test-mode transfer completes end to end **and its webhook arrives**.
- The webhook URL registered with Paystack points at this environment.

## Result — local, 2026-09-21

Transfer OTP was disabled on the Paystack test account by the account owner.
Re-run against **test mode** with the credentials in `.env`:

```
✓ key mode                     TEST key — safe to exercise
✓ balance readable             NGN 1831900.06
✓ transfers enabled            the transfer API answers
✓ OTP not required             none of the last 4 transfers needed OTP
✓ settlement visible           no settlements yet
RESULT: every automated check passed.
```

All five automated checks pass.

**What this check can and cannot see.** It infers the OTP setting from transfer
history, because Paystack exposes no endpoint for the setting itself. The two
transfers that sat at `otp` on 2026-09-20 have since expired to `abandoned`, so
"none needed OTP" is true of the history — but history alone cannot distinguish
"the setting was turned off" from "the OTP transfers aged out". The
authoritative confirmation is the account owner's, given on 2026-09-21: Settings
→ Preferences → "Confirm transfers before sending" is OFF. The first real
test-mode transfer is what will prove it end to end.

### Previous run — 2026-09-20 (superseded)

```
✗ OTP not required             a recent transfer is stuck at `otp`
RESULT: not ready — 1 blocking failure(s).
```

An earlier run, before this check existed, reported "every automated check
passed" on that same account. The readiness gate was giving a false green on the
one setting that silently strands payouts, which is why the check was added.

`PAYOUTS_LIVE` remains unset. The automated checks are a precondition, not the
authorisation: the remaining manual checks above, the data audit, the bank-code
audit and a completed test-mode transfer all come first.

## Bank codes — required once, before the first payout

`bank_code` was an integer column, which destroyed every code whose leading
characters matter. 52 of 284 NGN codes begin with a zero (Access 044, First
Bank 011, UBA 033, Zenith 057, GTBank 058) and 10 are not numeric at all
(035A, MFB50094, FC40163, D53).

Measured, not inferred: `POST /transferrecipient` with bank_code `"44"` is
refused with **"Bank is invalid"**; the same request with `"044"` returns 201
and a recipient code. So while the column was an integer, sellers at most of
Nigeria's largest banks could not be paid — and it surfaced to them as "check
your bank details".

Migration 016 widens the column to text but does **not** guess the missing
characters: padding 33 to "033" is right for UBA and the same rule turns
MINT-FINEX MFB's real code "09" into "009". The repair matches the stored bank
NAME against Paystack's live list.

```bash
make bank-codes-audit    # report only
make bank-codes-repair   # apply, and clear recipient codes built from the wrong bank
```

Run per environment after migration 016. **Both exit non-zero** while anything
is wrong, failed or unresolved, so they work as a go-live gate; a clean audit
exits 0.

Three things the repair does that matter:

- It clears the recipient in **both** places. `existingRecipientCode` prefers
  the typed `paystack_recipient_code` column and falls back to a
  `paystack_transfer_recipient_code` key inside the `metadata` jsonb. A
  recipient identifies an account *at Paystack*, so one created from the wrong
  bank code points at the wrong destination — clearing only the column leaves
  the legacy copy live and the next payout reuses it.
- It is **one transaction, verified before it commits**. If either recipient
  copy or the bank code is not as intended afterwards, the whole thing rolls
  back and the account is reported as failed, untouched.
- It **never guesses between two banks.** Candidates are grouped by normalised
  name; anything matching zero or more than one Paystack bank is reported as
  unresolved. (Paystack's NGN list has no such collision today — 284 banks, 284
  distinct normalised names — but it grows, and picking wrong sends a seller's
  money to another institution.)

| Environment | Bank codes |
|---|---|
| local | Repaired. 1 account: UBA `33` → `033`, stale recipient cleared. Re-audit clean. |
| staging | **Not run** — database unreachable. |
| production | **Not run** — no access from here. |

## Data audit — required before enabling, per environment

```sql
-- Withdrawals by status. `completed` rows are the ones that matter: each
-- records an approval whose payment nobody verified.
SELECT status, count(*), COALESCE(sum(amount), 0) AS total
FROM withdrawal_requests GROUP BY status ORDER BY 2 DESC;

-- A negative reservation means the effective balance (available − pending)
-- overstates what the seller can withdraw.
SELECT count(*) AS wallets,
       COALESCE(sum(total_withdrawn), 0)     AS total_withdrawn,
       COALESCE(sum(pending_withdrawals), 0) AS reserved,
       count(*) FILTER (WHERE pending_withdrawals < 0) AS negative_reservations
FROM wallets;
```

| Environment | Status |
|---|---|
| local | Clean. `withdrawal_requests` empty, `total_withdrawn` ₦0, 0 negative reservations across 23 wallets. |
| staging | **Not run.** The database refuses connections — the port accepts TCP and the server then closes the SSL handshake, which is how a suspended Render instance presents. Must be run before shipping. |
| production | **Not run.** No access from here. Must be run before shipping. |

Migration 015 deliberately does **not** relabel `completed` as `paid`. Those
rows assert a payment the system never verified, and only someone with the bank
statement can say which of them really happened. If either environment has
`completed` rows, reconcile them against the bank before enabling payouts —
relabelling them would restate the same unverified claim in new vocabulary.

## Enabling

Only after: the automated checks pass (including **OTP not required**), the
manual checks are done, the data audit is clean for that environment, the bank
code audit reports no wrong or unresolved accounts, and a test-mode transfer has
settled end to end through the webhook.

```
PAYOUTS_LIVE=true
```

Note what the flag does and does not stop. It gates the one step that sends
money — initiation, including the reconciler's re-send. It deliberately does
**not** gate reconciliation or webhook handling, because the moment it is most
likely to be pulled is during an incident, with transfers already in flight and
sellers' funds already reserved; switching off the thing that resolves them
would freeze every one of those payouts.

Nor does a pause consume the provider retry budget. A withdrawal that could not
be re-sent because payouts were off records why and stays `processing`; it does
not count as a Paystack attempt. Otherwise ~25 minutes with the switch off
(the reconciler runs every five) would escalate every in-flight payout to
`needs_review` — a state the reconciler no longer scans — and re-enabling
payouts would resume none of them.

Until then `ApproveWithdrawal` returns `503 payouts_disabled` **before any state
change**, and the admin UI disables the action. Nothing is recorded, no wallet
moves, no notification is sent — which is the specific failure this work exists
to remove: a system that cannot pay recording that it paid.
