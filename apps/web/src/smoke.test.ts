// Smoke test — proves the web Jest pipeline (next/jest transform, jest.setup.js
// with router/env mocks) actually runs. Replace/extend with real tests,
// especially around the checkout/order money paths.
describe('web test infrastructure', () => {
  it('runs jest', () => {
    expect(1 + 1).toBe(2)
  })
})
