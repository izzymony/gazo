// Feature flags, read from NEXT_PUBLIC_* env vars. Centralized so a cutover is a
// single-line change and the flag is trivial to grep + remove.
//
// ORDER_ON_SUCCESS: route checkout through the order-on-success flow — a single
// `/transactions/initiate-checkout` call that validates the order and defers its
// creation to charge.success (verify), instead of the legacy create-order-then-
// pay chain that leaves orphan orders on failed/abandoned payments. Off by
// default; enabled per-environment for rollout, then made the only path at
// cutover (Payment G).
export const ORDER_ON_SUCCESS =
  process.env.NEXT_PUBLIC_ORDER_ON_SUCCESS === "true";
