/**
 * The buyer half of dialog family 4 — the same slot, the same interception and
 * the same `ChangePasswordDialog` the seller route uses. One component, two
 * routes; see (seller)/dashboard/settings/layout.tsx for why the slot is a
 * sibling of `children` and not a portal.
 *
 * Unlike the seller side this needs no chrome fix: /profile/settings and
 * /profile/settings/change-password carry the SAME buyer nav policy
 * (`RAIL_ONLY`), so the intercepted URL resolves the chrome the page underneath
 * already had. The seller pair differ, which is what made the rail vanish there.
 */
export default function BuyerSettingsLayout({
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
