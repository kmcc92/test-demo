import { localPurchaseRepo } from "./localStorage/purchaseRepo";
import { localMerchantProductRepo } from "./localStorage/merchantProductRepo";
import { localServiceRequestRepo } from "./localStorage/serviceRequestRepo";
import { localCertificateEventRepo } from "./localStorage/certificateEventRepo";
import { localCertificateStatusRepo } from "./localStorage/certificateStatusRepo";
import { localCertificateRegistryRepo } from "./localStorage/certificateRegistryRepo";
import { supabaseCertificateRegistryRepo } from "./supabase/certificateRegistryRepo";
import { supabaseCertificateStatusRepo } from "./supabase/certificateStatusRepo";
import { getCertificateFromRegistry, registerCertificate } from "@/lib/certificate-registry";
import type { RegisteredCertificate } from "@/lib/certificate-registry";
import { recordEvent } from "@/lib/certificate-events";
import {
  getCertificateStatus,
  getCertificateStatusRecord,
  reportStolen,
  reportLost,
  clearStatus,
  type CertificateStatus,
  type CertificateStatusRecord,
} from "@/lib/certificate-status";

// Global migration switch — flip to true when ALL domains are on Supabase.
const USE_SUPABASE = false;

// Per-domain migration flags. Certificates migrate first (Phase 5 Step 5);
// every other domain stays on localStorage until its own pass. Flip one flag
// per domain — the global switch above remains false until the last flip.
const USE_SUPABASE_CERTIFICATES = true;
const USE_SUPABASE_STATUS = true;

export const purchaseRepo = USE_SUPABASE
  ? localPurchaseRepo // replace with supabasePurchaseRepo later
  : localPurchaseRepo;

export const serviceRequestRepo = USE_SUPABASE
  ? localServiceRequestRepo
  : localServiceRequestRepo;

export const certificateEventRepo = USE_SUPABASE
  ? localCertificateEventRepo
  : localCertificateEventRepo;

export const certificateStatusRepo = USE_SUPABASE
  ? localCertificateStatusRepo
  : localCertificateStatusRepo;

export const certificateRegistryRepo = USE_SUPABASE
  ? localCertificateRegistryRepo
  : localCertificateRegistryRepo;

export const merchantProductRepo = USE_SUPABASE
  ? localMerchantProductRepo
  : localMerchantProductRepo;

// ---- Certificate registry: backend-hiding accessors ----
//
// Callers (getCertificateView, the hydration provider, sync selectors) use
// these three functions and never learn whether the data came from a Supabase
// snapshot or localStorage. When the certificate domain flips to Supabase, the
// synchronous read is served from the repository's hydrated in-memory snapshot.

export function getRegistryEntry(
  certificateId: string
): RegisteredCertificate | null {
  return USE_SUPABASE_CERTIFICATES
    ? supabaseCertificateRegistryRepo.get(certificateId)
    : getCertificateFromRegistry(certificateId);
}

export async function hydrateCertificateRegistry(): Promise<() => void> {
  return USE_SUPABASE_CERTIFICATES
    ? supabaseCertificateRegistryRepo.hydrate()
    : () => {};
}

export function certificateRegistryVersion(): number {
  // localStorage path is not versioned — it relies on existing event emission,
  // so a constant 0 is correct there.
  return USE_SUPABASE_CERTIFICATES ? supabaseCertificateRegistryRepo.version() : 0;
}

