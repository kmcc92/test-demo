// Supabase-backed certificate registry repository.
//
// This module is the ONLY place a snapshot exists. It privately owns:
//   - a synchronous in-memory snapshot (Map keyed by normalized certificateId)
//   - a monotonic version counter (bumped on every snapshot change)
//   - the Realtime subscription handle
//   - the in-flight hydration promise (for idempotency)
//
// Public surface:
//   - get / list / isRegistered  → SYNCHRONOUS reads from the snapshot.
//     Callers never learn a snapshot exists; these are just the read verbs.
//   - register                   → persist to Supabase FIRST, then snapshot.
//   - hydrate()                  → load snapshot + open Realtime; returns dispose.
//   - version()                  → current monotonic version (for sync selectors).
//
// getFromSnapshot / subscribeToRealtime / isHydrated / isHydrating are NOT
// exposed — all internal implementation details.
//
// The Supabase client is imported LAZILY (dynamic import inside async methods)
// so that merely importing this module never loads lib/supabase.ts. That keeps
// the whole app/test import graph safe when Supabase env vars are absent
// (vitest, SSR, or a not-yet-configured deployment). Only the actual async
// calls (hydrate/register) require the client.

import { emitDomainEvent } from "@/lib/domain-events";
import type { RegisteredCertificate } from "@/lib/certificate-registry";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

const COLUMNS = "certificate_id, product_name, merchant_id, registered_at";

type CertificateRow = {
  certificate_id: string;
  product_name: string;
  merchant_id: string | null;
  registered_at: string;
};

// ---- Private module-scoped state (the snapshot lives here and NOWHERE else) ----

const snapshot = new Map<string, RegisteredCertificate>();
let currentVersion = 0;
let client: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let hydratePromise: Promise<() => void> | null = null;

// Lazily resolve (and cache) the Supabase client. Dynamic import so this module
// can be imported without loading lib/supabase.ts (which throws when env is
// missing). Same module singleton as a static import — no duplicate client.
async function getClient(): Promise<SupabaseClient> {
  if (!client) {
    const mod = await import("@/lib/supabase");
    client = mod.supabase;
  }
  return client;
}

// Match lib/certificate-registry.ts normalization exactly (trim + uppercase).
function normalizeId(certificateId: string): string {
  return certificateId.trim().toUpperCase();
}

function rowToEntry(row: CertificateRow): RegisteredCertificate {
  return {
    certificateId: row.certificate_id,
    productName: row.product_name,
    merchantId: row.merchant_id ?? undefined,
    registeredAt: row.registered_at,
  };
}

function entriesEqual(a: RegisteredCertificate, b: RegisteredCertificate): boolean {
  return (
    a.certificateId === b.certificateId &&
    a.productName === b.productName &&
    a.merchantId === b.merchantId &&
    a.registeredAt === b.registeredAt
  );
}

// Apply a single row to the snapshot. Idempotent: identical data (an own-write
// echo from Realtime, or a redundant register) is a no-op and does NOT bump the
// version or emit. Only a genuine change bumps + emits.
function applyEntry(entry: RegisteredCertificate): void {
  const key = normalizeId(entry.certificateId);
  const normalized: RegisteredCertificate = { ...entry, certificateId: key };
  const existing = snapshot.get(key);
  if (existing && entriesEqual(existing, normalized)) return;
  snapshot.set(key, normalized);
  currentVersion += 1;
  emitDomainEvent("certificates-changed");
}

async function doHydrate(): Promise<() => void> {
  const supabase = await getClient();

  const { data, error } = await supabase
    .from("certificates")
    .select(COLUMNS)
    .order("registered_at", { ascending: false });
  if (error) throw error;

  snapshot.clear();
  for (const row of (data ?? []) as CertificateRow[]) {
    const entry = rowToEntry(row);
    snapshot.set(normalizeId(entry.certificateId), {
      ...entry,
      certificateId: normalizeId(entry.certificateId),
    });
  }
  currentVersion += 1;
  emitDomainEvent("certificates-changed");

  // Subscribe to Realtime INTERNALLY. Certificates are immutable identity, so
  // INSERT is the primary case; UPDATE is handled defensively via applyEntry
  // (overwrite-if-changed). DELETE is ignored (identity is never removed).
  realtimeChannel = supabase
    .channel("certificate-registry")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "certificates" },
      (payload) => {
        const row = payload.new as unknown as CertificateRow;
        if (row && row.certificate_id) applyEntry(rowToEntry(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "certificates" },
      (payload) => {
        const row = payload.new as unknown as CertificateRow;
        if (row && row.certificate_id) applyEntry(rowToEntry(row));
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

export interface CertificateRegistrySupabaseRepo {
  get(certificateId: string): RegisteredCertificate | null;
  list(): RegisteredCertificate[];
  isRegistered(certificateId: string): boolean;
  register(params: {
    certificateId: string;
    productName: string;
    merchantId?: string;
  }): Promise<void>;
  hydrate(): Promise<() => void>;
  version(): number;
}

export const supabaseCertificateRegistryRepo: CertificateRegistrySupabaseRepo = {
  get(certificateId) {
    if (!certificateId) return null;
    return snapshot.get(normalizeId(certificateId)) ?? null;
  },

  list() {
    return Array.from(snapshot.values());
  },

  isRegistered(certificateId) {
    if (!certificateId) return false;
    return snapshot.has(normalizeId(certificateId));
  },

  async register(params) {
    const supabase = await getClient();
    // Persist to Supabase FIRST (authoritative). Immutable identity → insert;
    // a unique violation (already registered) is an idempotent success.
    const { data, error } = await supabase
      .from("certificates")
      .insert({
        certificate_id: params.certificateId,
        product_name: params.productName,
        merchant_id: params.merchantId ?? null,
      })
      .select(COLUMNS)
      .maybeSingle();
    if (error && error.code !== "23505") throw error;
    // Update snapshot only after the authoritative write succeeded. On a 23505
    // duplicate there is no returned row and no snapshot change is needed.
    if (data) applyEntry(rowToEntry(data as CertificateRow));
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
