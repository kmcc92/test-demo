"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { readCards, type SavedCard } from "@/lib/payment-storage";

export function usePaymentMethods(): { cards: SavedCard[] } {
  const { user } = useAuth();
  const [cards, setCards] = useState<SavedCard[]>([]);

  useEffect(() => {
    if (user?.email) {
      setCards(readCards(user.email));
    } else {
      setCards([]);
    }
  }, [user?.email]);

  return { cards };
}
