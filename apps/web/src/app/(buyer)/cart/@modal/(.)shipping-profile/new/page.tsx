import NewShippingProfileScreen from "@/features/addresses/NewShippingProfileScreen";

/** Intercepts a soft navigation to /cart/shipping-profile/new from inside the
 *  cart section. */
export default function InterceptedNewShippingProfile() {
  return <NewShippingProfileScreen dialog />;
}
