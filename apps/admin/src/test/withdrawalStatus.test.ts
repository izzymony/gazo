import { readFileSync } from 'fs'
import { resolve } from 'path'

import {
  AWAITING_APPROVAL,
  IN_FLIGHT,
  NEEDS_ATTENTION,
  PAID,
  WITHDRAWAL_FILTERS,
  amountFor,
  countFor,
  isAwaitingApproval,
  parseCounts,
  totalAmount,
  totalCount,
  type StatusTally,
} from '@/lib/withdrawalStatus'

/**
 * Both defects these cover were invisible to type-checking and to the eye.
 *
 * 1. Approve and Reject were gated on the literal status `'pending'`. Migration
 *    015 renamed that state to `requested`, so both actions were permanently
 *    disabled for every real withdrawal while the backend happily accepted
 *    them. Approve was fixed earlier; Reject was missed, which is exactly the
 *    kind of thing one shared predicate prevents.
 * 2. The filter badges counted the rows the page had just fetched — 20 of them
 *    — so they were wrong past page one, and with a filter active every other
 *    tab counted rows no longer in the response and read 0. The "needs
 *    attention" tab additionally counted four states while filtering on one.
 */
describe('withdrawal actions are gated on the state, not a spelling', () => {
  it('allows approve/reject for the current name', () => {
    expect(isAwaitingApproval('requested')).toBe(true)
  })

  it('still allows them for the pre-migration name', () => {
    // A backend whose migration has not run stores `pending`. Dropping this
    // would make the admin unusable during a deploy window.
    expect(isAwaitingApproval('pending')).toBe(true)
  })

  it.each([
    'processing',
    'awaiting_otp',
    'paid',
    'completed',
    'failed',
    'blocked',
    'reversed',
    'rejected',
    'needs_review',
    '',
    'REQUESTED',
  ])('refuses %p', (status) => {
    expect(isAwaitingApproval(status)).toBe(false)
  })
})

/**
 * The page is the thing that got this wrong, so the page is what is checked.
 * A literal status comparison in an action gate is the regression; a unit test
 * of the predicate cannot see it, because the bug was not calling the
 * predicate at all.
 */
describe('the financial page never gates an action on a literal status', () => {
  const source = readFileSync(resolve(__dirname, '../app/financial/page.tsx'), 'utf8')

  it('compares no status against a hardcoded string', () => {
    const offenders = source
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => /status\s*[!=]==\s*['"][a-z_]+['"]/.test(line))
    expect(offenders).toEqual([])
  })

  it('gates both Approve and Reject through isAwaitingApproval', () => {
    const gates = source.match(/isAwaitingApproval\(withdrawal\.status\)/g) ?? []
    // Two per button — the className and the `disabled` prop — for two buttons.
    expect(gates.length).toBeGreaterThanOrEqual(4)
  })

  it('counts from the server tally, not from the fetched page', () => {
    expect(source).not.toMatch(/withdrawals\.filter\(\s*w\s*=>\s*w\.status/)
    expect(source).not.toMatch(/withdrawals\.reduce/)
  })
})

describe('filter tabs count exactly what they fetch', () => {
  it('every tab key is built from the statuses its badge counts', () => {
    for (const filter of WITHDRAWAL_FILTERS) {
      if (filter.statuses.length === 0) {
        expect(filter.key).toBe('all')
        continue
      }
      expect(filter.key).toBe(filter.statuses.join(','))
    }
  })

  it('the needs-attention tab fetches all four states it counts', () => {
    const tab = WITHDRAWAL_FILTERS.find((f) => f.label === 'Needs Attention')!
    expect(tab.key.split(',').sort()).toEqual(
      ['blocked', 'failed', 'needs_review', 'reversed'].sort()
    )
    expect(tab.statuses).toEqual(NEEDS_ATTENTION)
  })

  it('no status appears in two groups, or a row would be counted twice', () => {
    const all = [...AWAITING_APPROVAL, ...IN_FLIGHT, ...PAID, ...NEEDS_ATTENTION]
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('counts are whole-table, not page-scoped', () => {
  // What the API returns for a table with far more rows than one page.
  const tally: StatusTally = {
    requested: { count: 37, amount: 3_700_000 },
    pending: { count: 3, amount: 300_000 },
    processing: { count: 12, amount: 1_200_000 },
    awaiting_otp: { count: 1, amount: 50_000 },
    paid: { count: 148, amount: 14_800_000 },
    completed: { count: 9, amount: 900_000 },
    failed: { count: 4, amount: 400_000 },
    needs_review: { count: 2, amount: 200_000 },
  }

  it('sums a group across both its spellings', () => {
    expect(countFor(tally, AWAITING_APPROVAL)).toBe(40)
    expect(countFor(tally, PAID)).toBe(157)
    expect(countFor(tally, IN_FLIGHT)).toBe(13)
    expect(countFor(tally, NEEDS_ATTENTION)).toBe(6)
  })

  it('reports a total far larger than one page of 20', () => {
    expect(totalCount(tally)).toBe(216)
    // The old code would have reported at most the page size.
    expect(totalCount(tally)).toBeGreaterThan(20)
  })

  it('sums money per group for the metric cards', () => {
    expect(amountFor(tally, AWAITING_APPROVAL)).toBe(4_000_000)
    expect(totalAmount(tally)).toBe(21_550_000)
  })

  it('treats an absent status as zero rather than NaN', () => {
    expect(countFor({}, AWAITING_APPROVAL)).toBe(0)
    expect(amountFor({}, NEEDS_ATTENTION)).toBe(0)
    expect(totalCount({})).toBe(0)
    expect(Number.isNaN(amountFor({ requested: {} as never }, AWAITING_APPROVAL))).toBe(false)
  })
})

describe('parseCounts tolerates what the API might send', () => {
  it('parses the documented shape', () => {
    expect(
      parseCounts([
        { status: 'requested', count: 2, amount: 1500 },
        { status: 'paid', count: 5, amount: 9000 },
      ])
    ).toEqual({
      requested: { count: 2, amount: 1500 },
      paid: { count: 5, amount: 9000 },
    })
  })

  it('coerces string numbers, which is how some drivers render numeric', () => {
    expect(parseCounts([{ status: 'paid', count: '5', amount: '12.50' }])).toEqual({
      paid: { count: 5, amount: 12.5 },
    })
  })

  it('returns null when the field is absent, so an older backend shows no badges rather than wrong ones', () => {
    expect(parseCounts(undefined)).toBeNull()
    expect(parseCounts(null)).toBeNull()
    expect(parseCounts({})).toBeNull()
  })

  it('skips malformed rows instead of inventing a status', () => {
    expect(parseCounts([{ count: 3 }, { status: '', count: 1 }, { status: 'paid', count: 1 }])).toEqual({
      paid: { count: 1, amount: 0 },
    })
  })
})
