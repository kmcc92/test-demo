export type OrderStatus = "processing" | "shipped" | "delivered";

export type StoredOrder = {
  orderId: string;
  productId: string;
  productName: string;
  price: number;
  size?: string;
  purchasedAt: string;
  trackingNumber: string;
  estimatedDelivery: string;
};

export function computeStatus(purchasedAt: string): OrderStatus {
  const elapsed = Date.now() - new Date(purchasedAt).getTime();
  const minutes = elapsed / (1000 * 60);
  if (minutes < 2) return "processing";
  if (minutes < 5) return "shipped";
  return "delivered";
}

function generateTrackingNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = (n: number) =>
    Array.from({ length: n }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `TRK-${rand(4)}-${rand(4)}`;
}

function estimatedDeliveryDate(purchasedAt: string): string {
  const d = new Date(purchasedAt);
  d.setDate(d.getDate() + 5);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function storageKey(email: string): string {
  return `test_orders_${email.toLowerCase()}`;
}

export function readOrders(email: string): StoredOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(email));
    return raw ? (JSON.parse(raw) as StoredOrder[]) : [];
  } catch {
    return [];
  }
}

export function saveOrder(
  email: string,
  partial: Omit<StoredOrder, "trackingNumber" | "estimatedDelivery"> & {
    trackingNumber?: string;
    estimatedDelivery?: string;
  }
): StoredOrder {
  const order: StoredOrder = {
    ...partial,
    trackingNumber: partial.trackingNumber ?? generateTrackingNumber(),
    estimatedDelivery: partial.estimatedDelivery ?? estimatedDeliveryDate(partial.purchasedAt),
  };
  if (typeof window !== "undefined") {
    try {
      const existing = readOrders(email);
      localStorage.setItem(
        storageKey(email),
        JSON.stringify([order, ...existing])
      );
    } catch {
      // ignore storage errors silently
    }
  }
  return order;
}
