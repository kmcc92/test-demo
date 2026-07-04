// getCertificateView — the single query authority for certificate data in the UI.
//
// Composes the three certificate domain sources (identity registry, status
// overlay, event timeline) into one read model so UI code never calls
// getCertificateFromRegistry + getCertificateStatus + getCertificateTimeline
// directly (CLAUDE_SYSTEM_CONTRACT §3).
//
// Signature is SYNCHRONOUS by design: the cache-first Phase 5 plan keeps reads
// synchronous so existing render-time consumers (e.g. the /collection useMemo)
// are unaffected when their underlying domains flip to Supabase. As each source
// domain migrates, only this file's internals change — the signature is stable.
//
// Never throws on a registry miss: an unknown certificateId returns a view with
// productName: null and isRegistered: false, mirroring the getCertificateByCertId
// never-reverts rule (§11).

import { getRegistryEntry, getStatusEntry, getStatusRecordEntry } from "@/lib/repositories";
import { getCertificateTimeline } from "@/lib/certificate-events";
import type { CertificateEvent } from "@/lib/certificate-events";
import type { CertificateStatus } from "@/lib/certificate-status";

export interface CertificateView {
  certificateId: string;
  productName: string | null;
  merchantId?: string;
  registeredAt?: string;
  isRegistered: boolean;
  status: CertificateStatus;
  reportedDate?: string;
  reportedLocation?: string;
  timeline: CertificateEvent[];
}

export function getCertificateView(certificateId: string): CertificateView {
  if (!certificateId) {
    return {
      certificateId,
      productName: null,
      isRegistered: false,
      status: "active",
      timeline: [],
    };
  }

  const registryEntry = getRegistryEntry(certificateId);
  const status = getStatusEntry(certificateId);
  const statusRecord = getStatusRecordEntry(certificateId);
  const timeline = getCertificateTimeline(certificateId);

  return {
    certificateId,
    productName: registryEntry?.productName ?? null,
    merchantId: registryEntry?.merchantId,
    registeredAt: registryEntry?.registeredAt,
    isRegistered: !!registryEntry,
    status,
    reportedDate: statusRecord?.reportedDate,
    reportedLocation: statusRecord?.reportedLocation,
    timeline,
  };
}
