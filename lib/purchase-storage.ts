// PurchaseRecord is the canonical purchase data shape.
// Purchases are scoped per email and persisted to localStorage.

export interface PurchaseRecord {
  id: string;
  productId: string;
  productName: string;
  certificateId: string;
  txHash: string;
  price: number;
  purchasedAt: string;
  walletAddress?: string;
}

type PurchaseStore = {
  purchases: { [email: string]: PurchaseRecord[] };
};

const STORAGE_KEY = "test_purchases_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStore(): PurchaseStore {
  if (!isBrowser()) return { purchases: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { purchases: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.purchases !== "object" || Array.isArray(parsed.purchases)) {
      return { purchases: {} };
    }
    return parsed as PurchaseStore;
  } catch {
    return { purchases: {} };
  }
}

function writeStore(store: PurchaseStore): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    console.warn("purchase-storage: failed to write store");
  }
}

export function readPurchases(email: string): PurchaseRecord[] {
  if (!email || !isBrowser()) return [];
  const store = readStore();
  return Array.isArray(store.purchases[email]) ? store.purchases[email] : [];
}

export function writePurchases(email: string, purchases: PurchaseRecord[]): void {
  if (!email || !isBrowser()) return;
  const store = readStore();
  store.purchases[email] = purchases;
  writeStore(store);
}

export function addPurchase(email: string, purchase: PurchaseRecord): void {
  if (!email || !isBrowser()) return;
  const store = readStore();
  const existing = Array.isArray(store.purchases[email]) ? store.purchases[email] : [];
  store.purchases[email] = [purchase, ...existing];
  writeStore(store);
}
