import type { User } from "@vibaar/types";

/**
 * Where a "start selling" control should actually send someone.
 *
 * There are three answers, not two. `GET /users/me` returns `{ user, business }`
 * and `business` is null for anyone who has signed up but never created a
 * store — an expected state, not an error — so "signed in" and "has somewhere
 * to land" are different questions. Sending a signed-in user with no store to
 * /dashboard lands them on an empty shell; sending a store owner to /signup is
 * worse than useless, because both auth screens clear the session on mount and
 * would sign them out on arrival.
 *
 * This is deliberately a pure function of (user, isAuthenticated) rather than a
 * hook: the post-auth welcome screen has made the same decision inline since
 * before the marketing site existed, and two copies of a branch like this drift.
 * One place decides; the callers only choose how to navigate.
 */

/** Signed out. The account does not exist yet. */
export const SIGNUP_PATH = "/signup";
/** Signed in, no storefront. `/dashboard` would be an empty room. */
export const CREATE_STORE_PATH = "/dashboard/storefront/create?step=1";
/** Signed in, storefront exists. */
export const DASHBOARD_PATH = "/dashboard";

export type SellerDestination = {
  /** Where the control points. */
  readonly href: string;
  /** Past the sign-up gate. Drives the label and hides "Log in". */
  readonly isSignedIn: boolean;
  /** Has a storefront to open. */
  readonly hasStore: boolean;
};

export function resolveSellerDestination(
  user: User | null | undefined,
  isAuthenticated: boolean
): SellerDestination {
  // Both halves matter. The store keeps `isAuthenticated` in localStorage, so
  // it can outlive the cookie that actually authorises anything; requiring a
  // user object too means a half-restored session reads as signed out, which
  // is the safe way to be wrong.
  const isSignedIn = Boolean(isAuthenticated && user);

  if (!isSignedIn) {
    return { href: SIGNUP_PATH, isSignedIn: false, hasStore: false };
  }

  const hasStore = Boolean(user?.business?.id);

  return {
    href: hasStore ? DASHBOARD_PATH : CREATE_STORE_PATH,
    isSignedIn: true,
    hasStore,
  };
}
