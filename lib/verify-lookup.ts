// Shared certificate verification utility.
//
// Dynamic purchase certificates are verified against the ACTIVE SESSION only.
// After logout or page refresh, session purchases are gone and dynamic certs
// will not verify — this is intentional demo behavior.
//
// Static mock certificates (TEST-GOLD-001, etc.) always work via the
// DEPRECATED mock-verify.ts fallback (see identity resolution below).

import { getMockCertificate, type CertificateResult, type ProvenanceRecord } from "@/lib/mock-verify";
import { getCertificateFromRegistry } from "@/lib/certificate-registry";
import { getCertificateStatusRecord } from "@/lib/certificate-status";
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
//   1. OWNERSHIP (unchanged): active session purchases by certificateId →
//      AUTHENTICATED result built directly from the purchase record. This
//      covers dynamic certs minted at purchase time that never appear in
//      the registry or mock-verify, so it intentionally runs before identity
//      resolution and is preserved as-is.
//   2. IDENTITY RESOLUTION (only when not purchased this session) — strict
//      short-circuit, no merging:
//        a. lib/certificate-registry.ts (PRIMARY) — merchant-issued certs,
//           registered at product-creation time. If found, return
//           immediately as "authenticated" + registryUnowned: true.
//        b. DEPRECATED: mock-verify.ts is a legacy fallback pending
//           deletion after certificate-registry.ts is proven stable.
//           Do NOT add new certificates to mock-verify.ts ever.
//        c. Neither → not_found.
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

  let result: CertificateResult;

  if (match) {
    result = buildAuthenticatedResult(match, ownerEmail);
  } else {
    // Step 2: Identity resolution — registry wins over mock-verify, no merging.
    const registryEntry = getCertificateFromRegistry(id);
    if (registryEntry) {
      result = {
        status: "authenticated",
        certificateId: registryEntry.certificateId,
        itemName: registryEntry.productName,
        registryUnowned: true,
      };
    } else {
      const mockResult = getMockCertificate(id);
      result = mockResult ?? { status: "not_found", certificateId: id };
    }
  }

  // Status overlay is UI enrichment only, applied after the result is resolved
  // and never influences the found/authenticated determination above.
  if (result.status !== "not_found") {
    const statusRecord = getCertificateStatusRecord(result.certificateId);
    result = {
      ...result,
      reportedStatus: statusRecord?.status ?? "active",
      reportedDate: statusRecord?.reportedDate,
      reportedLocation: statusRecord?.reportedLocation,
    };
  }

  return result;
}
