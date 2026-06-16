"use client";

import { useContext } from "react";
import {
  OwnershipContext,
  type OwnershipContextValue,
} from "@/components/providers/OwnershipProvider";
import { readPurchases, type PurchaseRecord } from "@/lib/purchase-storage";

export type OwnershipHookValue = OwnershipContextValue & {
  getResolvedPurchases: (email: string) => PurchaseRecord[];
};

export function useOwnership(): OwnershipHookValue {
  const ctx = useContext(OwnershipContext);
  if (!ctx) throw new Error("useOwnership must be used inside OwnershipProvider");

  const nonNullCtx = ctx;

  function getResolvedPurchases(email: string): PurchaseRecord[] {
    if (!email) return nonNullCtx.purchases;
    // Persisted storage is the authoritative base layer.
    const persisted = readPurchases(email);
    const persistedIds = new Set(
      persisted.map((p) => p.certificateId).filter(Boolean)
    );
    // In-memory fills any record not yet reflected in storage
    // (e.g. created this render cycle before the write flushed).
    const inMemoryOnly = nonNullCtx.purchases.filter(
      (p) => p.certificateId && !persistedIds.has(p.certificateId)
    );
    return [...persisted, ...inMemoryOnly];
  }

  return { ...nonNullCtx, getResolvedPurchases };
}
