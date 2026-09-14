import AddPayoutAccountDialog from "@/features/payouts/AddPayoutAccountDialog";

/** Intercepts a soft navigation to the add-account route from inside payouts.
 *  A pasted URL or reload falls through to ../addaccount/page.tsx. */
export default function InterceptedAddAccount() {
  return <AddPayoutAccountDialog />;
}
