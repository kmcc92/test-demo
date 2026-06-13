export type CertificateStatus =
  | "authenticated"
  | "transferred"
  | "revoked"
  | "stolen"
  | "not_found";

export interface ProvenanceRecord {
  owner: string;
  action: string;
  date: string;
}

export interface CertificateResult {
  status: CertificateStatus;
  certificateId: string;
  itemName?: string;
  edition?: string;
  mintDate?: string;
  owner?: string;
  previousOwner?: string;
  revokedReason?: string;
  provenance?: ProvenanceRecord[];
  // Status overlay (lib/certificate-status.ts) — UI enrichment only, attached
  // after the verification result itself has been resolved.
  reportedStatus?: "active" | "stolen" | "lost";
  reportedDate?: string;
  reportedLocation?: string;
  // Set when this result came from lib/certificate-registry.ts and has not
  // yet been purchased — see lib/verify-lookup.ts identity resolution.
  registryUnowned?: boolean;
}

// DEPRECATED: mock-verify.ts is a legacy fallback pending deletion after
// certificate-registry.ts is proven stable. Do NOT add new certificates to
// mock-verify.ts ever.
export const CERTIFICATES: Record<string, CertificateResult> = {
  "TEST-GOLD-001": {
    status: "authenticated",
    certificateId: "TEST-GOLD-001",
    itemName: "Archive Trench — Edition 001",
    edition: "001 / 010",
    mintDate: "2024-09-12",
    owner: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    provenance: [
      {
        owner: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        action: "Acquired",
        date: "2026-02-14",
      },
      {
        owner: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        action: "Transfer",
        date: "2025-11-03",
      },
      {
        owner: "TEST Workshop, Milano",
        action: "Minted",
        date: "2024-09-12",
      },
    ],
  },
  "TEST-GOLD-002": {
    status: "transferred",
    certificateId: "TEST-GOLD-002",
    itemName: "Zero-Seam Coat — Edition 002",
    edition: "002 / 010",
    mintDate: "2024-09-12",
    owner: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    previousOwner: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    provenance: [
      {
        owner: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        action: "Transfer",
        date: "2026-01-08",
      },
      {
        owner: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        action: "Acquired",
        date: "2025-06-22",
      },
      {
        owner: "TEST Workshop, Milano",
        action: "Minted",
        date: "2024-09-12",
      },
    ],
  },
};

export async function verifyCertificate(id: string): Promise<CertificateResult> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const normalized = id.trim().toUpperCase();
  const result = CERTIFICATES[normalized];

  if (!result) {
    return {
      status: "not_found",
      certificateId: id,
    };
  }

  return result;
}

// Synchronous lookup — used by verify-lookup.ts to avoid adding a second 800ms delay
// when falling back from purchase lookup to static mock certificates.
export function getMockCertificate(id: string): CertificateResult | null {
  const normalized = id.trim().toUpperCase();
  return CERTIFICATES[normalized] ?? null;
}
