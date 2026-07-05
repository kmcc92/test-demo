"use client";

import { useContext } from "react";
import {
  OwnershipContext,
  type OwnershipContextValue,
} from "@/components/providers/OwnershipProvider";
import { type PurchaseRecord } from "@/lib/purchase-storage";

export type OwnershipHookValue = OwnershipContextValue & {
  getResolvedPurchases: (email: string) => PurchaseRecord[];
};

export function useOwnership(): OwnershipHookValue {
  const ctx = useContext(OwnershipContext);
  if (!ctx) throw new Error("useOwnership must be used inside OwnershipProvider");

  const nonNullCtx = ctx;

  // The purchases repo snapshot (current user, hydrated from Supabase) is the
  // authoritative, synchronous source. The former localStorage merge is gone —
  // ctx.purchases already reflects the persisted rows.
  function getResolvedPurchases(_email: string): PurchaseRecord[] {
    return nonNullCtx.purchases;
  }

  return { ...nonNullCtx, getResolvedPurchases };
}
