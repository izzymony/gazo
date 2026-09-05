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
