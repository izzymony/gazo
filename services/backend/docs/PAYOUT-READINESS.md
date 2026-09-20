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
| settlement visible | Transfers are funded from the Paystack **balance**. An account that settles straight to its bank keeps a zero balance, and then every transfer fails for insufficient funds no matter how correct the code is. |

## What it cannot check

The API does not expose these, so they are confirmed by hand:

- The Paystack dashboard shows Transfers enabled for **this** business.
- A real test-mode transfer completes end to end **and its webhook arrives**.
- The webhook URL registered with Paystack points at this environment.

## Result — local, 2026-09-20

Run against Paystack **test mode** with the credentials in `.env`:

```
✓ key mode                     TEST key — safe to exercise
✓ balance readable             NGN 1831900.06
✓ transfers enabled            the transfer API answers
✓ settlement visible           no settlements yet
RESULT: every automated check passed.
```

Automated checks pass. The three manual checks above are **not yet done**, so
`PAYOUTS_LIVE` stays unset.

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

Only after: the automated checks pass, the three manual checks are done, the
data audit is clean for that environment, and a test-mode transfer has settled
end to end through the webhook.

```
PAYOUTS_LIVE=true
```

Until then `ApproveWithdrawal` returns `503 payouts_disabled` **before any state
change**, and the admin UI disables the action. Nothing is recorded, no wallet
moves, no notification is sent — which is the specific failure this work exists
to remove: a system that cannot pay recording that it paid.
