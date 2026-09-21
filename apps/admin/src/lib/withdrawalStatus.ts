/**
 * The withdrawal status vocabulary the admin UI filters and counts by.
 *
 * Extracted from the page because two things went wrong in it that only a test
 * over pure functions can hold down:
 *
 * 1. The filter tabs counted the rows the page had just fetched. That is 20
 *    rows, so every badge was wrong past the first page — and with a filter
 *    active the other tabs counted rows no longer in the response, so they all
 *    read 0. Counts must come from a whole-table tally.
 * 2. The "needs attention" tab counted four states and filtered on one, so its
 *    badge never matched the list it produced. A group is now the single source
 *    of both, which makes that disagreement unrepresentable.
 */

/** A whole-table tally from the API: status -> { count, amount }. */
export type StatusTally = Record<string, { count: number; amount: number }>;

/**
 * `pending` and `completed` sit alongside their modern spellings because rows
 * with those values still exist — migration 015 renamed `pending` to
 * `requested` and deliberately left `completed` alone, since those rows record
 * a payment nobody verified.
 */
export const AWAITING_APPROVAL = ['requested', 'pending'] as const;
export const IN_FLIGHT = ['processing', 'awaiting_otp'] as const;
export const PAID = ['paid', 'completed'] as const;
export const NEEDS_ATTENTION = ['failed', 'blocked', 'reversed', 'needs_review'] as const;

/** Can this withdrawal still be approved or rejected? */
export const isAwaitingApproval = (status: string): boolean =>
  (AWAITING_APPROVAL as readonly string[]).includes(status);

/** Sum the counts for a status group out of a whole-table tally. */
export const countFor = (tally: StatusTally, statuses: readonly string[]): number =>
  statuses.reduce((sum, key) => sum + (tally[key]?.count ?? 0), 0);

/** Sum the amounts for a status group out of a whole-table tally. */
export const amountFor = (tally: StatusTally, statuses: readonly string[]): number =>
  statuses.reduce((sum, key) => sum + (tally[key]?.amount ?? 0), 0);

/** Every status in the tally, so "All" reflects the table and not the page. */
export const totalCount = (tally: StatusTally): number =>
  Object.values(tally).reduce((sum, t) => sum + (t.count ?? 0), 0);

export const totalAmount = (tally: StatusTally): number =>
  Object.values(tally).reduce((sum, t) => sum + (t.amount ?? 0), 0);

/**
 * The filter tabs. `key` is sent to the API verbatim, and it is built from the
 * same array the badge counts — so a tab cannot count one set and fetch
 * another. `all` sends no filter.
 */
export const WITHDRAWAL_FILTERS = [
  { key: 'all', label: 'All Requests', statuses: [] as readonly string[] },
  { key: AWAITING_APPROVAL.join(','), label: 'Awaiting Approval', statuses: AWAITING_APPROVAL },
  { key: IN_FLIGHT.join(','), label: 'Sending', statuses: IN_FLIGHT },
  { key: PAID.join(','), label: 'Paid', statuses: PAID },
  { key: NEEDS_ATTENTION.join(','), label: 'Needs Attention', statuses: NEEDS_ATTENTION },
] as const;

/** Parse the API's `counts` array into a tally, tolerating an older backend. */
export const parseCounts = (raw: unknown): StatusTally | null => {
  if (!Array.isArray(raw)) return null;
  const out: StatusTally = {};
  for (const row of raw) {
    const status = (row as { status?: unknown })?.status;
    if (typeof status !== 'string' || status === '') continue;
    out[status] = {
      count: Number((row as { count?: unknown }).count) || 0,
      amount: Number((row as { amount?: unknown }).amount) || 0,
    };
  }
  return out;
};
