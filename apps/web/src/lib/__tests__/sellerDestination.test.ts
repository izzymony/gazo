import {
  CREATE_STORE_PATH,
  DASHBOARD_PATH,
  SIGNUP_PATH,
  resolveSellerDestination,
} from "../sellerDestination";

describe("resolveSellerDestination", () => {
  it("sends a stranger to sign up", () => {
    expect(resolveSellerDestination(null, false)).toEqual({
      href: SIGNUP_PATH,
      isSignedIn: false,
      hasStore: false,
    });
  });

  it("sends a signed-in user with no store to create one", () => {
    // What GET /users/me returns for someone who signed up but never opened a
    // storefront: business is null, and that is expected rather than an error.
    expect(resolveSellerDestination({ id: "u1" }, true)).toEqual({
      href: CREATE_STORE_PATH,
      isSignedIn: true,
      hasStore: false,
    });
  });

  it("sends a store owner to the dashboard", () => {
    expect(
      resolveSellerDestination({ id: "u1", business: { id: "b1" } }, true)
    ).toEqual({ href: DASHBOARD_PATH, isSignedIn: true, hasStore: true });
  });

  it("treats a half-restored session as signed out", () => {
    // The store persists isAuthenticated to localStorage, so it can outlive the
    // cookie. Without a user object there is nothing to route on.
    expect(resolveSellerDestination(null, true).href).toBe(SIGNUP_PATH);
    expect(resolveSellerDestination({ id: "u1" }, false).href).toBe(SIGNUP_PATH);
  });

  it("ignores a business with no id", () => {
    expect(resolveSellerDestination({ id: "u1", business: {} }, true).href).toBe(
      CREATE_STORE_PATH
    );
  });
});
