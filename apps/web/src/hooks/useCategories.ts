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
