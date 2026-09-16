import { useQuery } from "@tanstack/react-query";
import { Client } from "@/lib/client";
import { unwrap } from "@/lib/api/unwrap";

export interface BackendCategory {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  sub_categories: BackendSubCategory[];
}

export interface BackendSubCategory {
  id: string;
  name: string;
  description: string;
  category_id: string;
  created_at: string;
  updated_at: string;
}

interface UseCategoriesReturn {
  categories: BackendCategory[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Single source of truth for the product-category taxonomy (W2.5).
 *
 * Backed by TanStack Query under the shared `["categories"]` key, so this hook,
 * the Zustand `fetchCategory` action, and any other reader all dedupe to one
 * network request. Categories are near-static, so we keep them fresh for the
 * whole session (30 min) — no refetch on remount / route change on 3G.
 */
/**
 * Is this a real taxonomy id, or something that merely reads like one?
 *
 * The API validates `category_id` / `sub_category_id` as `uuid4` and resolves
 * them by primary key, so anything else is rejected — but it is rejected at the
 * very end, as a bare "category not found" on the Publish the seller has just
 * spent minutes earning. This is the same contract, checked before the request.
 *
 * It exists because the picker used to fabricate ids: an index from a hardcoded
 * list ("9"), a display name used in place of a missing id ("Auto Accessories"),
 * and two hardcoded fallback uuids that were migrated out of the database.
 */
export const isTaxonomyId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const useCategories = (): UseCategoriesReturn => {
  const query = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await Client<{ data?: BackendCategory[] }>({
        path: "/categories/get-all-categories",
        method: "GET",
      });
      return unwrap<BackendCategory[]>(response.data, []);
    },
    staleTime: 30 * 60_000,
  });

  return {
    categories: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? "Failed to load categories" : null,
    refetch: async () => {
      await query.refetch();
    },
  };
};
