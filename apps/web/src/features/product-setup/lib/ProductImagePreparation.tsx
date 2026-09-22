"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Is any product image being prepared right now, anywhere under this provider?
 *
 * The publish/update action has to wait for image preparation, but the pickers
 * that do the preparing are not siblings of the action — the variant image
 * picker sits four components down inside the variants editor. Passing a
 * `preparing` flag up through each of them would thread a prop through files
 * that have nothing else to do with images, and would silently miss the next
 * picker someone adds.
 *
 * So it is a count, not a boolean: two pickers can be busy at once (the product
 * gallery and a variant thumbnail), and the action stays disabled until BOTH
 * finish. A boolean would let the first one to finish re-enable it.
 */
interface PreparationTracker {
  preparing: boolean;
  begin: () => void;
  end: () => void;
}

const ProductImagePreparationContext = createContext<PreparationTracker | null>(null);

export function ProductImagePreparationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);

  const begin = useCallback(() => setActive((n) => n + 1), []);
  // Floor at zero: a double-`end` from a component unmounting mid-prepare must
  // not drive the count negative and leave the action disabled forever.
  const end = useCallback(() => setActive((n) => Math.max(0, n - 1)), []);

  const value = useMemo<PreparationTracker>(
    () => ({ preparing: active > 0, begin, end }),
    [active, begin, end]
  );

  return (
    <ProductImagePreparationContext.Provider value={value}>
      {children}
    </ProductImagePreparationContext.Provider>
  );
}

/** For the commit action. `false` when there is no provider, so nothing blocks. */
export function useIsPreparingProductImages(): boolean {
  return useContext(ProductImagePreparationContext)?.preparing ?? false;
}

/** For the pickers. Returns no-ops outside a provider, so a picker still works. */
export function useProductImagePreparationTracker(): Pick<PreparationTracker, "begin" | "end"> {
  const ctx = useContext(ProductImagePreparationContext);
  const noop = useMemo(() => ({ begin: () => {}, end: () => {} }), []);
  return ctx ?? noop;
}
