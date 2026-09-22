# Staging QA checklist — the manual pass

Run **after** `pnpm qa:staging` is green. Everything here is something
automation is bad at: judgement, feel, trust, and third-party dashboards.
Anything found goes straight into WORK.md with a P0–P3 from the
[playbook](./QA-PLAYBOOK.md#6-severity).

Do the whole thing on a **real phone** at least once. 85% of traffic is mobile,
and a desktop browser at a narrow width is not the same test.

---

## Mobile feel — iOS Safari and Android Chrome

- [ ] Nothing scrolls sideways on any screen
- [ ] Touch targets are comfortable; nothing needs a careful tap
- [ ] The keyboard does not cover the field being typed into
- [ ] Bottom nav / sticky footers do not sit under the home indicator
- [ ] Images load on a throttled 3G profile; layout does not jump as they arrive
- [ ] Back gesture behaves at each step of checkout

## Checkout trust

Money is where hesitation kills conversion.

- [ ] Prices, delivery fees and totals agree at every step
- [ ] Shipping options load and read sensibly for a Nigerian address
- [ ] It is obvious what is being paid and to whom before the Paystack redirect
- [ ] Coming back from Paystack lands somewhere that explains what happened
- [ ] A failed or abandoned payment leaves no half-made order, and says so
- [ ] Nothing announces success before it has happened *(see the Paystack tab)*

## Payment — manual for launch

Automated tests cover only that the webhooks reject unsigned calls.

- [ ] Test-card payment completes and returns to the app
- [ ] **In the Paystack dashboard**: the charge appears, and the webhook delivery shows **2xx**
- [ ] The order status updates after the webhook — not merely on the redirect
- [ ] A declined test card leaves the order unpaid and says so honestly
- [ ] A repeated webhook does not double-credit *(idempotency; re-send from the dashboard)*

## Shipping

- [ ] **In the Shipbubble dashboard**: the rate request appears
- [ ] Rates are plausible for the address, not placeholders
- [ ] A seller address that fails validation produces a message a seller can act on

## Seller journey

- [ ] Create a store end to end; the storefront renders at `/@handle`
- [ ] Upload a product image from a phone camera roll — the real path, not a file picker
- [ ] Edit a product, leave the page, come back: **the change is still there**
- [ ] A save that fails shows exactly one error and does **not** navigate away
- [ ] Payout account and discount creation: a failure keeps you on the form with your input

## KYC — private by contract

- [ ] Documents upload from a phone
- [ ] A document URL **cannot** be opened while signed out or in a private window
- [ ] Reviewing in admin shows the document and the BVN correctly
- [ ] Rejection reasons reach the seller in language they can act on

## Admin

- [ ] Sign in works in a fresh browser with no cached session
- [ ] The review queues load and the actions do what they claim
- [ ] Nothing offers a control that is not wired up

## Copy and visual state

- [ ] Empty states say what to do next, not just that something is empty
- [ ] Loading states exist where the network is slow; nothing looks frozen
- [ ] Error messages say what went wrong and what to do
- [ ] No lorem, no placeholder imagery, no debug text
- [ ] Brand marks and colours are right on both light and dark

## Last look

- [ ] Browser console is free of errors during a full buyer journey
- [ ] **No provider key, token or secret appears in any log** — server or browser
- [ ] `schema_migrations` lists every migration file *(see playbook §2)*
