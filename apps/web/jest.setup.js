// ============================================
// VIBAAR WEB - JEST SETUP
// ============================================

import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:8088/api/v1'
process.env.NEXT_PUBLIC_PAYSTACK_KEY = 'pk_test_mock'
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'mock_api_key'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next.js Image component.
// next/image's own props are not DOM attributes, so they are dropped rather
// than spread: passing `fill`/`priority` through makes React warn about a
// non-boolean attribute on every test that renders a filled image.
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill, priority, loader, quality, placeholder, blurDataURL, unoptimized, ...props }) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Suppress console errors in tests (optional)
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})
// jsdom ships no ResizeObserver, and components that measure their own layout
// need one — VendorCard watches its product rail to know when it has scrolled
// to the end. A no-op stub is right for jsdom: nothing there has a size to
// observe, so the callback would never fire anyway. The behaviour that DOES
// matter (the initial measurement) runs synchronously in the effect.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
