"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { readCards, type SavedCard } from "@/lib/payment-storage";

export function usePaymentMethods(): { cards: SavedCard[] } {
  const { user } = useAuth();

  const cards = useMemo<SavedCard[]>(() => {
    if (!user?.email) return [];
    return readCards(user.email);
  }, [user?.email]);

  return { cards };
}
