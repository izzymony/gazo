/**
 * The settings segment gains a parallel `@modal` slot so that a navigation to a
 * subordinate form from inside settings can be INTERCEPTED and rendered as a
 * dialog over the list, while the same URL still resolves to a full page when it
 * is pasted, reloaded or shared.
 *
 * `{children}` stays first. The slot renders a `fixed` overlay, so document order
 * decides only the tab order, and a dialog announced after the page it covers is
 * the wrong way round — but `useModalBehaviour` moves focus into the panel and
 * traps it there on mount, which settles order at the point it matters.
 *
 * The slot is rendered INSIDE the dashboard frame, which is deliberate and is
 * what lets a dialog panel centre in the content area instead of under the rail:
 * `--shell-inset` inherits down the DOM, and a portal to `document.body` would
 * sit outside the frame that declares it. See ResponsiveRouteDialog.
 */
export default function SettingsLayout({
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
