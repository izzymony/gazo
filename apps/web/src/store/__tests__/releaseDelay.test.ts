import { releaseDelayHours, type WalletAnalytics } from "../businessStore";

/**
 * D1: earnings become available for payout a configurable number of hours
 * after a confirmed delivery (`EARNINGS_RELEASE_DELAY_HOURS`, 24 at launch).
 *
 * The seller screens state that number, and they read it from the balances API
 * rather than holding their own copy. The reason is a defect this codebase
 * already has: the KYC gate threshold exists in five places — the release
 * job's nudges, this bundle's pre-check and three notification templates — so
 * changing the env var desynchronises every message about the gate from the
 * gate that is actually enforced, and nothing fails when it does.
 *
 * What is pinned here is the fallback behaviour, because that is the part a
 * stale deploy or an older backend exercises.
 */
const balances = (release_delay_hours?: unknown): WalletAnalytics =>
  ({
    available_balance: 31000,
    clearing_balance: 4000,
    orders_in_progress: 12500,
    total_earnings: 184300,
    total_withdrawn: 153300,
    release_delay_hours,
  }) as WalletAnalytics;

describe("releaseDelayHours", () => {
  it("uses the value the API reports", () => {
    expect(releaseDelayHours(balances(24))).toBe(24);
    expect(releaseDelayHours(balances(48))).toBe(48);
    expect(releaseDelayHours(balances(0))).toBe(0);
  });

  it("rounds a fractional policy to whole hours, because the copy reads in hours", () => {
    expect(releaseDelayHours(balances(0.5))).toBe(1);
    expect(releaseDelayHours(balances(23.6))).toBe(24);
  });

  it("falls back to the launch default when the field is missing or unusable", () => {
    // An older backend does not send the field at all. Showing a sentence with
    // the launch default is better than showing none: a wrong number is
    // visible and reportable, silence is not.
    expect(releaseDelayHours(balances(undefined))).toBe(24);
    expect(releaseDelayHours(balances(null))).toBe(24);
    expect(releaseDelayHours(balances("24"))).toBe(24);
    expect(releaseDelayHours(balances(NaN))).toBe(24);
    expect(releaseDelayHours(balances(Infinity))).toBe(24);
    // Never render a negative delay.
    expect(releaseDelayHours(balances(-5))).toBe(24);
  });
});
