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

export interface Paginated<T> {
  items: T[];
  page: number;
  total: number;
  totalPages: number;
}

/**
 * Like `unwrap`, but also surfaces the sibling pagination metadata the list
 * envelope carries — `{ data: { data: T[] }, page, total, totalPages }` — which
 * plain `unwrap` drops. Pass the axios body (`response.data`). Missing metadata
 * degrades to page 1 / totalPages 1 so callers can treat it as a single page.
 */
export function unwrapPaginated<T>(body: unknown): Paginated<T> {
  const items = unwrap<T[]>(body, []);
  const list = Array.isArray(items) ? items : [];
  const b = (body ?? {}) as Record<string, unknown>;
  const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
  return {
    items: list,
    page: num(b.page, 1),
    total: num(b.total, list.length),
    totalPages: num(b.totalPages, 1),
  };
}
