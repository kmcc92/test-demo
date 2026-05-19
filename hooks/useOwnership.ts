"use client";

import { useContext } from "react";
import { OwnershipContext, type OwnershipContextValue } from "@/components/providers/OwnershipProvider";

export function useOwnership(): OwnershipContextValue {
  const ctx = useContext(OwnershipContext);
  if (!ctx) throw new Error("useOwnership must be used inside OwnershipProvider");
  return ctx;
}
