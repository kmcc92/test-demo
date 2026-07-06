// Supabase-backed SERVICE REQUESTS repository — the refurbish/replace workflow
// domain for authenticated pieces.
//
// WORKFLOW data with SERVER-SIDE visibility (Stage 6): rows carry user_id
// (DEFAULT auth.uid() — the requesting customer) and RLS scopes what each caller
// sees, so this module keeps the merchant-products / registry pattern —
// module-scoped snapshot, a lifecycle provider, hydrate-once, unfiltered
// Realtime — but the snapshot now holds ONLY the rows the CALLER is allowed to
// see: the merchant (public.merchants role) hydrates the whole queue; a customer
// hydrates their own requests (+ legacy pre-migration rows). Realtime respects
// the same SELECT policy, so the stream is trimmed identically.
//
// SECURITY (Step 10c RLS + Stage 6 uid migration): the former "any authenticated
// user can query every request" gap is CLOSED at the DB layer. Legacy rows
// (user_id NULL — the table had no owner/email column, so no backfill was
// possible) remain visible to all authenticated users, matching their
// pre-migration exposure. See supabase/rls_policies.sql +
// supabase/uid_migration.sql.
//
// CRUD domain (status mutates through a lifecycle: pending → quoted → accepted →
// paid → completed | denied | cancelled), so the dedup strategy is Map
// REPLACEMENT keyed by request id (NOT seenIds — that is for append-only
// ledgers). Realtime is INSERT/UPDATE/DELETE; own-write echoes are idempotent
// via a mutable-equality no-op.
//
// Real schema (introspected): service_requests(id text PK, certificate_id text
// FK→certificates.certificate_id, product_name text, request_type text, status
// text, customer_description text, submitted_at timestamptz, merchant_decision
// text, merchant_note text, quoted_price integer, quoted_at timestamptz,
// customer_response_at timestamptz, stripe_payment_intent_id text, paid_at
// timestamptz, completed_at timestamptz). Every TS field maps 1:1 to a snake_case
// column. NOTE: certificate_id is a FK — inserting a request for an unregistered
// certificate 23503-fails; persist-first surfaces that as a thrown error with no
// phantom local state (correct).
//
// This module is the ONLY place the service-request snapshot exists:
//   - snapshot: Map<id, ServiceRequest>  (FLAT, keyed by request id)
//   - version: monotonic, bumped only on observable change
//   - realtime channel (GLOBAL — unfiltered; the domain is global)
//   - the in-flight hydration promise (idempotency / re-entrancy)
//
// Lazy dynamic-import of the supabase client (Step 4 import-safety).

import { emitDomainEvent } from "@/lib/domain-events";
import type {
  ServiceRequest,
  ServiceRequestStatus,
  ServiceRequestType,
} from "@/lib/service-requests";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

const TABLE = "service_requests";
const COLUMNS =
  "id, certificate_id, product_name, request_type, status, customer_description, submitted_at, merchant_decision, merchant_note, quoted_price, quoted_at, customer_response_at, stripe_payment_intent_id, paid_at, completed_at";

// Mirror lib/service-requests.ts: a request is "active" (blocks a new request on
// the same certificate) while in one of these states.
const ACTIVE_STATES: ServiceRequestStatus[] = ["pending", "quoted", "accepted", "paid"];

type ServiceRequestRow = {
  id: string;
  certificate_id: string;
  product_name: string;
  request_type: string;
  status: string;
  customer_description: string;
  submitted_at: string;
  merchant_decision: string | null;
  merchant_note: string | null;
  quoted_price: number | null;
  quoted_at: string | null;
  customer_response_at: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  completed_at: string | null;
};

// Create input = the same shape the customer UI supplies (id/status/submittedAt
// are generated here, mirroring lib/service-requests.ts createServiceRequest).
export interface CreateServiceRequestInput {
  certificateId: string;
  productName: string;
  requestType: ServiceRequestType;
  customerDescription: string;
}

// The workflow-mutable fields (mirrors lib/service-requests.ts, which strips
// id/certificateId/submittedAt from updates; identity + creation facts are
// immutable). product_name / request_type / customer_description are creation
// facts and are intentionally NOT patchable.
export type ServiceRequestUpdate = Partial<
  Pick<
    ServiceRequest,
    | "status"
    | "merchantDecision"
    | "merchantNote"
    | "quotedPrice"
    | "quotedAt"
    | "customerResponseAt"
    | "stripePaymentIntentId"
    | "paidAt"
    | "completedAt"
  >
>;

// ---- Private module-scoped state (GLOBAL workflow snapshot) ----

