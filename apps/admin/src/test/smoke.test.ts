// Smoke test — proves the admin Jest pipeline (config, SWC transform, setup)
// actually runs. Replace/extend with real component + data-layer tests.
describe('admin test infrastructure', () => {
  it('runs jest', () => {
    expect(1 + 1).toBe(2)
  })
})
