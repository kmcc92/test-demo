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
}

const CERTIFICATES: Record<string, CertificateResult> = {
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
  "TEST-REVOKED-001": {
    status: "revoked",
    certificateId: "TEST-REVOKED-001",
    itemName: "Unreleased Sample — S/S 2025",
    edition: "SAMPLE",
    mintDate: "2025-01-05",
    revokedReason: "Sample certificate — item never entered commercial release.",
    provenance: [
      {
        owner: "TEST Workshop, Milano",
        action: "Certificate revoked",
        date: "2025-03-01",
      },
      {
        owner: "TEST Workshop, Milano",
        action: "Minted",
        date: "2025-01-05",
      },
    ],
  },
  "TEST-STOLEN-001": {
    status: "stolen",
    certificateId: "TEST-STOLEN-001",
    itemName: "Archive Leather Jacket — 1991",
    edition: "UNIQUE",
    mintDate: "2024-10-30",
    owner: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    provenance: [
      {
        owner: "FLAGGED",
        action: "Reported stolen",
        date: "2025-04-11",
      },
      {
        owner: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        action: "Acquired",
        date: "2025-02-17",
      },
      {
        owner: "TEST Workshop, Milano",
        action: "Minted",
        date: "2024-10-30",
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
