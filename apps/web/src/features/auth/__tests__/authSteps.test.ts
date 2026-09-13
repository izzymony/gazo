import { resolveAuthStep, isAuthLanding } from "../authSteps";

/**
 * The whole point of this module is that `step > 0` is the WRONG predicate.
 *
 * Every controller reads `Number(searchParams.get("step"))` without a guard, so
 * `?step=abc` is NaN and `?step=7` is 7, and both used to fall through to the
 * "not zero" branch — a header, a progress bar and a live submit button over an
 * empty column. Those URLs are live right now. Letting them into the two-pane
 * split would hand a broken route a desktop media panel and make it look
 * finished, so they have to resolve to `null`.
 */
describe("resolveAuthStep", () => {
  describe("signin", () => {
    it("admits only the two steps it can render", () => {
      expect(resolveAuthStep("signin", 0)).toBe(0);
      expect(resolveAuthStep("signin", 1)).toBe(1);
    });

    it("rejects the blank states reachable by URL today", () => {
      // /signin?step=2 renders header + progress + CTA over nothing.
      expect(resolveAuthStep("signin", 2)).toBeNull();
      expect(resolveAuthStep("signin", 7)).toBeNull();
    });
  });

  describe("signup, whose ladder changes shape with the OTP flag", () => {
    it("ends at 3 when OTP is disabled — which is how it ships today", () => {
      for (const step of [0, 1, 2, 3]) {
        expect(resolveAuthStep("signup", step, { isOtpEnabled: false })).toBe(step);
      }
      // With OTP off, 2 is the password screen and 3 is the profile screen, so
      // there is no fourth screen for step 4 to render.
      expect(resolveAuthStep("signup", 4, { isOtpEnabled: false })).toBeNull();
    });

    it("ends at 4 when OTP is enabled, because every later step shifts up one", () => {
      expect(resolveAuthStep("signup", 4, { isOtpEnabled: true })).toBe(4);
      expect(resolveAuthStep("signup", 5, { isOtpEnabled: true })).toBeNull();
    });

    it("defaults to the shipping configuration when the flag is not passed", () => {
      expect(resolveAuthStep("signup", 4)).toBeNull();
    });
  });

  describe("forgot-password", () => {
    it("has no landing state — `?step` is required", () => {
      // Bare /forgot-password renders an empty column today: its Formik reads
      // `validationSchema[step - 1]`, i.e. index -1.
      expect(resolveAuthStep("forgot-password", 0)).toBeNull();
      expect(resolveAuthStep("forgot-password", 1)).toBe(1);
      expect(resolveAuthStep("forgot-password", 3)).toBe(3);
      expect(resolveAuthStep("forgot-password", 4)).toBeNull();
    });
  });

  describe("values the URL can actually produce", () => {
    it("rejects NaN, which is what `Number('abc')` gives every controller", () => {
      expect(resolveAuthStep("signin", Number("abc"))).toBeNull();
      expect(resolveAuthStep("signup", NaN)).toBeNull();
      expect(resolveAuthStep("forgot-password", NaN)).toBeNull();
    });

    it("rejects negatives and fractions rather than coercing them", () => {
      expect(resolveAuthStep("signin", -1)).toBeNull();
      expect(resolveAuthStep("signup", 1.5)).toBeNull();
    });
  });

  it("identifies the landing, the only state that shows artwork on mobile", () => {
    expect(isAuthLanding(0)).toBe(true);
    expect(isAuthLanding(1)).toBe(false);
    expect(isAuthLanding(null)).toBe(false);
  });
});
