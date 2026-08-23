/**
 * Unwrap the Go API's response envelope to the actual payload (W2.6).
 *
 * The backend uses a few envelope shapes; the two dominant ones are:
 *   lists / details : { data: { message, data: T }, page, total, totalPages }
 *   simpler handlers: { data: T }
 *
 * `unwrap(response.data, fallback)` returns T from whichever is present, or the
 * fallback when the body is missing/misshaped — so envelope drift degrades to a
 * safe default in ONE place instead of throwing scattered `undefined` errors
 * across components (the exact class of bug the audit flagged repeatedly).
 *
 * Pass the axios body (`response.data`). Payload objects must not themselves
 * carry a top-level `data` key (none of our domain types do).
 */
export function unwrap<T>(body: unknown, fallback: T): T {
  if (body == null || typeof body !== "object") return fallback;

  const inner = (body as { data?: unknown }).data;
  if (inner == null) return fallback;

  // { data: { data: T } } — the canonical double-nested envelope
  if (typeof inner === "object" && "data" in inner) {
    const payload = (inner as { data?: unknown }).data;
    return (payload ?? fallback) as T;
  }

  // { data: T }
  return (inner as T) ?? fallback;
}
