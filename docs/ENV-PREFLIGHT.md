# Production environment preflight — vibaar

The single tick-list of every environment variable the three apps read, what it's
for, and how to know it's right **before** and **after** deploy. A wrong env value
is the most likely thing to silently break payments, KYC, media, SMS, email, or
frontend API routing at go-live — this catches that.

> **Built from code reads, not the template.** `services/backend/.env.example` has
> drifted from what the code actually reads (see [§8 Known drift](#8-known-drift--gaps)).
> Trust this document. Where they disagree, the code wins.

**Legend** — **Blocking** = launch fails or a core flow breaks without it · **Prod-guard** =
the backend [boot guard](#0-the-boot-guard-enforces-the-backend-blockers) (`helper.ValidateEnv`, commit `a16a6ba`)
refuses to start production if this is wrong · **Set at** = where the value lives.

---

## 0. The boot guard enforces the backend blockers

When `APP_ENV`/`ENV` resolve to **production**, the backend **refuses to boot** unless
the prod-critical backend vars below are correct. So for the backend you cannot
*accidentally* launch with most of these wrong — a misconfigured prod deploy dies at
startup with the full list of problems in the logs. The guard covers: live Paystack
keys (both vars, reject `sk_test`), `KYC_PRIVATE_STORAGE=true` + real `CLOUDINARY_URL`,
`BVN_ENCRYPTION_KEY`, `JWT_SECRET`/`REFRESH_SECRET`, no dev bypasses
(`SKIP_SMS_VERIFICATION`/`ENABLE_MOCK_SERVICES`/`USE_LOCAL_FILE_STORAGE`), no
localhost in `DB_*`/`ALLOWED_ORIGINS`, and `APP_ENV`≡`ENV`. The guard does **not**
cover the frontend (Cloudflare build vars) or SMS/email/shipping provider keys — those
are on this list but verified by hand.

---

## 1. Backend — runtime & environment

| Var | Blocking | Prod-guard | Format / example | Set at | Verify after deploy |
|---|---|---|---|---|---|
| `APP_ENV` | ✅ | ✅ | `production` (one of local\|development\|staging\|production) | Render | boot succeeds; guard logs env |
| `ENV` | ✅ | ✅ | `production` — **must equal `APP_ENV`** (legacy 2nd var; guard cross-checks) | Render | — |
| `APP_NAME` | — | — | `vibaar` | Render | Sentry release label |
| `PORT` | ✅ | — | `8088` locally; **Render injects it** — don't hardcode | Render (auto) | health check 200 |

## 2. Backend — database

| Var | Blocking | Prod-guard | Format / example | Set at | Verify |
|---|---|---|---|---|---|
| `DB_DSN` | ✅ | ✅ (rejects localhost) | `postgres://user:pass@<internal-host>:5432/db?sslmode=require` — Render **internal** connection string | Render | `SELECT * FROM schema_migrations` |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_DATABASE` | ⚠ | ✅ (`DB_HOST` localhost) | discrete parts; `DB_DSN` is the primary read | Render | — |
| `DB_DRIVER` | — | — | `postgres` | Render | — |

## 3. Backend — auth secrets

| Var | Blocking | Prod-guard | Format / example | Set at | Verify |
|---|---|---|---|---|---|
| `JWT_SECRET` | ✅ | ✅ (empty + template default) | `openssl rand -base64 48` | Render (vault) | login issues a token |
| `REFRESH_SECRET` | ✅ | ✅ | `openssl rand -base64 48` | Render (vault) | refresh flow works |

## 4. Backend — Paystack (payments) 💳

| Var | Blocking | Prod-guard | Format / example | Set at | Verify |
|---|---|---|---|---|---|
| `PAYSTACK_AUTH` | ✅ | ✅ (require + reject `sk_test`) | `sk_live_…` — API-client key. **Missing from `.env.example`** | Render (vault) | a live test charge initializes |
| `PAYSTACK_SECRET_KEY` | ✅ | ✅ (require + reject `sk_test`) | `sk_live_…` — webhook HMAC key. **Same value as `PAYSTACK_AUTH`** until unified | Render (vault) | webhook signature verifies |
| `PAYSTACK_URL` | ✅ | — | `https://api.paystack.co` | Render | charge reaches Paystack |

> ⚠ **Two vars, one secret.** `PAYSTACK_AUTH` (API) and `PAYSTACK_SECRET_KEY`
> (webhook) hold the **same** live secret today. Set both. Setting only one silently
> breaks half the money path (charges OR webhook confirmation).

## 5. Backend — Cloudinary & KYC (NDPR) 🔐

| Var | Blocking | Prod-guard | Format / example | Set at | Verify |
|---|---|---|---|---|---|
| `CLOUDINARY_URL` | ✅ | ✅ (reject empty/`test`) | `cloudinary://<key>:<secret>@<cloud>` — **real** account with authenticated delivery | Render (vault) | KYC upload ref starts `cld-auth:` |
| `KYC_PRIVATE_STORAGE` | ✅ | ✅ (require `true`) | `true` — **off by default → docs PUBLIC** | Render | raw KYC public URL 401/404s logged-out |
| `BVN_ENCRYPTION_KEY` | ✅ | ✅ (require) | `openssl rand -base64 32` (32-byte b64 or 32-char raw). **Losing it strands every BVN** | Render (vault) | `bvn` column starts `enc:v1:` |
| `KYC_WITHDRAWAL_GATE_NGN` | — | — | `100000` (default) | Render | withdrawal gate fires at threshold |
| `USE_LOCAL_FILE_STORAGE` | — | ✅ (reject `true`) | unset/`false` in prod | Render | — |

Full KYC procedure: **[KYC-PRODUCTION-RUNBOOK.md](./KYC-PRODUCTION-RUNBOOK.md)** §1–§2.

## 6. Backend — OTP, SMS & email 📱✉️

Production now generates and validates a **real** OTP (the static `123456` no longer
works in prod — commit `a16a6ba`), so a **working SMS/email path is required** or no
one can register in production.

| Var | Blocking | Prod-guard | Format / example | Set at | Verify |
|---|---|---|---|---|---|
| `SKIP_SMS_VERIFICATION` | — | ✅ (reject `true`) | unset/`false` in prod | Render | prod OTP is real, not 123456 |
| `SMS_ID` | ✅ | — | `Vibaar` — sender name; **must be REGISTERED** with the provider or NG carriers drop it | Render | a test SMS arrives with the sender |
| `TWILIO_ACCOUNT_SID` `TWILIO_AUTH_TOKEN` | ✅¹ | — | Twilio creds | Render (vault) | OTP SMS/WhatsApp sends |
| `TWILIO_VERIFY_SERVICE_SID` `MESSAGING_SERVICE_SID` | ✅¹ | — | `VA…` / `MG…` | Render | — |
| `TWILIO_WHATSAPP_PHONE_NUMBER` `TWILIO_WHATSAPP_OTP_CONTENT_SID` | ⚠¹ | — | WhatsApp sender + template | Render | WhatsApp OTP sends |
| `SENDCHAMP_PUBLIC_API_KEY` `SENDCHAMP_SENDER_ID` | ⚠¹ | — | Sendchamp SMS creds | Render | — |
| `SLEENGSHORT_KEY` `SLEENGSHORT_URL` | ⚠¹ | — | Sleengshort SMS creds/URL | Render | — |
| `SENDGRID_API_KEY` | ✅ | — | `SG.…` — email OTP + transactional | Render (vault) | email OTP arrives |
| `SENDGRID_FROM_EMAIL` `SENDGRID_FROM_NAME` | ✅ | — | `noreply@vibaar.com` / `Vibaar` | Render | from-address correct |

¹ **Multiple SMS providers are wired** (Twilio, Sendchamp, Sleengshort). Confirm **which one is active** for production and provision only that one's keys — but at least one working SMS path is blocking.

## 7. Backend — shipping, notifications, CORS, monitoring, OAuth

| Var | Blocking | Prod-guard | Format / example | Set at | Verify |
|---|---|---|---|---|---|
| `SHIPBUBBLE_API_KEY_PROD` | ✅ | — | live Shipbubble key | Render (vault) | rates fetch on checkout |
| `SHIPBUBBLE_API_KEY_STAGING` | — | — | sandbox key (staging only) | Render | — |
| `SHIPBUBBLE_API_URL` | ✅ | — | real Shipbubble URL (**not** the local mock) | Render | — |
| `ENABLE_MOCK_SERVICES` | — | ✅ (reject `true`) | unset/`false` in prod | Render | real shipping/SMS used |
| `ALLOWED_ORIGINS` | ✅ | ✅ (reject localhost) | `https://vibaar.com,https://www.vibaar.com,https://admin.vibaar.com` | Render | prod frontend calls not CORS-blocked |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | ⚠ | — | your inbound-webhook token (fails closed outside local) | Render | WhatsApp webhook verifies |
| `TRANSACTIONAL_NOTIFICATIONS_ENABLED` | — | — | `true` to enable | Render | notifications fire |
| `SENTRY_DSN` | — | — | `https://…@sentry.io/…` | Render | errors appear in Sentry |
| `ADMIN_BOOTSTRAP_EMAIL` `ADMIN_BOOTSTRAP_PASSWORD` | ✅² | — | first-admin creds (password ≥12 chars) | run `./backend seed` once | admin can log in |
| `GOOGLE_*` `INSTAGRAM_*` `TIKTOK_*` (OAuth) | ❌ post-launch | — | client id/secret/redirect | — | **Deferred: no social auth for launch** |
| `SEED_TEST_PASSWORD` | — | — | local-only seeder | local | — |

² Bootstrap runs once to create the first admin (an existing admin is never modified).

---

## 8. Web (`apps/web`) — all `NEXT_PUBLIC_*`, **build-time**

`NEXT_PUBLIC_*` are baked in at **build** time, not read at runtime. On Cloudflare set
them as **build environment variables**; changing one needs a **rebuild**.
**`apps/web` has no `.env.example`** — this table is its template.

| Var | Blocking | Format / example | Set at | Verify |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | `https://api.vibaar.com` | Cloudflare build | network tab hits api.vibaar.com |
| `NEXT_PUBLIC_ORDER_ON_SUCCESS` | ✅ (decide) | `true` to use the order-on-success payment flow (the path fixed in Payment-G) | Cloudflare build | paid checkout creates the order |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` `NEXT_PUBLIC_GOOGLE_API_KEY` | ⚠ | Maps/Places key | Cloudflare build | address autocomplete works |
| `NEXT_PUBLIC_SENTRY_DSN` | — | Sentry DSN | Cloudflare build | web errors in Sentry |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | — | `G-…` | Cloudflare build | analytics events |

## 9. Admin (`apps/admin`) — `NEXT_PUBLIC_*`, build-time

| Var | Blocking | Format / example | Set at | Verify |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | `https://api.vibaar.com` | Cloudflare build | admin loads data |
| `NEXT_PUBLIC_API_URL` | ✅ | **same value** as `NEXT_PUBLIC_API_BASE_URL` | Cloudflare build | admin login not "Network error" |
| `NEXT_PUBLIC_SENTRY_DSN` | — | Sentry DSN | Cloudflare build | — |

> ⚠ **Admin reads TWO API-URL vars** (`NEXT_PUBLIC_API_BASE_URL` **and**
> `NEXT_PUBLIC_API_URL`). If they diverge, admin breaks — this was the earlier admin
> "Network error". Set both to the same value until unified.

---

## 10. Known drift & gaps

Fix or ignore knowingly — these are why you must use this doc over the template:

- **`services/backend/.env.example` is stale.** It **omits `PAYSTACK_AUTH`** (the key the API client actually uses) and `PAYSTACK_URL`; it lists `SMTP_*`/`FROM_EMAIL` (code uses `SENDGRID_*`), `INSTAGRAM_ID`/`_SECRET` (code reads `INSTAGRAM_CLIENT_ID`/`_SECRET`), `SENDCHAMP_API_KEY`/`_SENDER_NAME` (code reads `SENDCHAMP_PUBLIC_API_KEY`/`_SENDER_ID`), `SHIPBUBBLE_API_KEY` (code reads `_PROD`/`_STAGING`). **Recommend regenerating `.env.example` from code reads** as a follow-up.
- **`apps/web` has no `.env.example`.** §8 above is its de-facto template.
- **Admin's dual API-URL vars** (§9) and **Paystack's dual secret vars** (§4) are latent footguns until unified.
- **Multiple SMS providers wired** (§6) — pick one for production.

---

## Quick reference — production `.env` (backend)

```bash
APP_ENV=production
ENV=production
JWT_SECRET=<openssl rand -base64 48>
REFRESH_SECRET=<openssl rand -base64 48>
DB_DSN=postgres://<user>:<pass>@<render-internal-host>:5432/<db>?sslmode=require
PAYSTACK_AUTH=sk_live_xxx          # same value ↓
PAYSTACK_SECRET_KEY=sk_live_xxx    # both required
PAYSTACK_URL=https://api.paystack.co
CLOUDINARY_URL=cloudinary://<real-account>
KYC_PRIVATE_STORAGE=true
BVN_ENCRYPTION_KEY=<openssl rand -base64 32>
SMS_ID=Vibaar                      # registered with the SMS provider
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@vibaar.com
SHIPBUBBLE_API_KEY_PROD=xxx
SHIPBUBBLE_API_URL=<real shipbubble url>
ALLOWED_ORIGINS=https://vibaar.com,https://www.vibaar.com,https://admin.vibaar.com
# dev bypasses OFF (guard rejects true): SKIP_SMS_VERIFICATION / ENABLE_MOCK_SERVICES / USE_LOCAL_FILE_STORAGE
```

Related: **[DEPLOY.md](./DEPLOY.md)** · **[KYC-PRODUCTION-RUNBOOK.md](./KYC-PRODUCTION-RUNBOOK.md)** · boot guard `helper.ValidateEnv` (`a16a6ba`).
