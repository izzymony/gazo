import AddCardDialog from "@/features/billing/AddCardDialog";

/** Intercepts a soft navigation to the add-card route from inside billing. A
 *  pasted URL or reload falls through to ../add-card/page.tsx. */
export default function InterceptedAddCard() {
  return <AddCardDialog />;
}
