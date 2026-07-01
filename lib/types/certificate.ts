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
