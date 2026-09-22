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

## 4b. Backend — money policy 💰

Bounds and windows the business chooses. Every one is read through a helper that
**falls back to the launch default when the variable is missing or
unparseable** — a typo in a deploy config must never resolve to "no bound", and
never to `0`.

| Var | Blocking | Prod-guard | Format / example | Set at | Verify |
|---|---|---|---|---|---|
| `PAYOUTS_LIVE` | — | — | `false` (default when unset). **Only the literal `true` enables transfers** — the kill switch for money leaving the platform | Render | `POST /wallet/withdraw` approval returns 503 while `false` |
| `EARNINGS_RELEASE_DELAY_HOURS` | — | — | `24` (default). Hours after a **confirmed delivery** before earnings become available for payout. Fractional accepted (`0.5`). Unset/garbage/negative → 24. An explicit `0` releases immediately | Render | a delivered item stays in clearing until the window elapses |
| `PAYOUT_MIN_NGN` | — | — | `1000` (default). Smallest payout a seller may request, in naira. Unset/garbage/negative → 1000. An explicit `0` disables the minimum | Render | a ₦500 request is refused with "minimum payout is ₦1,000.00" |
| `CHECKOUT_MAX_NGN` | — | — | `1000000` (default). Largest order total accepted for collection, in naira | Render | an order above it is refused before Paystack is called |
| `SHIPPING_QUOTE_TTL_MINUTES` | — | — | `1440` (default, 24h). How long a shipping PRICE QUOTE stays valid. A quote is also bound to one buyer, one product and one address, and those checks are not configurable | Render | a stale quote is refused at checkout with "please reselect delivery" |
| `KYC_WITHDRAWAL_GATE_NGN` | — | — | `100000` (default) — see §5 | Render | withdrawal gate fires at threshold |

> ⚠ **These bounds are not the safety guards.** Positivity, whole-kobo
> precision and the payments client's own kobo ceiling are enforced
> independently in code and **no environment variable can switch them off**.
> The variables above are product policy; a misconfigured one changes what is
> allowed, never whether a negative or sub-kobo amount can reach the ledger.

> ⚠ **`PAYOUTS_LIVE` fails closed and silently.** Anything other than the
> literal `true` — including `TRUE`, `1`, a typo, or the variable being renamed
> — disables payouts with no error. It is read in exactly one place
> (`payoutService.PayoutsLive`) and is **not** yet checked by `ValidateEnv`;
> that boot guard is G26, scheduled for P13.

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
| `SHIPBUBBLE_API_KEY_PROD` | ✅ (production only) | ✅ (required; rejects `sb_sandbox_`) | live key. **Read ONLY in production** — never a fallback for staging | Render (vault) | rates fetch on checkout |
| `SHIPBUBBLE_API_KEY_STAGING` | ✅ (staging/dev/local) | — | sandbox key. **Read ONLY outside production**, and required there unless the local mock is on. Rejects `sb_prod_` | Render | rates fetch on staging checkout |
| `SHIPBUBBLE_API_URL` | ✅ | ✅ (must be https; `app.shipbubble.com` refused by name) | `https://api.shipbubble.com/v1` — the default if unset | Render | address validation returns JSON, not an HTML 404 |
| `ENABLE_MOCK_SERVICES` | — | ✅ (reject `true`) | unset/`false` in prod | Render | real shipping/SMS used |
| `ALLOWED_ORIGINS` | ✅ | ✅ (reject localhost) | `https://vibaar.com,https://www.vibaar.com,https://admin.vibaar.com` | Render | prod frontend calls not CORS-blocked |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | ⚠ | — | your inbound-webhook token (fails closed outside local) | Render | WhatsApp webhook verifies |
| `TRANSACTIONAL_NOTIFICATIONS_ENABLED` | — | — | `true` to enable | Render | notifications fire |
| `SENTRY_DSN` | — | — | `https://…@sentry.io/…` | Render | errors appear in Sentry |
| `ADMIN_BOOTSTRAP_EMAIL` `ADMIN_BOOTSTRAP_PASSWORD` | ✅² | — | first-admin creds (password ≥12 chars) | run `./backend seed` once | admin can log in |
| `GOOGLE_*` `INSTAGRAM_*` `TIKTOK_*` (OAuth) | ❌ post-launch | — | client id/secret/redirect | — | **Deferred: no social auth for launch** |
| `SEED_TEST_PASSWORD` | — | — | local-only seeder | local | — |

² Bootstrap runs once to create the first admin (an existing admin is never modified).
`./backend seed` is **safe to run in staging and production**: it seeds categories,
notification templates and the admin bootstrap. The demo catalog and its committed-password
test login (`sam.show@example.com`) are guarded to local/dev — they used to be created in
whatever database this command was pointed at.

---

## 8. Web (`apps/web`) — all `NEXT_PUBLIC_*`, **build-time**

`NEXT_PUBLIC_*` are baked in at **build** time, not read at runtime. On Cloudflare set
them as **build environment variables**; changing one needs a **rebuild**.
**`apps/web` has no `.env.example`** — this table is its template.