// Backend-hiding certificate registration (the write counterpart to
// getRegistryEntry). Async because the Supabase path persists durably before
// any snapshot/event side effect. Callers await it and never learn the backend.
export async function registerCertificateEntry(params: {
  certificateId: string;
  productName: string;
  merchantId?: string;
}): Promise<void> {
  if (USE_SUPABASE_CERTIFICATES) {
    // Mirror the localStorage backend's idempotent early-return: a certificate
    // already in the registry is not re-registered and fires no new event.
    if (supabaseCertificateRegistryRepo.isRegistered(params.certificateId)) return;
    // Persist to Supabase FIRST; the adapter updates snapshot + version + emits
    // "certificates-changed" only after the durable write succeeds.
    await supabaseCertificateRegistryRepo.register(params);
    // Preserve the "created" certificate event the localStorage backend records
    // internally (events domain stays on localStorage until its own pass).
    recordEvent({
      certificateId: params.certificateId.trim().toUpperCase(),
      eventType: "created",
      actorType: "merchant",
      metadata: { productName: params.productName },
    });
    return;
  }
  // localStorage path: registerCertificate records the "created" event itself.
  registerCertificate(params);
}

// ---- Certificate status: backend-hiding accessors ----

export function getStatusRecordEntry(
  certificateId: string
): CertificateStatusRecord | null {
  return USE_SUPABASE_STATUS
    ? supabaseCertificateStatusRepo.getStatusRecord(certificateId)
    : getCertificateStatusRecord(certificateId);
}

export function getStatusEntry(certificateId: string): CertificateStatus {
  return USE_SUPABASE_STATUS
    ? supabaseCertificateStatusRepo.getStatus(certificateId)
    : getCertificateStatus(certificateId);
}

export function certificateStatusVersion(): number {
  return USE_SUPABASE_STATUS ? supabaseCertificateStatusRepo.version() : 0;
}

export async function hydrateCertificateStatus(): Promise<() => void> {
  return USE_SUPABASE_STATUS
    ? supabaseCertificateStatusRepo.hydrate()
    : () => {};
}

// ---- Coupled status+event write wrappers ----
//
// Status durability is AUTHORITATIVE (persist-first, must succeed). Event
// recording is OBSERVATIONAL (best-effort) — a failure to record the event
// NEVER rolls back a successful status change. Events are NOT migrated this
// pass, so the event portion still writes to localStorage via recordEvent
// (hybrid: status durable in Supabase, event local temporarily — safe because
// the event is a secondary log the primary status write does not depend on).

export async function reportStolenEntry(
  certificateId: string,
  details?: { dateStolen?: string; location?: string; note?: string }
): Promise<void> {
  if (USE_SUPABASE_STATUS) {
    await supabaseCertificateStatusRepo.setStatus(certificateId, "stolen", {
      reportedDate: details?.dateStolen,
      reportedLocation: details?.location,
      note: details?.note,
    });
    try {
      recordEvent({
        certificateId: certificateId.trim().toUpperCase(),
        eventType: "reported_stolen",
        actorType: "owner",
        metadata: {
          location: details?.location,
          reportedDate: details?.dateStolen,
          note: details?.note,
        },
      });
    } catch {
      // Observational only — status change above is unaffected.
    }
    return;
  }
  reportStolen(certificateId, details);
}

export async function reportLostEntry(
  certificateId: string,
  details?: { dateLost?: string; location?: string; note?: string }
): Promise<void> {
  if (USE_SUPABASE_STATUS) {
    await supabaseCertificateStatusRepo.setStatus(certificateId, "lost", {
      reportedDate: details?.dateLost,
      reportedLocation: details?.location,
      note: details?.note,
    });
    try {
      recordEvent({
        certificateId: certificateId.trim().toUpperCase(),
        eventType: "reported_lost",
        actorType: "owner",
        metadata: {
          location: details?.location,
          reportedDate: details?.dateLost,
          note: details?.note,
        },
      });
    } catch {
      // Observational only.
    }
    return;
  }
  reportLost(certificateId, details);
}

export async function clearStatusEntry(certificateId: string): Promise<void> {
  if (USE_SUPABASE_STATUS) {
    await supabaseCertificateStatusRepo.setStatus(certificateId, "active");
    try {
      recordEvent({
        certificateId: certificateId.trim().toUpperCase(),
        eventType: "recovered",
        actorType: "owner",
        metadata: {},
      });
    } catch {
      // Observational only.
    }
    return;
  }
  clearStatus(certificateId);
}
