import type { MerchantProduct } from "@/lib/merchant-storage";

export type FakeOrder = {
  orderId: string;
  productId: string;
  productName: string;
  productType: "shop" | "exclusive";
  customerEmail: string;
  amount: number;
  status: "processing" | "shipped" | "delivered";
  orderedAt: string;
};

export type CustomerSummary = {
  email: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  productTypes: ("shop" | "exclusive")[];
};

const DEMO_EMAILS = [
  "customer1@demo.com",
  "customer2@demo.com",
  "customer3@demo.com",
  "customer4@demo.com",
  "customer5@demo.com",
];

const STATUS_BY_INDEX: FakeOrder["status"][] = ["delivered", "shipped", "processing"];

const BASE_TIMESTAMP = 1700000000000;

function charSum(s: string): number {
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
  return sum;
}

export function generateDemoOrders(products: MerchantProduct[]): FakeOrder[] {
  const orders: FakeOrder[] = [];

  for (const product of products) {
    const id = product.id;
    const orderCount = (charSum(id) % 3) + 1;
    const customerIndex = id.charCodeAt(0) % 5;
    const secondChar = id[1] ?? id[0];
    const amount = Math.round(product.price * (1 + (id.charCodeAt(secondChar === id[0] ? 0 : 1) % 3) * 0.1));
    const offset = id.charCodeAt(id.length - 1) * 86400000;
    const orderedAt = new Date(BASE_TIMESTAMP + offset).toISOString();

    for (let i = 0; i < orderCount; i++) {
      orders.push({
        orderId: `ORD-${id.slice(0, 4).toUpperCase()}-${String(i).padStart(3, "0")}`,
        productId: id,
        productName: product.name,
        productType: product.type,
        customerEmail: DEMO_EMAILS[customerIndex],
        amount,
        status: STATUS_BY_INDEX[i] ?? "delivered",
        orderedAt,
      });
    }
  }

  return orders;
}

export function generateDemoCustomers(orders: FakeOrder[]): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>();

  for (const order of orders) {
    const existing = map.get(order.customerEmail);
    if (!existing) {
      map.set(order.customerEmail, {
        email: order.customerEmail,
        totalOrders: 1,
        totalSpent: order.amount,
        lastOrderDate: order.orderedAt,
        productTypes: [order.productType],
      });
    } else {
      existing.totalOrders += 1;
      existing.totalSpent += order.amount;
      if (order.orderedAt > existing.lastOrderDate) {
        existing.lastOrderDate = order.orderedAt;
      }
      if (!existing.productTypes.includes(order.productType)) {
        existing.productTypes.push(order.productType);
      }
    }
  }

  return [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent);
}
