/**
 * Shared interaction-state classes.
 *
 * Focus is a STATE, and it was previously copy-pasted into the two primitives
 * that happened to have it (Switch, InputField's toggle) and simply missing
 * from the rest — Button, IconButton, Checkbox, RadioGroup and Tabs had no
 * focus-visible indicator at all, and DropdownMenu killed the browser default
 * with `focus:outline-none` and replaced it with nothing, leaving keyboard
 * focus on a menu item invisible.
 *
 * One definition, applied by every interactive primitive.
 */

/** Ring drawn just outside the control. Default for buttons and toggles. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40 focus-visible:ring-offset-1";

/** Ring drawn inside the bounds — for full-bleed rows where an offset would clip. */
export const focusRingInset =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brandDeep/40";

/** The same ring driven by a sibling `peer` input (visually hidden controls). */
export const peerFocusRing =
  "peer-focus-visible:ring-2 peer-focus-visible:ring-brandDeep/40 peer-focus-visible:ring-offset-1";

/**
 * The tab-bar look, shared by `Tabs` and `NavigationTabs`.
 *
 * Those two are deliberately different patterns — one selects a panel
 * (role="tablist"), the other changes the URL (a <nav> of links) — and their
 * semantics must NOT be merged. Their appearance was duplicated as identical
 * class strings in both files, which is the part that should be shared.
 */
// The tab ROW itself. Stickiness lives on the wrapper in Tabs (which also holds
// the optional general/filter row) so the two travel as one block.
export const tabBar = "flex justify-between lg:justify-center bg-surface";

export const tabBarItem =
  "w-full lg:w-auto text-center py-2 md:py-3 px-4 md:px-6 lg:px-8 border-b-2 text-body md:text-body-lg transition-all";

export const tabBarItemActive = "border-outline-contrast text-foreground-primary font-medium";

export const tabBarItemIdle =
  "border-transparent text-foreground-disabled font-normal hover:text-foreground-secondary hover:border-outline-strong";

/**
 * The gap between a list's control row (a FilterBar) and the list itself.
 *
 * Every list screen is the same three parts — what pins above (a header, or a
 * header and a tab bar), a row of controls, then the list. The controls sat
 * flush under the tab bar on one screen and 24px below it on another, and the
 * gap under them was 16px in one place and 32px in another, because four pages
 * each decided it for themselves.
 *
 * 8px here PAIRS with the FilterBar's own `py-2`, for a 16px visual gap. Both
 * halves have to move together, so they are named together: `Tabs` applies this
 * to its panel, and a page without tabs applies it between the bar and its list.
 */
export const listContentGap = "mt-2";
export const listBlockGap = "space-y-2";
