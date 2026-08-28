# KYC — production environment checklist & runbook

Seller identity verification handles **government ID images, selfies and BVNs** — the most sensitive data vibaar stores, and the part covered by Nigeria's **NDPR**. The code is built and gated; what remains is environment configuration that **cannot be verified from a development machine**, because it depends on the live Cloudinary account and a real submit → review round-trip.

**Do not launch KYC without walking §1 and §2.** Everything in §1 fails *silently or late* if skipped: documents are stored publicly, or the first seller to submit a BVN gets a hard error.

---

## What the system does

| Piece | Behaviour |
|---|---|
| **Withdrawal gate** | Once a business's cumulative settled sales cross the threshold, withdrawal requires an approved KYC. Selling and earning are **never** blocked — only cash-out. Server-authoritative in `WalletService.RequestWithdrawal`; the web pre-check only surfaces the CTA earlier. |
| **Threshold** | `KYC_WITHDRAWAL_GATE_NGN`, default **₦100,000**. |
| **Document storage** | `UploadKYCFile` — authenticated (private) Cloudinary delivery when enabled, returning a `cld-auth:<public_id>` reference; reads go through `SignedKYCURL`. |
| **BVN** | AES-256-GCM encrypted at rest (`helper.EncryptBVN`), stored with an `enc:v1:` marker, decrypted only on read paths. |
| **Admin review** | Approve/reject writes `ReviewedBy`; the seller gets a `KYC_REQUIRED` coded error until approved; a pending-count badge shows in admin nav; review screens show a payout-account **name-match** badge (match / partial / mismatch). |

---

## §1 — Required environment (blocking)

### `BVN_ENCRYPTION_KEY` — **hard requirement**

A base64-encoded 32-byte key, or a raw 32-character string.

```bash
openssl rand -base64 32
```

- A **missing or malformed key is a hard error**, not a warning — the KYC submit path fails outright.
- **Losing this key makes every stored BVN permanently unreadable.** Store it in the same vault as the DB credentials.
- **Do not rotate it casually.** There is no re-encryption routine; rotating without one strands existing ciphertext. If you must rotate, plan a migration that decrypts with the old key and re-encrypts with the new one, in one pass, with a verified backup first.

### `KYC_PRIVATE_STORAGE=true` — **the NDPR switch**

This is the one that matters most, and it is **off by default**.

```
KYC_PRIVATE_STORAGE=true
```

While it is unset or `false`, KYC documents and selfies upload through the **legacy public path** — the same public Cloudinary URLs used for product images. Government IDs and selfies would be **publicly fetchable by anyone with the URL**. That is the exact NDPR exposure the flag exists to close.

It ships defaulted to `false` deliberately: authenticated delivery must be confirmed working on the real Cloudinary account first, and that cannot be tested from a dev machine. **Turning it on is a launch step, not an optional hardening.**

The upload path is written to fail safe: on a Cloudinary error it returns the error rather than falling back to a public upload. It never quietly downgrades KYC PII.

### `CLOUDINARY_URL`

Must be the real production account. If it is empty or the `cloudinary://test:test@test` placeholder, uploads fall back to local file storage — fine for dev, wrong for production.

### `KYC_WITHDRAWAL_GATE_NGN` (optional)

Defaults to `100000`. Set explicitly if you want a different threshold. A non-numeric or non-positive value falls back to the default.

---

## §2 — Verification round-trip (must be done on staging first)

This cannot be verified from a dev machine. Run it on staging with the production-shaped Cloudinary account, then repeat once on production before announcing.

1. **Submit** a KYC application as a test seller, with a document image and a selfie.
2. **Inspect the stored reference in the DB.** It must start with `cld-auth:` — not an `https://res.cloudinary.com/...` URL.
   ```sql
   SELECT id, document_url, selfie_url FROM kycs ORDER BY created_at DESC LIMIT 5;
   ```
3. **Confirm the raw asset is NOT publicly fetchable.** Take the Cloudinary public_id and try the plain public delivery URL in a logged-out browser or `curl`. It must **401/404**. If the image loads, `KYC_PRIVATE_STORAGE` did not take effect — stop and fix before going live.
4. **Confirm admin review still displays the document** — the signed URL path (`SignedKYCURL`) must resolve for a reviewer. Private storage that reviewers can't read is just as broken.
5. **Confirm BVN ciphertext at rest:**
   ```sql
   SELECT bvn FROM kycs WHERE bvn IS NOT NULL AND bvn <> '' LIMIT 3;
   ```
   Every value must begin with `enc:v1:`. A bare 11-digit number means encryption is not active — stop.
6. **Walk the withdrawal gate.** With a business under the threshold, withdrawal succeeds. Push cumulative settled sales over it with KYC unapproved → withdrawal must fail with the `KYC_REQUIRED` code and the "verify your identity to withdraw" message. Approve the KYC → withdrawal succeeds.
7. **Check the name-match aid** renders on the admin review screen against a payout account.

---

## §3 — Operational notes

- **Approval is manual.** Someone has to review the queue. Decide who owns it and how fast they respond before you gate sellers' money on it — a seller who cannot withdraw and cannot get reviewed is a support incident and a trust problem.
- **The pending-count badge** in admin nav is the queue signal. If it grows, cash-out is blocked for real sellers.
- **Rejection messaging** should tell the seller what to fix. A bare rejection generates support load.
- **Retention.** NDPR expects personal data not to be kept longer than needed. There is currently **no automated retention or deletion policy** for KYC documents. Decide the policy; implementing it is a tracked follow-up, not something the code does today.
- **Access.** Anyone with admin access can view submitted documents. Keep the admin account list short, and review it.

---

## §4 — Known gaps (not blockers, but know them)

| Gap | Status |
|---|---|
| Automated document retention / deletion | Not built. Policy decision needed. |
| BVN key rotation procedure | No re-encryption routine. Plan before any rotation. |
| Admin access audit log for document views | `ReviewedBy` records decisions, not views. |

---

## Quick reference

```bash
# Backend .env — production KYC block
BVN_ENCRYPTION_KEY=<openssl rand -base64 32>   # losing this strands every BVN
KYC_PRIVATE_STORAGE=true                        # NDPR: without this, docs are PUBLIC
CLOUDINARY_URL=cloudinary://<real-account>      # not the test placeholder
KYC_WITHDRAWAL_GATE_NGN=100000                  # optional; this is the default
```

Related: **[DEPLOY.md](./DEPLOY.md)** · spec `product-management/requirements/KYC1_SELLER_VERIFICATION.md`
