import { localPurchaseRepo } from "./localStorage/purchaseRepo";
import { localMerchantProductRepo } from "./localStorage/merchantProductRepo";
import { localServiceRequestRepo } from "./localStorage/serviceRequestRepo";
import { localCertificateEventRepo } from "./localStorage/certificateEventRepo";
import { localCertificateStatusRepo } from "./localStorage/certificateStatusRepo";
import { localCertificateRegistryRepo } from "./localStorage/certificateRegistryRepo";
import { supabaseCertificateRegistryRepo } from "./supabase/certificateRegistryRepo";
import { supabaseCertificateStatusRepo } from "./supabase/certificateStatusRepo";
import { supabaseCertificateEventsRepo } from "./supabase/certificateEventsRepo";
import {
  supabasePurchaseRepo,
  type PurchaseInsert,
  type TransferParams,
} from "./supabase/purchaseRepo";
import {
  supabaseMerchantProductRepo,
  type MerchantProductUpdate,
} from "./supabase/merchantProductRepo";
import {
  supabaseServiceRequestRepo,
  type CreateServiceRequestInput,
  type ServiceRequestUpdate,
} from "./supabase/serviceRequestRepo";
import { supabaseArchiveRepo, type ArchiveEntry } from "./supabase/archiveRepo";

export type { ArchiveEntry } from "./supabase/archiveRepo";
import type { PurchaseRecord } from "@/lib/purchase-storage";
import {
  type MerchantProduct,
  getMerchantProducts,
  getMerchantProductsByType,
  addMerchantProduct,
  updateMerchantProduct,
  deleteMerchantProduct,
  isCertificateIdTaken,
} from "@/lib/merchant-storage";
import {
  type ServiceRequest,
  getAllServiceRequests,
  getServiceRequestsForCertificate,
  getActiveServiceRequest,
  createServiceRequest,
  updateServiceRequest,
} from "@/lib/service-requests";

export type { MerchantProductUpdate } from "./supabase/merchantProductRepo";
export type {
  CreateServiceRequestInput,
  ServiceRequestUpdate,
} from "./supabase/serviceRequestRepo";