| Var | Blocking | Format / example | Set at | Verify |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | `https://api.vibaar.com/api/v1` — **must include `/api/v1`** | Cloudflare build | network tab hits `api.vibaar.com/api/v1/…` |
| `NEXT_PUBLIC_ORDER_ON_SUCCESS` | ✅ (decide) | `true` to use the order-on-success payment flow (the path fixed in Payment-G) | Cloudflare build | paid checkout creates the order |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` `NEXT_PUBLIC_GOOGLE_API_KEY` | ⚠ | Maps/Places key | Cloudflare build | address autocomplete works |
| `NEXT_PUBLIC_SENTRY_DSN` | — | Sentry DSN | Cloudflare build | web errors in Sentry |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | — | `G-…` | Cloudflare build | analytics events |

## 9. Admin (`apps/admin`) — `NEXT_PUBLIC_*`, build-time

| Var | Blocking | Format / example | Set at | Verify |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | `https://api.vibaar.com/api/v1` — **versioned** | Cloudflare build | admin loads data |
| `NEXT_PUBLIC_API_URL` | ✅ | `https://api.vibaar.com` — **bare origin, NO `/api/v1`** | Cloudflare build | admin login succeeds |
| `NEXT_PUBLIC_SENTRY_DSN` | — | Sentry DSN | Cloudflare build | — |

> ⚠ **Admin reads TWO API-URL vars, and they take DIFFERENT forms.** This
> instruction used to say "set both to the same value", which is what broke
> admin login on staging:
>
> | Var | Form | Read by |
> |---|---|---|
> | `NEXT_PUBLIC_API_URL` | **bare origin** — `https://api.vibaar.com` | `lib/config.ts`, which appends `/api/v1` itself |
> | `NEXT_PUBLIC_API_BASE_URL` | **versioned** — `https://api.vibaar.com/api/v1` | `lib/api-client.ts`, which uses it as-is |
>
> Setting both to the versioned value made `config.ts` produce
> `https://api-staging.vibaar.com/api/v1/api/v1/admin/auth/login`, which 404s.
> Setting both to the bare origin fails the other way: every `api-client`
> request loses its prefix.
>
> Both readers now normalise through `lib/apiUrl.ts`, so **either form works
> for admin** and the doubled prefix cannot be produced — pinned by
> `src/test/apiUrl.config.test.ts`. The forms above remain the canonical
> values; the normalisation is a safety net, not a licence to guess.
>
> **`apps/web` does NOT normalise.** `packages/api-client` uses
> `NEXT_PUBLIC_API_BASE_URL` verbatim, so for web it **must** include
> `/api/v1`.

---

## 10. Known drift & gaps

Fix or ignore knowingly — these are why you must use this doc over the template:

- **`services/backend/.env.example` is stale.** It **omits `PAYSTACK_AUTH`** (the key the API client actually uses) and `PAYSTACK_URL`; it lists `SMTP_*`/`FROM_EMAIL` (code uses `SENDGRID_*`), `INSTAGRAM_ID`/`_SECRET` (code reads `INSTAGRAM_CLIENT_ID`/`_SECRET`), `SENDCHAMP_API_KEY`/`_SENDER_NAME` (code reads `SENDCHAMP_PUBLIC_API_KEY`/`_SENDER_ID`), `SHIPBUBBLE_API_KEY` (code reads `_PROD` in production and `_STAGING` everywhere else, with no fallback). **Recommend regenerating `.env.example` from code reads** as a follow-up.
- **`apps/web` has no `.env.example`.** §8 above is its de-facto template.
- **Admin's dual API-URL vars** (§9) and **Paystack's dual secret vars** (§4) are latent footguns until unified.
- **Multiple SMS providers wired** (§6) — pick one for production.

---

## 11. Go/no-go gate

The env tables above say whether the configuration is right. This says whether
to **launch**. Run it after the staging QA pass
([QA-PLAYBOOK.md](./QA-PLAYBOOK.md)); every line must be false.

**Do not launch if any of these is true:**

- [ ] A buyer cannot complete checkout
- [ ] The payment webhook does not move the order status
- [ ] Shipping rates cannot load
- [ ] A seller cannot create or edit a product — **or an edit does not survive a reload**
- [ ] An admin cannot reach the screens they must review
- [ ] KYC documents are reachable while signed out, or the flow fails
- [ ] The staging or production frontend calls `localhost` *(covered by `pnpm qa:smoke`)*
- [ ] A provider secret appears in any log, server or browser
- [ ] Mobile checkout is broken on a real phone
- [ ] `schema_migrations` is missing a migration that exists in the repo

The first eight have automated coverage in `pnpm qa:staging`; the mobile and
secret checks are manual — see
[STAGING-QA-CHECKLIST.md](./STAGING-QA-CHECKLIST.md).

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
SHIPBUBBLE_API_URL=https://api.shipbubble.com/v1
ALLOWED_ORIGINS=https://vibaar.com,https://www.vibaar.com,https://admin.vibaar.com
# dev bypasses OFF (guard rejects true): SKIP_SMS_VERIFICATION / ENABLE_MOCK_SERVICES / USE_LOCAL_FILE_STORAGE
```

Related: **[DEPLOY.md](./DEPLOY.md)** · **[KYC-PRODUCTION-RUNBOOK.md](./KYC-PRODUCTION-RUNBOOK.md)** · boot guard `helper.ValidateEnv` (`a16a6ba`).
