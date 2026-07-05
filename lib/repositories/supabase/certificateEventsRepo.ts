// Supabase-backed certificate EVENTS repository.
//
// Append-only, one-to-many, ordered — DIFFERENT from the one-to-one registry /
// status repos. This module is the ONLY place the events snapshot exists:
//   - snapshot: Map<normalizedCertId, CertificateEvent[]>  (each array kept
//     sorted ascending by (created_at, id))
//   - seenIds: Set<string> — LOAD-BEARING dedupe key = event id. Makes realtime
//     echo / reconnect replay / retry exactly-once.
//   - a monotonic version counter (bumped ONLY on a genuine new append)
//   - the Realtime channel (INSERT-only)
//   - the in-flight hydration promise (idempotency)
//
// Real schema (introspected): certificate_events(id text PK, certificate_id
// text, event_type text, actor_type text, actor_id text, created_at timestamptz,
// metadata jsonb). localStorage "timestamp" maps to "created_at"; the event id
// stays the client-generated text id.
//
// The Supabase client is lazily dynamic-imported (Step 4 import-safety).

import { emitDomainEvent } from "@/lib/domain-events";
import type { CertificateEvent, CertificateEventType } from "@/lib/certificate-events";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

const TABLE = "certificate_events";
const COLUMNS =
  "id, certificate_id, event_type, actor_type, actor_id, created_at, metadata";

type EventRow = {
  id: string;
  certificate_id: string;
  event_type: string;
  actor_type: string | null;
  actor_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

// Input shape mirrors lib/certificate-events.ts recordEvent (id/timestamp are
// generated here), but allows an explicit id/timestamp so retries reuse the
// same values (idempotency) and callers may supply their own if needed.
type RecordEventInput = Omit<CertificateEvent, "id" | "timestamp"> & {
  id?: string;
  timestamp?: string;
};

// ---- Private module-scoped state (snapshot lives here and NOWHERE else) ----

const snapshot = new Map<string, CertificateEvent[]>();
const seenIds = new Set<string>();
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

// Match lib/certificate-events.ts normalization exactly (trim + uppercase).
function normalizeId(certificateId: string): string {
  return certificateId.trim().toUpperCase();
}

// Same id shape as lib/certificate-events.ts.
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function rowToEvent(row: EventRow): CertificateEvent {
  return {
    id: row.id,
    certificateId: normalizeId(row.certificate_id),
    eventType: row.event_type as CertificateEventType,
    timestamp: row.created_at,
    actorType: (row.actor_type as CertificateEvent["actorType"]) ?? undefined,
    actorId: row.actor_id ?? undefined,
    metadata: row.metadata ?? undefined,
  };
}

// Canonical order: created_at ASC, tie-break by id ASC (deterministic).
function compareEvents(a: CertificateEvent, b: CertificateEvent): number {
  const ta = new Date(a.timestamp).getTime();
  const tb = new Date(b.timestamp).getTime();
  if (ta !== tb) return ta - tb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Append a KNOWN-persisted event. Dedupe by id via seenIds: a duplicate is a
// true no-op (no append, no version bump, no emit). Only a genuine new append
// bumps version + emits.
function applyEvent(event: CertificateEvent): void {
  if (seenIds.has(event.id)) return;
  seenIds.add(event.id);
  const key = normalizeId(event.certificateId);
  const arr = snapshot.get(key) ?? [];
  arr.push({ ...event, certificateId: key });
  arr.sort(compareEvents);
  snapshot.set(key, arr);
  currentVersion += 1;
  emitDomainEvent("certificate-events-changed");
}

async function doHydrate(): Promise<() => void> {
  const supabase = await getClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw error;

  snapshot.clear();
  seenIds.clear();
  for (const row of (data ?? []) as EventRow[]) {
    const event = rowToEvent(row);
    if (seenIds.has(event.id)) continue;
    seenIds.add(event.id);
    const key = normalizeId(event.certificateId);
    const arr = snapshot.get(key) ?? [];
    arr.push(event);
    snapshot.set(key, arr);
  }
  for (const arr of snapshot.values()) arr.sort(compareEvents);
  currentVersion += 1;
  emitDomainEvent("certificate-events-changed");

  // INSERT-only realtime. Append-only ledger → UPDATE/DELETE are ignored.
  realtimeChannel = supabase
    .channel("certificate-events")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABLE },
      (payload) => {
        const row = payload.new as unknown as EventRow;
        if (row && row.id && row.certificate_id) applyEvent(rowToEvent(row));
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
  seenIds.clear();
  hydratePromise = null;
}

export interface CertificateEventsSupabaseRepo {
  getTimeline(certificateId: string): CertificateEvent[];
  recordEvent(event: RecordEventInput): Promise<void>;
  hydrate(): Promise<() => void>;
  version(): number;
}

export const supabaseCertificateEventsRepo: CertificateEventsSupabaseRepo = {
  getTimeline(certificateId) {
    if (!certificateId) return [];
    // Array is maintained sorted on append; return a copy, never the snapshot ref.
    return [...(snapshot.get(normalizeId(certificateId)) ?? [])];
  },

  async recordEvent(event) {
    if (!event.certificateId) return; // mirror lib falsy-id guard

    // Generate id + created_at ONCE (reused across a retry of THIS insert).
    const id = event.id ?? generateEventId();
    const createdAt = event.timestamp ?? new Date().toISOString();
    const certId = normalizeId(event.certificateId);

    const row: EventRow = {
      id,
      certificate_id: certId,
      event_type: event.eventType,
      actor_type: event.actorType ?? null,
      actor_id: event.actorId ?? null,
      created_at: createdAt,
      metadata: (event.metadata as Record<string, unknown>) ?? {},
    };

    const { error } = await supabase_insert(row);
    if (error) {
      if (error.code === "23505") {
        // Duplicate key = persisted-but-unknown. Never blindly append a locally
        // synthesized event: fetch the CANONICAL persisted row instead.
        if (seenIds.has(id)) return; // already have it
        const supabase = await getClient();
        const { data } = await supabase
          .from(TABLE)
          .select(COLUMNS)
          .eq("id", id)
          .maybeSingle();
        if (data) applyEvent(rowToEvent(data as EventRow));
        return;
      }
      throw error; // any other error — do not corrupt the snapshot
    }

    // Clean success — append the known-persisted event (canonical values = row).
    applyEvent(rowToEvent(row));
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

async function supabase_insert(
  row: EventRow
): Promise<{ error: { code?: string } | null }> {
  const supabase = await getClient();
  const { error } = await supabase.from(TABLE).insert(row);
  return { error };
}
