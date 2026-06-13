// Certificate registry — the PRIMARY identity authority for certificateIds.
//
// A certificateId becomes a known identity the moment a merchant creates an
// exclusive product (the minting event). lib/mock-verify.ts is a DEPRECATED
// legacy fallback for certificateIds that predate this registry — see
// lib/verify-lookup.ts for the lookup order.
//
// Storage pattern mirrors lib/certificate-status.ts exactly: localStorage,
// readStore/writeStore with try/catch, normalized (uppercase) certificateId
// keys, SSR-safe isBrowser() guard, falsy-certificateId early returns.

export interface RegisteredCertificate {
  certificateId: string;
  productName: string;
  merchantId?: string;
  registeredAt: string;
}

type RegistryStore = {
  records: RegisteredCertificate[];
};

const STORAGE_KEY = "test_certificate_registry_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStore(): RegistryStore {
  if (!isBrowser()) return { records: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { records: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Legacy schema migration: old format was a raw array
      return { records: parsed };
    }
    if (!parsed || !Array.isArray(parsed.records)) {
      return { records: [] };
    }
    return parsed as RegistryStore;
  } catch {
    return { records: [] };
  }
}

function writeStore(store: RegistryStore): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

// Idempotent — safe to call multiple times with the same certificateId.
export function registerCertificate(params: {
  certificateId: string;
  productName: string;
  merchantId?: string;
  registeredAt?: string;
}): void {
  if (!params.certificateId) {
    console.warn("registerCertificate called with a falsy certificateId — ignored.");
    return;
  }
  if (!isBrowser()) return;

  const normalized = params.certificateId.trim().toUpperCase();
  const store = readStore();
  const alreadyRegistered = store.records.some(
    (r) => r.certificateId.toUpperCase() === normalized
  );
  if (alreadyRegistered) return;

  store.records.push({
    certificateId: normalized,
    productName: params.productName,
    merchantId: params.merchantId,
    registeredAt: params.registeredAt ?? new Date().toISOString(),
  });
  writeStore(store);
}

// Pure read — returns the registered identity or null. Never writes to storage.
export function getCertificateFromRegistry(
  certificateId: string
): RegisteredCertificate | null {
  if (!certificateId || !isBrowser()) return null;
  const normalized = certificateId.trim().toUpperCase();
  return (
    readStore().records.find((r) => r.certificateId.toUpperCase() === normalized) ?? null
  );
}

export function listRegisteredCertificates(): RegisteredCertificate[] {
  if (!isBrowser()) return [];
  return readStore().records;
}

export function isCertificateRegistered(certificateId: string): boolean {
  if (!certificateId || !isBrowser()) return false;
  return getCertificateFromRegistry(certificateId) !== null;
}
