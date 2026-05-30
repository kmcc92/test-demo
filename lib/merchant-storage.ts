export type MerchantProduct = {
  id: string;
  type: "shop" | "exclusive";
  name: string;
  description: string;
  price: number;
  image: string;
  certificateId?: string;
  createdAt: string;
  merchantEmail: string;
};

type MerchantStore = {
  products: MerchantProduct[];
};

const STORAGE_KEY = "test_merchant_products_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function readStore(): MerchantStore {
  if (!isBrowser()) return { products: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MerchantStore) : { products: [] };
  } catch {
    return { products: [] };
  }
}

function writeStore(store: MerchantStore): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function getMerchantProducts(): MerchantProduct[] {
  if (!isBrowser()) return [];
  return readStore().products;
}

export function getMerchantProductsByType(
  type: "shop" | "exclusive"
): MerchantProduct[] {
  if (!isBrowser()) return [];
  return readStore().products.filter((p) => p.type === type);
}

export function addMerchantProduct(product: MerchantProduct): void {
  if (!isBrowser()) return;
  const store = readStore();
  store.products.push(product);
  writeStore(store);
}

export function updateMerchantProduct(
  id: string,
  updates: Partial<MerchantProduct>
): void {
  if (!isBrowser()) return;
  const store = readStore();
  const sanitized: Partial<Pick<MerchantProduct, "name" | "description" | "price" | "image">> = {};
  if (updates.name !== undefined) sanitized.name = updates.name;
  if (updates.description !== undefined) sanitized.description = updates.description;
  if (updates.price !== undefined) sanitized.price = updates.price;
  if (updates.image !== undefined) sanitized.image = updates.image;
  const updated: MerchantStore = {
    products: store.products.map((p) =>
      p.id === id ? { ...p, ...sanitized } : p
    ),
  };
  writeStore(updated);
}

export function deleteMerchantProduct(id: string): void {
  if (!isBrowser()) return;
  const store = readStore();
  const updated: MerchantStore = {
    products: store.products.filter((p) => p.id !== id),
  };
  writeStore(updated);
}
