import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

import { API_VERSION, apiBase, apiOrigin } from '@/lib/apiUrl'

/**
 * The defect this pins.
 *
 * `config.ts` read `NEXT_PUBLIC_API_URL` and appended `/api/v1` itself, while
 * `api-client.ts` read `NEXT_PUBLIC_API_BASE_URL` and expected it to arrive
 * versioned. Nothing in either NAME says which contract it carries, and
 * `docs/ENV-PREFLIGHT.md` told operators to set them to the same value — so
 * staging got the versioned value in both and admin login posted to
 * `/api/v1/api/v1/admin/auth/login`, which 404s.
 *
 * The mirror-image mistake is just as easy and quieter: put a bare origin in
 * the versioned variable and every admin request loses its prefix.
 *
 * Documentation alone cannot prevent either — both values are typed into a
 * Cloudflare dashboard field by hand. So both readers normalise, and this
 * asserts the normalisation over every shape an operator might enter.
 */
describe('API URL contract', () => {
  const origin = 'https://api-staging.vibaar.com'

  describe('accepts either form and versions it exactly once', () => {
    const inputs = [
      ['bare origin (the documented NEXT_PUBLIC_API_URL)', origin],
      ['bare origin with a trailing slash', `${origin}/`],
      ['already versioned (the documented NEXT_PUBLIC_API_BASE_URL)', `${origin}/api/v1`],
      ['already versioned with a trailing slash', `${origin}/api/v1/`],
      ['whitespace around the value', `  ${origin}  `],
      ['a different version number', `${origin}/api/v2`],
      ['uppercase path', `${origin}/API/V1`],
    ] as const

    for (const [label, value] of inputs) {
      it(label, () => {
        expect(apiBase(value)).toBe(`${origin}/api/${API_VERSION}`)
        expect(apiOrigin(value)).toBe(origin)
      })
    }
  })

  describe('the doubled prefix cannot be produced', () => {
    const shapes = [
      origin,
      `${origin}/`,
      `${origin}/api/v1`,
      `${origin}/api/v1/`,
      `${origin}/api/v1/api/v1`,
      'http://localhost:8088',
      'http://localhost:8088/api/v1',
    ]

    for (const value of shapes) {
      it(`never yields /api/v1/api/v1 for ${value}`, () => {
        const base = apiBase(value)
        expect(base).not.toMatch(/\/api\/v\d+\/api\/v\d+/)
        // exactly one version segment
        expect(base.match(/\/api\/v\d+/g)).toHaveLength(1)
      })
    }
  })

  describe('the two readers agree', () => {
    it('derives the same base from either variable, however it is written', () => {
      // NEXT_PUBLIC_API_URL is documented bare; NEXT_PUBLIC_API_BASE_URL
      // documented versioned. Both must land on the same request base, or the
      // login screen and the data layer talk to different URLs — which is
      // exactly what happened.
      const fromApiUrl = apiBase(origin)
      const fromApiBaseUrl = apiBase(`${origin}/api/v1`)
      expect(fromApiUrl).toBe(fromApiBaseUrl)
    })

    it('and still agrees if an operator swaps the two values', () => {
      expect(apiBase(`${origin}/api/v1`)).toBe(apiBase(origin))
    })
  })

  describe('empty and missing values fall back rather than building a broken URL', () => {
    it.each([undefined, '', '   '])('%p falls back to localhost', (value) => {
      expect(apiBase(value as string | undefined)).toBe(`http://localhost:8088/api/${API_VERSION}`)
    })

    it('never emits the literal string "undefined" in a URL', () => {
      expect(apiBase(undefined)).not.toContain('undefined')
      expect(apiOrigin(undefined)).not.toContain('undefined')
    })
  })
})

/**
 * The live wiring, not just the helper. A future edit could reintroduce a
 * hand-rolled `${BASE_URL}/api/v1` and these would catch it.
 */
describe('the admin config uses the contract', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_API_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = ORIGINAL
    jest.resetModules()
  })

  it('versions API_URL exactly once when given a bare origin', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api-staging.vibaar.com'
    jest.resetModules()
    const { API_CONFIG } = await import('@/lib/config')
    expect(API_CONFIG.API_URL).toBe('https://api-staging.vibaar.com/api/v1')
    expect(API_CONFIG.BASE_URL).toBe('https://api-staging.vibaar.com')
  })

  it('does NOT double the prefix when given an already-versioned value', async () => {
    // The staging misconfiguration, verbatim.
    process.env.NEXT_PUBLIC_API_URL = 'https://api-staging.vibaar.com/api/v1'
    jest.resetModules()
    const { API_CONFIG } = await import('@/lib/config')
    expect(API_CONFIG.API_URL).toBe('https://api-staging.vibaar.com/api/v1')
    expect(API_CONFIG.API_URL).not.toContain('/api/v1/api/v1')
  })

  it('builds the documented admin login URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api-staging.vibaar.com'
    jest.resetModules()
    const { API_CONFIG } = await import('@/lib/config')
    expect(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.ADMIN_LOGIN}`).toBe(
      'https://api-staging.vibaar.com/api/v1/admin/auth/login'
    )
  })
})

/**
 * The documentation was the vector, so it is checked too.
 *
 * `docs/ENV-PREFLIGHT.md` told operators to set both admin API vars to "the
 * same value". Following that instruction is what produced
 * `/api/v1/api/v1/admin/auth/login` on staging. Normalising the readers stops
 * the breakage; this stops the wrong instruction coming back, which is the
 * part a runtime guard can never cover.
 */
describe('the staging runbook documents the contract correctly', () => {
  const doc = resolve(__dirname, '../../../../docs/CLOUDFLARE-STAGING.md')

  const readAdminBlock = () => {
    expect(existsSync(doc)).toBe(true)
    const text = readFileSync(doc, 'utf8')
    const start = text.indexOf('### `apps/admin`')
    expect(start).toBeGreaterThan(-1)
    return text.slice(start, start + 1400)
  }

  const valueOf = (block: string, key: string) => {
    const m = block.match(new RegExp(`^${key}=(\\S+)`, 'm'))
    expect(m).not.toBeNull()
    return m![1]
  }

  it('documents NEXT_PUBLIC_API_URL as a BARE origin', () => {
    const value = valueOf(readAdminBlock(), 'NEXT_PUBLIC_API_URL')
    expect(value).not.toMatch(/\/api\/v\d+/)
    expect(apiBase(value)).toBe(`${value}/api/${API_VERSION}`)
  })

  it('documents NEXT_PUBLIC_API_BASE_URL as VERSIONED', () => {
    const value = valueOf(readAdminBlock(), 'NEXT_PUBLIC_API_BASE_URL')
    expect(value).toMatch(/\/api\/v\d+$/)
  })

  it('the two documented values resolve to the same request base', () => {
    const block = readAdminBlock()
    expect(apiBase(valueOf(block, 'NEXT_PUBLIC_API_URL'))).toBe(
      apiBase(valueOf(block, 'NEXT_PUBLIC_API_BASE_URL'))
    )
  })

  it('no documented admin VALUE contains a doubled version prefix', () => {
    // Assignment lines only. The surrounding prose deliberately quotes
    // "/api/v1/api/v1" to explain the bug, and matching that would make the
    // explanation un-writable.
    const offenders = readAdminBlock()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^NEXT_PUBLIC_[A-Z_]+=/.test(line))
      .filter((line) => /\/api\/v\d+\/api\/v\d+/.test(line.split('=')[1] ?? ''))
    expect(offenders).toEqual([])
  })
})
