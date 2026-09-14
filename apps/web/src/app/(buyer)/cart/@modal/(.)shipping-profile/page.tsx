import ShippingProfileScreen from "@/features/addresses/ShippingProfileScreen";

/** Intercepts a soft navigation to /cart/shipping-profile from inside the cart
 *  section — today, the Complete Order review screen. */
export default function InterceptedShippingProfile() {
  return <ShippingProfileScreen dialog />;
}
