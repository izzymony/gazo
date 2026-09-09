"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { User } from "@vibaar/types";
import {
  resolveSellerDestination,
  type SellerDestination,
} from "@/lib/sellerDestination";

/**
 * Auth state, read in a way that is safe on a statically prerendered page.
 *
 * `/` is built once and served to everyone (`○` in the build output), which is
 * why it is fast and why it cannot know who is asking. Reading the auth store
 * directly during render would not just be wrong, it would break: the store
 * persists `user` and `isAuthenticated` to localStorage and zustand rehydrates
 * synchronously, so a signed-in visitor's first client render would disagree
 * with the prerendered HTML and React would report a hydration mismatch.
 *
 * `useSyncExternalStore` is the fix that does not need a mounted flag. React
 * uses `getServerSnapshot` for the prerender *and* for the hydration pass, so
 * the first client render matches the HTML by construction; only afterwards
 * does it switch to the live snapshot and re-render. Signed out is the honest
 * default — it is what the cached HTML says, and it is what almost every
 * visitor to a marketing page actually is.
 */

export type AuthSnapshot = {
  readonly isAuthenticated: boolean;
  readonly user: User | null;
};

const SIGNED_OUT: AuthSnapshot = { isAuthenticated: false, user: null };

/*
 * The store is reached through a dynamic import rather than a static one.
 *
 * It is the app's data layer — axios, the API client, the persist middleware,
 * every auth action — and importing it from the marketing header put all of
 * that in the first load of the three pages that header serves: measured at
 * +43 kB on / and /about, on a page whose audience is 85% mobile and often on
 * 3G. Nothing here needs it before paint. The page is static HTML that reads
 * correctly with no JavaScript at all, and the only thing the store changes is
 * which of two labels a single button carries.
 *
 * Deferring costs nothing in practice: the root layout already imports the
 * store eagerly to restore the session, so by the time this resolves the chunk
 * is normally in flight or done. Until then the snapshot is signed out, which
 * is what the prerendered HTML says anyway — so this is the same one-frame
 * swap the design already accepts, not a new state.
 */
type AuthStore = typeof import("@/store/authStore").default;

let store: AuthStore | null = null;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

function loadStore() {
  if (store || pending) return;
  pending = import("@/store/authStore")
    .then((module) => {
      store = module.default;
      // One subscription for every consumer of this hook, forwarded to React.
      store.subscribe(notify);
      notify(); // the first real value, replacing the signed-out placeholder
    })
    .catch(() => {
      // Signed out is the safe answer, and it is already what we are showing.
      pending = null;
    });
}

const subscribe = (onStoreChange: () => void) => {
  listeners.add(onStoreChange);
  loadStore();
  return () => {
    listeners.delete(onStoreChange);
  };
};

/*
 * The snapshot must keep its identity while the values are unchanged, or
 * useSyncExternalStore re-renders forever. The store's own state object is
 * stable between updates, so caching on the two fields we read is enough.
 */
let cached: AuthSnapshot = SIGNED_OUT;

const getSnapshot = (): AuthSnapshot => {
  if (!store) return SIGNED_OUT;
  const { isAuthenticated, user } = store.getState();
  if (
    cached.isAuthenticated !== Boolean(isAuthenticated) ||
    cached.user !== (user ?? null)
  ) {
    cached = { isAuthenticated: Boolean(isAuthenticated), user: user ?? null };
  }
  return cached;
};

const getServerSnapshot = (): AuthSnapshot => SIGNED_OUT;

export function useAuthSnapshot(): AuthSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Where this visitor's seller CTA should point. See `resolveSellerDestination`. */
export function useSellerDestination(): SellerDestination {
  const { user, isAuthenticated } = useAuthSnapshot();
  return useMemo(
    () => resolveSellerDestination(user, isAuthenticated),
    [user, isAuthenticated]
  );
}
