// Shared certificate verification utility.
//
// Dynamic purchase certificates are verified against the ACTIVE SESSION only.
// After logout or page refresh, session purchases are gone and dynamic certs
// will not verify — this is intentional demo behavior.
//
// Static mock certificates (TEST-GOLD-001, TEST-STOLEN-001, etc.) always work.

import { getMockCertificate, type CertificateResult, type ProvenanceRecord } from "@/lib/mock-verify";
import type { PurchaseRecord } from "@/lib/purchase-storage";

function buildAuthenticatedResult(
  purchase: PurchaseRecord,
  ownerEmail: string | undefined
): CertificateResult {
  const mintDate = new Date(purchase.purchasedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const displayOwner = purchase.walletAddress || ownerEmail || "—";

  const provenance: ProvenanceRecord[] = [
    {
      owner: displayOwner,
      action: "Acquired",
      date: mintDate,
    },
    {
      owner: "TEST Workshop, Milano",
      action: "Minted",
      date: mintDate,
    },
  ];

  return {
    status: "authenticated",
    certificateId: purchase.certificateId,
    itemName: purchase.productName,
    edition: "—",
    mintDate,
    owner: displayOwner,
    provenance,
  };
}

// Single lookup entry point for the verify page.
//
// sessionPurchases: the active in-memory purchases from useOwnership().
//   Empty on logout, refresh, or when not logged in — dynamic certs won't verify.
// ownerEmail: the current user's email, used for provenance when no wallet is connected.
//
// Lookup order:
//   1. Search active session purchases by certificateId.
//   2. If found → return AUTHENTICATED result.
//   3. If not found → fall back to static mock certificates (unchanged behavior).
export async function lookupCertificate(
  id: string,
  sessionPurchases: PurchaseRecord[],
  ownerEmail?: string
): Promise<CertificateResult> {
  // Consistent 800ms delay for all lookup paths — matches existing mock-verify timing.
  await new Promise<void>((resolve) => setTimeout(resolve, 800));

  const normalized = id.trim().toUpperCase();

  // Step 1: Check active session purchases.
  const match = sessionPurchases.find(
    (p) => p.certificateId.toUpperCase() === normalized
  );

  if (match) {
    return buildAuthenticatedResult(match, ownerEmail);
  }

  // Step 2: Fall back to static mock certificates (synchronous — delay already applied).
  const mockResult = getMockCertificate(id);
  if (mockResult) return mockResult;

  return {
    status: "not_found",
    certificateId: id,
  };
}
