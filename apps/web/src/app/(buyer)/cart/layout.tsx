/**
 * Dialog family 5's slot.
 *
 * At the `cart` segment, not the `(buyer)` group root. The root was tried first,
 * because checkout's address forms are reached from four places and only the
 * group root is an ancestor of all of them — and Next's router crashed on it:
 * a soft navigation to the intercepted route threw a setState-during-render
 * inside `<Router>` and never navigated. The segment-level slot is the same
 * shape every other family uses and behaves.
 *
 * The consequence is recorded rather than hidden: navigations that START inside
 * /cart are intercepted, and the two that start outside it — an order detail and
 * the profile's shipping list — fall through to the canonical page. Both are
 * cross-section navigations, where a full page is the honest presentation
 * anyway; the dialog is for staying where you are.
 *
 * This pair's chrome DIFFERS — /cart carries a rail and a bar,
 * /cart/shipping-profile is `NO_NAV` — so it depends on BuyerShell reading the
 * `children` slot's segments rather than the URL.
 */
export default function CartLayout({
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
