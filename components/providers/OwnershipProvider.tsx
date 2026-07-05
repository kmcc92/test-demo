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
import {
  readPurchases,
  addPurchase,
  writePurchases,
  type PurchaseRecord,
} from "@/lib/purchase-storage";
import { recordEventEntry } from "@/lib/repositories";

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

  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);

  // Hydrate from localStorage on login; clear React state on logout (storage survives).
  useEffect(() => {
    if (userEmail) {
      setPurchases(readPurchases(userEmail));
    } else {
      setPurchases([]);
    }
  }, [userEmail]);

  const addOwnership = useCallback(
    (record: PurchaseRecord) => {
      setPurchases((prev) => [record, ...prev]);

      if (userEmail) {
        addPurchase(userEmail, record);
      }

      if (record.certificateId) {
        // Best-effort, fire-and-forget: a failed event write must never affect
        // ownership state above. addOwnership stays synchronous.
        void recordEventEntry({
          certificateId: record.certificateId,
          eventType: "purchased",
          actorType: "system",
          metadata: { price: String(record.price) },
        }).catch(() => {});
      }
    },
    [userEmail]
  );

  const removeOwnership = useCallback((ownerEmail: string, productId: string) => {
    setPurchases((prev) => prev.filter((p) => p.productId !== productId));
    if (ownerEmail) {
      const updated = readPurchases(ownerEmail).filter((p) => p.productId !== productId);
      writePurchases(ownerEmail, updated);
    }
  }, []);

  // Re-registers whenever addOwnership changes (i.e., on login/logout when userEmail changes).
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
