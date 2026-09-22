import EditShippingProfileDialog from "@/features/addresses/EditShippingProfileDialog";

/** Intercepts a soft navigation to the edit route from the shipping-address
 *  list. A pasted URL or reload falls through to ../edit/page.tsx. */
export default function InterceptedEditAddress() {
  return <EditShippingProfileDialog />;
}
