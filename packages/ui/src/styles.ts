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
export const tabBar = "flex justify-between lg:justify-center sticky top-0 z-sticky bg-surface";

export const tabBarItem =
  "w-full lg:w-auto text-center py-2 md:py-3 px-4 md:px-6 lg:px-8 border-b-2 text-body md:text-body-lg transition-all";

export const tabBarItemActive = "border-outline-contrast text-foreground-primary font-medium";

export const tabBarItemIdle =
  "border-transparent text-foreground-disabled font-normal hover:text-foreground-secondary hover:border-outline-strong";
