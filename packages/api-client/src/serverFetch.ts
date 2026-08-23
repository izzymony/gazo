/**
 * Server-side fetch for SSR metadata (generateMetadata) — public, unauthenticated
 * reads only. Distinct from the client `Client` (which relies on js-cookie/axios);
 * this runs during server rendering where there is no browser cookie jar.
 *
 * Results are cached for 5 min via Next's fetch cache so repeated crawler/social
 * hits for the same product/store don't re-hit the backend.
 */
const getBaseURL = () =>
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8088/api/v1";

export async function serverFetch<T = unknown>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getBaseURL()}${path}`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
