/**
 * Dialog family 6's slot. Both routes carry the same buyer nav policy
 * (`RAIL_ONLY`), so the intercepted URL resolves the chrome the list already
 * had and no shell change is needed here — unlike the seller families, whose
 * parent and child policies differ.
 */
export default function ShippingAddressLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
