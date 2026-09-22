import NewShippingProfileScreen from "@/features/addresses/NewShippingProfileScreen";

/**
 * "Add new shipping profile" on the profile's address list goes to
 * /cart/shipping-profile/new?from=profile — a CROSS-SEGMENT navigation, which is
 * why editing opened as a dialog and adding did not: the cart's own slot never
 * sees a navigation that starts in /profile.
 *
 * `(...)` matches from the app root, so this slot can intercept a route that
 * lives in another segment entirely. Same screen, same `?from=profile` branch
 * deciding where a save returns to.
 */
export default function InterceptedAddFromProfile() {
  return <NewShippingProfileScreen dialog />;
}
