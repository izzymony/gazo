/**
 * The slot renders nothing unless a navigation has been intercepted into it.
 *
 * Required, not optional: without a `default.tsx` a hard navigation to any route
 * under settings 404s, because Next cannot work out what an unmatched parallel
 * slot should render and refuses to guess.
 */
export default function ModalSlotDefault() {
  return null;
}
