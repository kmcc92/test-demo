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
  reportedDate?: string;
  reportedLocation?: string;
  note?: string;
}

export interface ReportDetails {
  reportedDate?: string;
  reportedLocation?: string;
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
    if (!raw) return { records: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Legacy schema migration: old format was a raw array
      return { records: parsed };
    }
    if (!parsed || !Array.isArray(parsed.records)) {
      return { records: [] };
    }
    return parsed as StatusStore;
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
  if (!certificateId || !isBrowser()) return "active";
  const normalized = certificateId.trim().toUpperCase();
  const record = readStore().records.find(
    (r) => r.certificateId.toUpperCase() === normalized
  );
  return record?.status ?? "active";
}

// Pure read — returns the full status record (including reported date/location/note)
// or null if no record exists. Never writes to storage.
export function getCertificateStatusRecord(
  certificateId: string
): CertificateStatusRecord | null {
  if (!certificateId || !isBrowser()) return null;
  const normalized = certificateId.trim().toUpperCase();
  return (
    readStore().records.find((r) => r.certificateId.toUpperCase() === normalized) ?? null
  );
}

export function setCertificateStatus(
  certificateId: string,
  status: CertificateStatus,
  details?: ReportDetails
): void {
  if (!certificateId || !isBrowser()) return;
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
      reportedDate: details?.reportedDate,
      reportedLocation: details?.reportedLocation,
      note: details?.note,
    });
  }
  writeStore({ records });
}

export function reportStolen(
  certificateId: string,
  details?: { dateStolen?: string; location?: string; note?: string }
): void {
  setCertificateStatus(certificateId, "stolen", {
    reportedDate: details?.dateStolen,
    reportedLocation: details?.location,
    note: details?.note,
  });
}

export function reportLost(
  certificateId: string,
  details?: { dateLost?: string; location?: string; note?: string }
): void {
  setCertificateStatus(certificateId, "lost", {
    reportedDate: details?.dateLost,
    reportedLocation: details?.location,
    note: details?.note,
  });
}

export function clearStatus(certificateId: string): void {
  setCertificateStatus(certificateId, "active");
}
