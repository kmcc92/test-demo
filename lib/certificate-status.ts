// Certificate status overlay — a separate, mutable, client-side-only layer
// keyed by certificateId. Decoupled from certificateId identity itself and
// from the verification result produced by mock-verify.ts / verify-lookup.ts.
//
// Status is purely UI enrichment: it never affects whether a certificate is
// found or how it is authenticated. All reads/writes are runtime-only and
// fail silently on the server, returning the "active" default.

export type CertificateStatus = "active" | "stolen" | "lost";

export interface CertificateStatusRecord {
  certificateId: string;
  status: CertificateStatus;
  reportedAt?: string;
  note?: string;
}

type StatusStore = {
  records: CertificateStatusRecord[];
};

const STORAGE_KEY = "test_certificate_status_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStore(): StatusStore {
  if (!isBrowser()) return { records: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StatusStore) : { records: [] };
  } catch {
    return { records: [] };
  }
}

function writeStore(store: StatusStore): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function getCertificateStatus(certificateId: string): CertificateStatus {
  if (!isBrowser()) return "active";
  const normalized = certificateId.trim().toUpperCase();
  const record = readStore().records.find(
    (r) => r.certificateId.toUpperCase() === normalized
  );
  return record?.status ?? "active";
}

export function setCertificateStatus(
  certificateId: string,
  status: CertificateStatus,
  note?: string
): void {
  if (!isBrowser()) return;
  const normalized = certificateId.trim().toUpperCase();
  const store = readStore();
  const records = store.records.filter(
    (r) => r.certificateId.toUpperCase() !== normalized
  );
  if (status !== "active") {
    records.push({
      certificateId: normalized,
      status,
      reportedAt: new Date().toISOString(),
      note,
    });
  }
  writeStore({ records });
}

export function reportStolen(certificateId: string, note?: string): void {
  setCertificateStatus(certificateId, "stolen", note);
}

export function reportLost(certificateId: string, note?: string): void {
  setCertificateStatus(certificateId, "lost", note);
}

export function clearStatus(certificateId: string): void {
  setCertificateStatus(certificateId, "active");
}
