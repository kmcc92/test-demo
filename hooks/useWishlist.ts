"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  readWishlist,
  addToWishlist,
  removeFromWishlist,
  type WishlistItem,
} from "@/lib/wishlist-storage";

export function useWishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);

  // Rehydrate from localStorage when user logs in/out
  useEffect(() => {
    setItems(user?.email ? readWishlist(user.email) : []);
  }, [user?.email]);

  const toggle = useCallback(
    (item: WishlistItem) => {
      if (!user?.email) return;
      const isIn = items.some((i) => i.productId === item.productId);
      if (isIn) {
        removeFromWishlist(user.email, item.productId);
        setItems((prev) => prev.filter((i) => i.productId !== item.productId));
      } else {
        addToWishlist(user.email, item);
        setItems((prev) => [...prev, item]);
      }
    },
    [user?.email, items]
  );

  const remove = useCallback(
    (productId: string) => {
      if (!user?.email) return;
      removeFromWishlist(user.email, productId);
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    },
    [user?.email]
  );

  const isWishlisted = useCallback(
    (productId: string) => items.some((i) => i.productId === productId),
    [items]
  );

  return { items, toggle, remove, isWishlisted };
}
