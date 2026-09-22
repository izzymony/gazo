/**
 * Which auth steps actually render something.
 *
 * `step` comes from the URL through `Number(searchParams.get("step"))`, which
 * is unguarded in every controller: `?step=abc` is `NaN`, `?step=7` is 7, and
 * both fall through to the "not zero" branch. Today that renders a header, a
 * progress bar and a live submit button over a completely empty column —
 * reachable right now at `/signin?step=2`, `/signup?step=4` (with OTP off),
 * `/forgot-password` with no parameter, and any non-numeric step.
 *
 * Those are routing bugs, not layout ones, and fixing them is a separate piece
 * of work. What matters here is that the two-pane split must NOT adopt them:
 * wrapping an empty column in a desktop media panel would dress a broken URL up
 * as a finished screen. So a step has to be on this list to get the new shell;
 * anything else keeps exactly the markup it renders today.
 *
 * `null` therefore means "not a state this migration audited" — not "invalid".
 */

/** The steps `SignInOverview` can actually render. */
const SIGNIN_STEPS = [0, 1] as const;

/**
 * The steps `SignUpOverview` can actually render.
 *
 * The ladder changes shape with the OTP feature flag, and not by simply
 * inserting a step: with OTP off, step 2 is the password screen and step 3 is
 * the profile screen, so step 4 renders nothing at all. With it on, 2 is the
 * OTP screen and everything after shifts up one.
 */
const signupSteps = (isOtpEnabled: boolean): readonly number[] =>
  isOtpEnabled ? [0, 1, 2, 3, 4] : [0, 1, 2, 3];

/** The steps `ForgotPassword` can render. It has no step 0 — `?step` is required. */
const FORGOT_STEPS = [1, 2, 3] as const;

export type AuthFlow = "signin" | "signup" | "forgot-password";

export interface AuthStepContext {
  /** Only signup's ladder depends on it; the others ignore it. */
  isOtpEnabled?: boolean;
}

/**
 * The step to render, or `null` when the URL names one this flow cannot show.
 *
 * Deliberately NOT `step > 0`. That predicate is true for every broken URL
 * above, which is how a layout change would silently have become a change to
 * states nobody audited.
 */
export function resolveAuthStep(
  flow: AuthFlow,
  step: number,
  { isOtpEnabled = false }: AuthStepContext = {}
): number | null {
  if (!Number.isInteger(step)) return null;

  const allowed: readonly number[] =
    flow === "signin"
      ? SIGNIN_STEPS
      : flow === "signup"
        ? signupSteps(isOtpEnabled)
        : FORGOT_STEPS;

  return allowed.includes(step) ? step : null;
}

/** The landing state — the only one that shows its artwork on mobile too. */
export const isAuthLanding = (step: number | null) => step === 0;
