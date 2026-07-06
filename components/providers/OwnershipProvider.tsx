"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { AuthContext } from "@/components/providers/AuthProvider";
import type { PurchaseRecord } from "@/lib/purchase-storage";
import {
  hydratePurchases,
  disposePurchases,
  getPurchasesEntry,
  isOwnedEntry,
  purchasesVersion,
  addOwnershipEntry,
  removeOwnershipEntry,
  type PurchaseInsert,
} from "@/lib/repositories";
import { useDomainSubscription } from "@/lib/use-domain-subscription";

export interface OwnershipContextValue {
  purchases: PurchaseRecord[];
  isOwned: (productId: string) => boolean;
  addOwnership: (record: PurchaseInsert) => void;
  removeOwnership: (ownerEmail: string, productId: string) => void;
}

export const OwnershipContext = createContext<OwnershipContextValue | null>(null);

export default function OwnershipProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("OwnershipProvider must be inside AuthProvider");

  const { user, setPurchaseHandler } = auth;
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;

  // Lifecycle: hydrate/dispose the repo snapshot off the EXISTING auth
  // login/logout transition. Invalidation on user change is MANDATORY — a stale
  // snapshot leaking the previous user's purchases would be a security bug. The
  // cleanup disposes before the next hydrate (user switch) and on unmount; the
  // repo's own epoch guard discards any stale in-flight hydrate.
  // Stage 6: hydration is keyed on auth.uid (userId); email rides along for
  // row payloads only.
  useEffect(() => {
    if (!userId || !userEmail) {
      disposePurchases();
      return;
    }
    void hydratePurchases({ id: userId, email: userEmail }).catch(() => {
      // Hydration failure leaves an empty snapshot; nothing to surface.
    });
    return () => {
      disposePurchases();
    };
  }, [userId, userEmail]);

  // Reactive bridge: re-derive the current user's snapshot whenever the repo
  // bumps its version. Exposes the SAME context API as before (no consumer
  // changes).
  const version = useDomainSubscription("purchases-changed", () => purchasesVersion());

  const purchases = useMemo(
    () => getPurchasesEntry(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, userEmail]
  );

  const isOwned = useCallback(
    (productId: string) => isOwnedEntry(productId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );

  // Authoritative persist-first writes (async in the repo). Callers fire-and-
  // forget; the UI reflects the change reactively once the repo emits.
  const addOwnership = useCallback((record: PurchaseInsert) => {
    void addOwnershipEntry(record).catch(() => {});
  }, []);

  const removeOwnership = useCallback((ownerEmail: string, productId: string) => {
    void removeOwnershipEntry(ownerEmail, productId).catch(() => {});
  }, []);

  // Register the checkout handler for AuthProvider (unchanged contract).
  useEffect(() => {
    setPurchaseHandler(addOwnership);
    return () => {
      setPurchaseHandler(null);
    };
  }, [setPurchaseHandler, addOwnership]);

  const value = useMemo(
    () => ({ purchases, isOwned, addOwnership, removeOwnership }),
    [purchases, isOwned, addOwnership, removeOwnership]
  );

  return (
    <OwnershipContext.Provider value={value}>
      {children}
    </OwnershipContext.Provider>
  );
}
