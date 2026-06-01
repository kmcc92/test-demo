import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PRODUCTS, AUCTIONS } from "@/lib/mock-data";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getProductImage(productId: string): string {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (product) return product.images[0] ?? "";
  const auction = AUCTIONS.find((a) => a.id === productId);
  if (auction) return auction.image ?? "";
  return "";
}

export function truncateEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 4) return email;
  return email.slice(0, 4) + "…" + email.slice(at);
}
