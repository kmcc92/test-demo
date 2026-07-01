export type MerchantProduct = {
  id: string;
  type: "shop" | "exclusive";
  name: string;
  description: string;
  price: number;
  image: string;
  category?: string;
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

export { generateRandomString } from "@/lib/utils";

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

// Reserved certificate IDs from the static mock catalog — copied verbatim from
// the former CERTIFICATES map in lib/mock-verify.ts (now deprecated).
// These IDs are blocked from re-use in merchant product creation.
const RESERVED_CERTIFICATE_IDS = ["TEST-GOLD-001", "TEST-GOLD-002"];

// certificateId is assigned once at creation time and is immutable thereafter —
// it represents a physical NFC tag and must never be reassigned.
function getStaticCertificateIds(): string[] {
  return RESERVED_CERTIFICATE_IDS;
}

export function isCertificateIdTaken(
  certificateId: string,
  excludeProductId?: string
): boolean {
  const normalized = certificateId.trim().toUpperCase();
  if (getStaticCertificateIds().some((id) => id.toUpperCase() === normalized)) {
    return true;
  }
  return readStore().products.some(
    (p) =>
      p.id !== excludeProductId &&
      !!p.certificateId &&
      p.certificateId.toUpperCase() === normalized
  );
}

export function updateMerchantProduct(
  id: string,
  updates: Partial<MerchantProduct>
): void {
  if (!isBrowser()) return;
  if (updates.certificateId !== undefined) {
    console.warn(
      `Rejected attempt to modify certificateId on merchant product ${id} — certificateId is immutable after creation.`
    );
  }
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