const snapshot = new Map<string, ServiceRequest>();
let currentVersion = 0;
let client: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let hydratePromise: Promise<() => void> | null = null;

async function getClient(): Promise<SupabaseClient> {
  if (!client) {
    const mod = await import("@/lib/supabase");
    client = mod.supabase;
  }
  return client;
}

function normalizeCertId(certificateId: string): string {
  return certificateId.trim().toUpperCase();
}

// Same id shape as lib/service-requests.ts createServiceRequest.
function generateRequestId(): string {
  return `sr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function rowToRequest(row: ServiceRequestRow): ServiceRequest {
  return {
    id: row.id,
    certificateId: row.certificate_id,
    productName: row.product_name,
    requestType: row.request_type as ServiceRequestType,
    status: row.status as ServiceRequestStatus,
    customerDescription: row.customer_description,
    submittedAt: row.submitted_at,
    merchantDecision:
      (row.merchant_decision as ServiceRequest["merchantDecision"]) ?? undefined,
    merchantNote: row.merchant_note ?? undefined,
    quotedPrice: row.quoted_price ?? undefined,
    quotedAt: row.quoted_at ?? undefined,
    customerResponseAt: row.customer_response_at ?? undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
    paidAt: row.paid_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

function requestToInsertRow(request: ServiceRequest): ServiceRequestRow {
  return {
    id: request.id,
    certificate_id: request.certificateId,
    product_name: request.productName,
    request_type: request.requestType,
    status: request.status,
    customer_description: request.customerDescription,
    submitted_at: request.submittedAt,
    merchant_decision: request.merchantDecision ?? null,
    merchant_note: request.merchantNote ?? null,
    quoted_price: request.quotedPrice ?? null,
    quoted_at: request.quotedAt ?? null,
    customer_response_at: request.customerResponseAt ?? null,
    stripe_payment_intent_id: request.stripePaymentIntentId ?? null,
    paid_at: request.paidAt ?? null,
    completed_at: request.completedAt ?? null,
  };
}

// Map an update patch (camelCase ServiceRequest fields) to snake_case columns.
// Identity + creation facts are never included (see ServiceRequestUpdate).
function updateToPatchRow(updates: ServiceRequestUpdate): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.merchantDecision !== undefined) patch.merchant_decision = updates.merchantDecision;
  if (updates.merchantNote !== undefined) patch.merchant_note = updates.merchantNote;
  if (updates.quotedPrice !== undefined) patch.quoted_price = updates.quotedPrice;
  if (updates.quotedAt !== undefined) patch.quoted_at = updates.quotedAt;
  if (updates.customerResponseAt !== undefined)
    patch.customer_response_at = updates.customerResponseAt;
  if (updates.stripePaymentIntentId !== undefined)
    patch.stripe_payment_intent_id = updates.stripePaymentIntentId;
  if (updates.paidAt !== undefined) patch.paid_at = updates.paidAt;
  if (updates.completedAt !== undefined) patch.completed_at = updates.completedAt;
  return patch;
}

// Full-field equality — an echo that changes nothing observable is a no-op.
function sameRequest(a: ServiceRequest, b: ServiceRequest): boolean {
  return (
    a.id === b.id &&
    a.certificateId === b.certificateId &&
    a.productName === b.productName &&
    a.requestType === b.requestType &&
    a.status === b.status &&
    a.customerDescription === b.customerDescription &&
    a.submittedAt === b.submittedAt &&
    a.merchantDecision === b.merchantDecision &&
    a.merchantNote === b.merchantNote &&
    a.quotedPrice === b.quotedPrice &&
    a.quotedAt === b.quotedAt &&
    a.customerResponseAt === b.customerResponseAt &&
    a.stripePaymentIntentId === b.stripePaymentIntentId &&
    a.paidAt === b.paidAt &&
    a.completedAt === b.completedAt
  );
}

// Upsert into the snapshot. Bumps version + emits ONLY on observable change
// (own-write echoes / identical realtime = no-op → exactly-once).
function applyRequest(request: ServiceRequest): void {
  const existing = snapshot.get(request.id);
  if (existing && sameRequest(existing, request)) return;
  snapshot.set(request.id, { ...request });
  currentVersion += 1;
  emitDomainEvent("service-requests-changed");
}

function removeRequest(id: string): void {
  if (!snapshot.has(id)) return; // missing id = idempotent no-op
  snapshot.delete(id);
  currentVersion += 1;
  emitDomainEvent("service-requests-changed");
}

// Newest-first, mirroring lib/service-requests.ts sortBySubmittedAtDesc.
function sortedDesc(requests: ServiceRequest[]): ServiceRequest[] {
  return requests.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

async function doHydrate(): Promise<() => void> {
  const supabase = await getClient();

  // hydrate() REPLACES the whole snapshot before reopening realtime — never
  // merges stale data.
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .order("submitted_at", { ascending: false });
  if (error) throw error;

  snapshot.clear();
  for (const row of (data ?? []) as ServiceRequestRow[]) {
    const request = rowToRequest(row);
    snapshot.set(request.id, request);
  }
  currentVersion += 1;
  emitDomainEvent("service-requests-changed");

  // GLOBAL realtime — unfiltered (the domain is global; the merchant reads all).
  // CRUD: INSERT (new request), UPDATE (status transitions), DELETE (robustness;
  // the app never deletes requests, but a DELETE echo stays idempotent).
  realtimeChannel = supabase
    .channel("service-requests")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABLE },
      (payload) => {
        const row = payload.new as unknown as ServiceRequestRow;
        if (row && row.id) applyRequest(rowToRequest(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: TABLE },
      (payload) => {
        const row = payload.new as unknown as ServiceRequestRow;
        if (row && row.id) applyRequest(rowToRequest(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: TABLE },
      (payload) => {
        const old = payload.old as unknown as Partial<ServiceRequestRow>;
        if (old && old.id) removeRequest(old.id);
      }
    )
    .subscribe();

  return dispose;
}

function dispose(): void {
  if (client && realtimeChannel) {
    client.removeChannel(realtimeChannel);
  }
  realtimeChannel = null;
  snapshot.clear();
  hydratePromise = null;
}

export interface ServiceRequestSupabaseRepo {
  getAll(): ServiceRequest[];
  getByCertificate(certificateId: string): ServiceRequest[];
  getActive(certificateId: string): ServiceRequest | null;
  create(params: CreateServiceRequestInput): Promise<ServiceRequest | null>;
  update(id: string, updates: ServiceRequestUpdate): Promise<void>;
  hydrate(): Promise<() => void>;
  version(): number;
}

export const supabaseServiceRequestRepo: ServiceRequestSupabaseRepo = {
  getAll() {
    return sortedDesc(Array.from(snapshot.values()).map((r) => ({ ...r })));
  },

  getByCertificate(certificateId) {
    if (!certificateId) return [];
    const normalized = normalizeCertId(certificateId);
    const matches = Array.from(snapshot.values())
      .filter((r) => r.certificateId.toUpperCase() === normalized)
      .map((r) => ({ ...r }));
    return sortedDesc(matches);
  },

  getActive(certificateId) {
    if (!certificateId) return null;
    const active = this.getByCertificate(certificateId).find((r) =>
      ACTIVE_STATES.includes(r.status)
    );
    return active ? { ...active } : null;
  },

  async create(params) {
    if (!params.certificateId) return null; // mirror lib falsy-id guard

    // One active request per certificate (mirror lib/service-requests.ts). This
    // is a snapshot pre-check; the customer UI also pre-checks. Not a hard DB
    // constraint — acceptable at demo scale (no concurrent duplicate submits).
    if (this.getActive(params.certificateId)) return null;

    const request: ServiceRequest = {
      id: generateRequestId(),
      certificateId: params.certificateId, // verbatim (matches certificates FK value)
      productName: params.productName,
      requestType: params.requestType,
      status: "pending",
      customerDescription: params.customerDescription,
      submittedAt: new Date().toISOString(),
    };

    const supabase = await getClient();
    const { error } = await supabase.from(TABLE).insert(requestToInsertRow(request));
    if (error) {
      if (error.code === "23505") {
        // Duplicate id (retry of THIS insert — ids are unique per client call).
        // Treat as idempotent success: fetch + apply the canonical persisted row.
        const { data } = await supabase
          .from(TABLE)
          .select(COLUMNS)
          .eq("id", request.id)
          .maybeSingle();
        if (data) {
          const canonical = rowToRequest(data as ServiceRequestRow);
          applyRequest(canonical);
          return canonical;
        }
      }
      throw error; // e.g. 23503 FK (unregistered cert) — surface, no phantom state
    }

    applyRequest(request);
    return request;
  },

  async update(id, updates) {
    const patch = updateToPatchRow(updates);
    if (Object.keys(patch).length === 0) return;

    const supabase = await getClient();
    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq("id", id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (data) applyRequest(rowToRequest(data as ServiceRequestRow));
  },

  hydrate() {
    if (!hydratePromise) {
      hydratePromise = doHydrate().catch((err) => {
        hydratePromise = null;
        throw err;
      });
    }
    return hydratePromise;
  },

  version() {
    return currentVersion;
  },
};
