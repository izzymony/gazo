import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The payout flow's copy, asserted against its source.
 *
 * A source assertion rather than a render test because what regresses here is
 * a SENTENCE, and it regresses by being copied back in from somewhere else —
 * which is exactly how `"Held until delivery"` survived in an auth test
 * fixture after the production copy had been corrected. The same pattern is
 * already used in `apps/admin/src/test/withdrawalStatus.test.ts`.
 *
 * Two claims are being kept out:
 *
 *  1. that a transfer is already in flight. It is not — a payout request is
 *     reviewed before any transfer is attempted, and while `PAYOUTS_LIVE` is
 *     false none is attempted at all. "Your money should enter your account
 *     shortly" left a seller waiting for money that had not been sent, and
 *     made a normal review look like a fault.
 *  2. that requesting is itself the withdrawal ("Withdrawal Initiated"),
 *     which conflates the request with the payment.
 */
/**
 * Comments stripped, because the code's own note explaining WHY a sentence was
 * removed necessarily quotes it. A check that reads prose as copy fails on its
 * own documentation — which is exactly what the first version of this test did,
 * and what the equivalent Go source assertion did on the same day.
 *
 * Handles `//`, block comments and JSX `{/* ... *\/}` alike, since the
 * explanation in `withdrawalInitiated.tsx` is a JSX comment.
 */
const stripComments = (source: string) =>
  source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

const read = (file: string) =>
  stripComments(readFileSync(join(__dirname, "..", file), "utf8"));

const SCREENS = ["withdraw.tsx", "confirm.tsx", "withdrawalInitiated.tsx", "details.tsx"];

describe("payout copy does not promise a transfer that has not happened", () => {
  it.each(SCREENS)("%s makes no 'money arriving shortly' promise", (file) => {
    const source = read(file);
    for (const banned of [
      "should enter your account shortly",
      "We are working on your transfer",
      "Withdrawal Initiated",
    ]) {
      expect(source).not.toContain(banned);
    }
  });

  it("the request confirmation says it was received and will be reviewed", () => {
    const source = read("withdrawalInitiated.tsx");
    expect(source).toContain("Payout requested");
    expect(source).toMatch(/reviewed before payment/);
    expect(source).toMatch(/notify you/);
  });

  it("the transaction detail fallback describes a request under review", () => {
    expect(read("details.tsx")).toMatch(/being reviewed/);
  });
});

describe("payout copy states the eligibility delay", () => {
  it("the request screen explains what makes earnings available, and that a request is reviewed", () => {
    const source = read("withdraw.tsx");
    expect(source).toMatch(/available to request \{delayHours\} hours after a delivery/);
    expect(source).toMatch(/review each request before paying it/);
  });

  it("takes the number of hours from the API, never a local constant", () => {
    const source = read("withdraw.tsx");
    // A literal 24 here would desynchronise from EARNINGS_RELEASE_DELAY_HOURS
    // the first time the policy changed — the defect the gate threshold
    // already has in five places.
    expect(source).toContain("releaseDelayHours(walletAnalytics)");
    expect(source).not.toMatch(/\b24\s*hours\b/);
  });

  it("the balance breakdown distinguishes delivered-but-waiting from not-yet-delivered", () => {
    const source = stripComments(
      readFileSync(join(__dirname, "..", "..", "seller-shell", "walletbody.tsx"), "utf8")
    );
    expect(source).toMatch(/available to request \{delayHours\} hours after delivery/);
    expect(source).toContain("Paid for — not delivered yet");
    expect(source).toContain("releaseDelayHours(walletAnalytics)");
  });
});
