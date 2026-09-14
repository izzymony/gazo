/**
 * Dialog family 2's slot. See (seller)/dashboard/settings/layout.tsx for the
 * convention.
 *
 * This pair's chrome DIFFERS — /dashboard/payouts is `desktop-only` and
 * /dashboard/payouts/addaccount is `none` — so it depends on the dashboard
 * layout reading the `children` slot's segments rather than the URL. Without
 * that, opening the dialog would take the rail off the payouts list behind it.
 */
export default function PayoutsLayout({
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
