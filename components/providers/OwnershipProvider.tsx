"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { AuthContext } from "@/components/providers/AuthProvider";
import type { PurchaseRecord } from "@/lib/purchase-storage";
import { recordEvent } from "@/lib/certificate-events";

export interface OwnershipContextValue {
  purchases: PurchaseRecord[];
  isOwned: (productId: string) => boolean;
  addOwnership: (record: PurchaseRecord) => void;
  removeOwnership: (ownerEmail: string, productId: string) => void;
}

export const OwnershipContext = createContext<OwnershipContextValue | null>(null);

export default function OwnershipProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("OwnershipProvider must be inside AuthProvider");

  const { user, setPurchaseHandler } = auth;
  const userEmail = user?.email ?? null;

  // Session-only: purchases live exclusively in React state.
  // No hydration from localStorage. No writes to localStorage.
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);

  // Clear all purchases on logout. On login, state is already [] — clean slate.
  useEffect(() => {
    if (!userEmail) {
      setPurchases([]);
    }
  }, [userEmail]);

  // Stable callback — no userEmail dependency since we no longer persist.
  // setPurchases from useState is guaranteed stable by React.
  const addOwnership = useCallback((record: PurchaseRecord) => {
    setPurchases((prev) => [record, ...prev]);

    if (record.certificateId) {
      try {
        recordEvent({
          certificateId: record.certificateId,
          eventType: "purchased",
          actorType: "system",
          metadata: { price: String(record.price) },
        });
      } catch {
        // Event recording is a side effect only — ownership state above is unaffected.
      }
    }
  }, []);

  const removeOwnership = useCallback((_ownerEmail: string, productId: string) => {
    setPurchases((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  // Register once with AuthProvider. Stable addOwnership means this only runs once.
  useEffect(() => {
    setPurchaseHandler(addOwnership);
    return () => {
      setPurchaseHandler(null);
    };
  }, [setPurchaseHandler, addOwnership]);

  // O(1) owned lookup — recomputed only when purchases list changes.
  const ownedIds = useMemo(
    () => new Set(purchases.map((p) => p.productId)),
    [purchases]
  );

  const isOwned = useCallback(
    (productId: string) => ownedIds.has(productId),
    [ownedIds]
  );

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
