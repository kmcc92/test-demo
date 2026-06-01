export type Certificate = {
  id: string;
  productId: string;
  productName: string;
  issuedTo: string;
  issuedAt: string;
  type: "exclusive";
  metadata: {
    provenanceDepth: number;
    serviceHistoryCount: number;
  };
};

type CertificateStore = {
  certificates: Certificate[];
};

const STORAGE_KEY = "test_certificates_v1";

export { generateRandomString } from "@/lib/utils";

function readStore(): CertificateStore {
  if (typeof window === "undefined") return { certificates: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CertificateStore) : { certificates: [] };
  } catch {
    return { certificates: [] };
  }
}

function writeStore(store: CertificateStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function issueCertificate(certificate: Certificate): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  store.certificates.push(certificate);
  writeStore(store);
}

export function getCertificates(): Certificate[] {
  if (typeof window === "undefined") return [];
  return readStore().certificates;
}

export function getCertificateByProductId(productId: string): Certificate | null {
  if (typeof window === "undefined") return null;
  return readStore().certificates.find((c) => c.productId === productId) ?? null;
}
