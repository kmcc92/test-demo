// Supabase-backed certificate STATUS repository.
//
// One-to-one, mutable (last-write-wins), with delete semantics: "active" is
// represented by the ABSENCE of a row (mirrors lib/certificate-status.ts, where
// setCertificateStatus removes the record for "active"). This is the same
// snapshot pattern as the registry, EXCEPT for delete-on-active and upsert.
//
// This module is the ONLY place the status snapshot exists. It privately owns:
//   - snapshot: Map<normalizedCertId, CertificateStatusRecord>
//   - a monotonic version counter (bumped only on OBSERVABLE change)
//   - the Realtime subscription handle
//   - the in-flight hydration promise (idempotency)
//
// Real schema (introspected): certificate_status(certificate_id text PK, status
// text, reported_date text, reported_location text, note text, updated_at
// timestamptz). There is NO reported_at column — localStorage reportedAt maps
// to updated_at.
//
// The Supabase client is lazily dynamic-imported so importing this module never
// loads lib/supabase.ts at init (Step 4 import-safety).

import { emitDomainEvent } from "@/lib/domain-events";
import type {
  CertificateStatus,
  CertificateStatusRecord,
  ReportDetails,
} from "@/lib/certificate-status";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

const TABLE = "certificate_status";
const COLUMNS =
  "certificate_id, status, reported_date, reported_location, note, updated_at";

type StatusRow = {
  certificate_id: string;
  status: string;
  reported_date: string | null;
  reported_location: string | null;
  note: string | null;
  updated_at: string | null;
};

// ---- Private module-scoped state (snapshot lives here and NOWHERE else) ----

const snapshot = new Map<string, CertificateStatusRecord>();
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

// Match lib/certificate-status.ts normalization exactly (trim + uppercase).
function normalizeId(certificateId: string): string {
  return certificateId.trim().toUpperCase();
}

function rowToRecord(row: StatusRow): CertificateStatusRecord {
  return {
    certificateId: normalizeId(row.certificate_id),
    status: (row.status as CertificateStatus) ?? "active",
    reportedAt: row.updated_at ?? undefined,
    reportedDate: row.reported_date ?? undefined,
    reportedLocation: row.reported_location ?? undefined,
    note: row.note ?? undefined,
  };
}

// Observable equality — deliberately EXCLUDES reportedAt/updated_at so an
// identical re-report (which only bumps updated_at) is a true no-op.
function observablyEqual(
  a: CertificateStatusRecord,
  b: CertificateStatusRecord
): boolean {
  return (
    a.status === b.status &&
    a.reportedDate === b.reportedDate &&
    a.reportedLocation === b.reportedLocation &&
    a.note === b.note
  );
}

// Upsert a record into the snapshot. Bumps version + emits ONLY on observable
// change (identical upserts and own-write echoes are no-ops).
function applyRecord(record: CertificateStatusRecord): void {
  const key = normalizeId(record.certificateId);
  const normalized: CertificateStatusRecord = { ...record, certificateId: key };
  const existing = snapshot.get(key);
  if (existing && observablyEqual(existing, normalized)) return;
  snapshot.set(key, normalized);
  currentVersion += 1;
  emitDomainEvent("certificate-status-changed");
}

// Remove a record ("active" transition). No-op (no emit) if already absent.
function removeRecord(certificateId: string): void {
  const key = normalizeId(certificateId);
  if (!snapshot.has(key)) return;
  snapshot.delete(key);
  currentVersion += 1;
  emitDomainEvent("certificate-status-changed");
}

async function doHydrate(): Promise<() => void> {
  const supabase = await getClient();

  const { data, error } = await supabase.from(TABLE).select(COLUMNS);
  if (error) throw error;

  snapshot.clear();
  for (const row of (data ?? []) as StatusRow[]) {
    const record = rowToRecord(row);
    // "active" is represented by absence; never store an active row.
    if (record.status !== "active") {
      snapshot.set(normalizeId(record.certificateId), record);
    }
  }
  currentVersion += 1;
  emitDomainEvent("certificate-status-changed");

  realtimeChannel = supabase
    .channel("certificate-status")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABLE },
      (payload) => {
        const row = payload.new as unknown as StatusRow;
        if (row && row.certificate_id) applyRecord(rowToRecord(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: TABLE },
      (payload) => {
        const row = payload.new as unknown as StatusRow;
        if (row && row.certificate_id) applyRecord(rowToRecord(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: TABLE },
      (payload) => {
        // DELETE carries only the PK in payload.old (default REPLICA IDENTITY).
        const old = payload.old as unknown as Partial<StatusRow>;
        if (old && old.certificate_id) removeRecord(old.certificate_id);
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

export interface CertificateStatusSupabaseRepo {
  getStatusRecord(certificateId: string): CertificateStatusRecord | null;
  getStatus(certificateId: string): CertificateStatus;
  setStatus(
    certificateId: string,
    status: CertificateStatus,
    details?: ReportDetails
  ): Promise<void>;
  hydrate(): Promise<() => void>;
  version(): number;
}

export const supabaseCertificateStatusRepo: CertificateStatusSupabaseRepo = {
  getStatusRecord(certificateId) {
    if (!certificateId) return null;
    const record = snapshot.get(normalizeId(certificateId));
    // Return a copy — never a mutable reference into the snapshot.
    return record ? { ...record } : null;
  },

  getStatus(certificateId) {
    if (!certificateId) return "active";
    return snapshot.get(normalizeId(certificateId))?.status ?? "active";
  },

  async setStatus(certificateId, status, details) {
    if (!certificateId) return;
    const supabase = await getClient();
    const key = normalizeId(certificateId);

    if (status === "active") {
      // "active" = delete the row (persist FIRST), then remove from snapshot.
      const { error } = await supabase.from(TABLE).delete().eq("certificate_id", key);
      if (error) throw error;
      removeRecord(key);
      return;
    }

    // stolen / lost — upsert (persist FIRST), then update snapshot.
    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(
        {
          certificate_id: key,
          status,
          reported_date: details?.reportedDate ?? null,
          reported_location: details?.reportedLocation ?? null,
          note: details?.note ?? null,
          updated_at: updatedAt,
        },
        { onConflict: "certificate_id" }
      )
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw error;

    applyRecord(
      data
        ? rowToRecord(data as StatusRow)
        : {
            certificateId: key,
            status,
            reportedAt: updatedAt,
            reportedDate: details?.reportedDate,
            reportedLocation: details?.reportedLocation,
            note: details?.note,
          }
    );
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
