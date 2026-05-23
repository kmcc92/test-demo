"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { readOrders, type StoredOrder } from "@/lib/order-storage";

export function useOrders(refreshKey?: number) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  // Rehydrate from localStorage on login/logout and on explicit refresh
  useEffect(() => {
    setOrders(user?.email ? readOrders(user.email) : []);
  }, [user?.email, refreshKey]);

  return { orders };
}
