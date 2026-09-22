/**
 * Dialog family 3's slot. See (seller)/dashboard/settings/layout.tsx for the
 * convention and why the slot is a sibling of `children`.
 *
 * The chrome across this pair DIFFERS — /dashboard/settings/billing is
 * `desktop-only` and /dashboard/settings/billing/add-card is `none` — so this
 * family depends on the dashboard layout reading the `children` slot's segments
 * rather than the URL. Without that, opening the dialog would take the rail off
 * the billing page behind it.
 */
export default function BillingLayout({
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