export type { PurchaseInsert, TransferParams } from "./supabase/purchaseRepo";
import { getCertificateFromRegistry, registerCertificate } from "@/lib/certificate-registry";
import type { RegisteredCertificate } from "@/lib/certificate-registry";
import {
  recordEvent,
  getCertificateTimeline,
  type CertificateEvent,
} from "@/lib/certificate-events";
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
const USE_SUPABASE_EVENTS = true;
const USE_SUPABASE_PURCHASES = true;
const USE_SUPABASE_MERCHANT_PRODUCTS = true;
const USE_SUPABASE_SERVICE_REQUESTS = true;

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
    // Preserve the "created" certificate event (best-effort — a failed event
    // write must not fail a successful registration).
    try {
      await recordEventEntry({
        certificateId: params.certificateId.trim().toUpperCase(),
        eventType: "created",
        actorType: "merchant",
        metadata: { productName: params.productName },
      });
    } catch {
      // Observational only — registry write above is unaffected.
    }
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
      await recordEventEntry({
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
      await recordEventEntry({
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
      await recordEventEntry({
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

// ---- Certificate events (append-only ledger): backend-hiding accessors ----

export function getTimelineEntry(certificateId: string): CertificateEvent[] {
  return USE_SUPABASE_EVENTS
    ? supabaseCertificateEventsRepo.getTimeline(certificateId)
    : getCertificateTimeline(certificateId);
}

export function certificateEventsVersion(): number {
  return USE_SUPABASE_EVENTS ? supabaseCertificateEventsRepo.version() : 0;
}

export async function hydrateCertificateEvents(): Promise<() => void> {
  return USE_SUPABASE_EVENTS
    ? supabaseCertificateEventsRepo.hydrate()
    : () => {};
}

// Backend-hiding event recorder (append-only). Supabase path is persist-first;
// the repo generates a stable id + created_at, dedupes by id, appends, and emits
// "certificate-events-changed" only on a genuine new append. Callers that treat
// events as observational should invoke this best-effort (fire-and-forget with a
// swallowed rejection, or await inside try/catch).
export async function recordEventEntry(
  event: Omit<CertificateEvent, "id" | "timestamp"> & {
    id?: string;
    timestamp?: string;
  }
): Promise<void> {
  if (USE_SUPABASE_EVENTS) {
    await supabaseCertificateEventsRepo.recordEvent(event);
    return;
  }
  recordEvent(event);
}

// ---- Purchases (private, per-user): backend-hiding accessors ----
//
// Purchases are committed to Supabase (USE_SUPABASE_PURCHASES). The snapshot is
// current-user-only and lives in the repo; OwnershipProvider drives hydrate/
// dispose off the auth lifecycle. NOTE: the localStorage (false) branch is an
// inert legacy stub — the pre-migration path lived in OwnershipProvider, which
// this migration replaces.

export function getPurchasesEntry(): PurchaseRecord[] {
  return USE_SUPABASE_PURCHASES ? supabasePurchaseRepo.getPurchases() : [];
}

export function isOwnedEntry(productId: string): boolean {
  return USE_SUPABASE_PURCHASES ? supabasePurchaseRepo.isOwned(productId) : false;
}

export function purchasesVersion(): number {
  return USE_SUPABASE_PURCHASES ? supabasePurchaseRepo.version() : 0;
}

export async function hydratePurchases(email: string): Promise<void> {
  if (USE_SUPABASE_PURCHASES) await supabasePurchaseRepo.hydrate(email);
}

export function disposePurchases(): void {
  if (USE_SUPABASE_PURCHASES) supabasePurchaseRepo.dispose();
}

// Authoritative persist-first. certificate_id verbatim (#2); non-empty payment
// reference enforced in the repo (#3).
export async function addOwnershipEntry(record: PurchaseInsert): Promise<void> {
  if (USE_SUPABASE_PURCHASES) await supabasePurchaseRepo.addOwnership(record);
}

export async function removeOwnershipEntry(
  email: string,
  productId: string
): Promise<void> {
  if (USE_SUPABASE_PURCHASES) await supabasePurchaseRepo.removeOwnership(email, productId);
}

// Atomic cross-user transfer via Postgres RPC (never two client writes).
export async function transferOwnershipEntry(params: TransferParams): Promise<void> {
  if (USE_SUPABASE_PURCHASES) await supabasePurchaseRepo.transferOwnership(params);
}

// ---- Merchant products (global public catalog): backend-hiding accessors ----
//
// The sole visibility gate (invariant #6): ALL catalog consumers read through
// these accessors; no component filters snapshot contents directly.

export function getMerchantProductsEntry(): MerchantProduct[] {
  return USE_SUPABASE_MERCHANT_PRODUCTS
    ? supabaseMerchantProductRepo.getAll()
    : getMerchantProducts();
}

export function getMerchantProductsByTypeEntry(
  type: "shop" | "exclusive"
): MerchantProduct[] {
  return USE_SUPABASE_MERCHANT_PRODUCTS
    ? supabaseMerchantProductRepo.getByType(type)
    : getMerchantProductsByType(type);
}

export function getMerchantProductByIdEntry(id: string): MerchantProduct | null {
  return USE_SUPABASE_MERCHANT_PRODUCTS
    ? supabaseMerchantProductRepo.getById(id)
    : getMerchantProducts().find((p) => p.id === id) ?? null;
}

export function isCertificateIdTakenEntry(
  certificateId: string,
  excludeProductId?: string
): boolean {
  return USE_SUPABASE_MERCHANT_PRODUCTS
    ? supabaseMerchantProductRepo.isCertificateIdTaken(certificateId, excludeProductId)
    : isCertificateIdTaken(certificateId, excludeProductId);
}

export function merchantProductsVersion(): number {
  return USE_SUPABASE_MERCHANT_PRODUCTS ? supabaseMerchantProductRepo.version() : 0;
}

export async function hydrateMerchantProducts(): Promise<() => void> {
  return USE_SUPABASE_MERCHANT_PRODUCTS
    ? supabaseMerchantProductRepo.hydrate()
    : () => {};
}

export function disposeMerchantProducts(): void {
  // localStorage path has no snapshot to dispose.
}

// Authoritative persist-first CRUD. create carries certificate_id verbatim (#1)
// and is intentionally NON-transactional across cert + product (cert registers
// first; an orphan cert on product-fail is acceptable per §3 drop scenario —
// certificate identity may legitimately outlive a storefront listing; do NOT
// "fix" this into a transaction).
export async function createMerchantProductEntry(
  product: MerchantProduct
): Promise<void> {
  if (USE_SUPABASE_MERCHANT_PRODUCTS) {
    await supabaseMerchantProductRepo.create(product);
    return;
  }
  addMerchantProduct(product);
}

export async function updateMerchantProductEntry(
  id: string,
  updates: MerchantProductUpdate
): Promise<void> {
  if (USE_SUPABASE_MERCHANT_PRODUCTS) {
    await supabaseMerchantProductRepo.update(id, updates);
    return;
  }
  updateMerchantProduct(id, updates);
}

export async function deleteMerchantProductEntry(id: string): Promise<void> {
  if (USE_SUPABASE_MERCHANT_PRODUCTS) {
    await supabaseMerchantProductRepo.delete(id);
    return;
  }
  deleteMerchantProduct(id);
}

// ---- Service requests (global workflow): backend-hiding accessors ----
//
// The refurbish/replace lifecycle for authenticated pieces. GLOBAL (no owner
// column; the merchant reads ALL requests) — module-scoped snapshot, lifecycle
// provider, unfiltered realtime. Consumers (the collection page + merchant
// dashboard) read synchronously through these accessors and never import the
// repo. Writes are authoritative persist-first; the repo emits
// "service-requests-changed" on observable change (callers do NOT manually emit).

export function getAllServiceRequestsEntry(): ServiceRequest[] {
  return USE_SUPABASE_SERVICE_REQUESTS
    ? supabaseServiceRequestRepo.getAll()
    : getAllServiceRequests();
}

export function getServiceRequestsForCertificateEntry(
  certificateId: string
): ServiceRequest[] {
  return USE_SUPABASE_SERVICE_REQUESTS
    ? supabaseServiceRequestRepo.getByCertificate(certificateId)
    : getServiceRequestsForCertificate(certificateId);
}

export function getActiveServiceRequestEntry(
  certificateId: string
): ServiceRequest | null {
  return USE_SUPABASE_SERVICE_REQUESTS
    ? supabaseServiceRequestRepo.getActive(certificateId)
    : getActiveServiceRequest(certificateId);
}

export function serviceRequestsVersion(): number {
  return USE_SUPABASE_SERVICE_REQUESTS ? supabaseServiceRequestRepo.version() : 0;
}

export async function hydrateServiceRequests(): Promise<() => void> {
  return USE_SUPABASE_SERVICE_REQUESTS
    ? supabaseServiceRequestRepo.hydrate()
    : () => {};
}

// Authoritative persist-first create. Returns the created request, or null if
// refused (falsy cert / an active request already exists on that certificate) —
// mirrors lib/service-requests.ts, whose stub (empty id) callers detect the same
// way. A FK/other DB failure rejects (no phantom local state).
export async function createServiceRequestEntry(
  params: CreateServiceRequestInput
): Promise<ServiceRequest | null> {
  if (USE_SUPABASE_SERVICE_REQUESTS) {
    return supabaseServiceRequestRepo.create(params);
  }
  const created = createServiceRequest(params);
  return created && created.id ? created : null;
}

export async function updateServiceRequestEntry(
  id: string,
  updates: ServiceRequestUpdate
): Promise<void> {
  if (USE_SUPABASE_SERVICE_REQUESTS) {
    await supabaseServiceRequestRepo.update(id, updates);
    return;
  }
  updateServiceRequest(id, updates);
}

// ---- Public archive (global, read-only): backend-hiding accessors ----
//
// A new read (always Supabase). GLOBAL and physically separate from the
// user-scoped purchase snapshot. Returns only the ArchiveEntry view model.

export function getArchiveEntries(): ArchiveEntry[] {
  return supabaseArchiveRepo.getArchive();
}

export async function hydrateArchive(): Promise<() => void> {
  return supabaseArchiveRepo.hydrate();
}

export function archiveVersion(): number {
  return supabaseArchiveRepo.version();
}
