// Public ARCHIVE repository — global, read-only view of every authenticated
// SOLD piece. Physically SEPARATE from the private user-scoped purchase snapshot
// (lib/repositories/supabase/purchaseRepo.ts): it must NEVER merge into or read
// from that snapshot, and consumers see only the ArchiveEntry view model.
//
// PRIVACY (Step 10c RLS): purchases is now RLS-protected — direct
// `purchases?select=*` returns only the caller's OWN rows (email/wallet/tx_hash
// are no longer world-readable). Because the archive must read ACROSS ALL users,
// it now reads through the SECURITY DEFINER function `archive_public()` (see
// supabase/rls_policies.sql), which bypasses purchases RLS but projects ONLY the
// public columns — email/wallet/tx_hash are never selectable. This is the
// "dedicated public provenance view" the ArchiveEntry boundary was built for.
//
// PHASE 6 EXPANSION: ArchiveEntry insulates /library so the ledger work can add
// originalSale + latestSale + full price history[] with no page change.
//
// Realtime is DEFERRED (the archive is not latency-sensitive): hydrate-on-mount
// only. version() is present per the repo pattern for a future realtime add;
// no domain event is emitted for a hydrate-once read.

import type { CertificateStatus } from "@/lib/certificate-status";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseCertificateRegistryRepo } from "./certificateRegistryRepo";
import { supabaseCertificateStatusRepo } from "./certificateStatusRepo";

// Public-safe view model. authentication and status are SEPARATE concepts:
//   authenticated = the certificate EXISTS in the registry
//   status        = active / stolen / lost annotation
// NEVER carries owner email, wallet_address, or tx_hash. ownedByCurrentUser is
// NOT here — it is computed client-side by intersecting certificateId with the
// current user's own scoped snapshot.
export interface ArchiveEntry {
  certificateId: string;
  productName: string;
  image: string;
  description: string;
  price: number;
  soldDate: string;
  authenticated: boolean;
  status: CertificateStatus;
}

// The archive_public() RPC returns ONLY these public columns — NEVER email /
// wallet_address / tx_hash (enforced server-side by the function definition).
type ArchiveRow = {
  certificate_id: string | null;
  product_name: string | null;
  product_image: string | null;
  product_description: string | null;
  price: number;
  purchased_at: string;
};

// ---- Private module-scoped state (global archive; NOT the private snapshot) ----

let snapshot: ArchiveEntry[] = [];
let currentVersion = 0;
let client: SupabaseClient | null = null;
let hydratePromise: Promise<() => void> | null = null;

async function getClient(): Promise<SupabaseClient> {
  if (!client) {
    const mod = await import("@/lib/supabase");
    client = mod.supabase;
  }
  return client;
}

async function doHydrate(): Promise<() => void> {
  const supabase = await getClient();

  // Ensure the identity + status snapshots are populated so `authenticated` /
  // `status` are accurate regardless of provider hydration ordering. hydrate()
  // is idempotent/re-entrant on both repos — this shares their in-flight promise
  // and never creates duplicate subscriptions; their dispose is provider-owned,
  // so we deliberately ignore the returned teardown here.
  await supabaseCertificateRegistryRepo.hydrate();
  await supabaseCertificateStatusRepo.hydrate();

  // Global read — every certificated sold piece, across ALL users. Reads through
  // the SECURITY DEFINER archive_public() RPC (bypasses purchases RLS, public
  // columns only). Rows arrive ordered purchased_at DESC (see the function).
  const { data, error } = await supabase.rpc("archive_public");
  if (error) throw error;

  // Dedupe to ONE entry per certificate_id = the CURRENT owner (latest sale).
  // Rows are ordered purchased_at DESC, so the first row seen per cert is latest.
  const byCert = new Map<string, ArchiveEntry>();
  for (const row of (data ?? []) as ArchiveRow[]) {
    const certId = (row.certificate_id ?? "").trim();
    if (!certId) continue;
    const key = certId.toUpperCase();
    if (byCert.has(key)) continue;
    byCert.set(key, {
      certificateId: certId,
      productName: row.product_name ?? "",
      // Snapshot columns render sold pieces even if the merchant product was
      // deleted (invariant #7) — this is the first reader of these columns.
      image: row.product_image ?? "",
      description: row.product_description ?? "",
      price: Number(row.price),
      soldDate: row.purchased_at,
      authenticated: supabaseCertificateRegistryRepo.isRegistered(certId),
      status: supabaseCertificateStatusRepo.getStatus(certId),
    });
  }

  snapshot = Array.from(byCert.values());
  currentVersion += 1;

  return dispose;
}

// Clears ONLY the archive snapshot. Never disposes the registry/status repos —
// those are owned by their own providers.
function dispose(): void {
  snapshot = [];
  hydratePromise = null;
}

export interface ArchiveSupabaseRepo {
  getArchive(): ArchiveEntry[];
  hydrate(): Promise<() => void>;
  version(): number;
}

export const supabaseArchiveRepo: ArchiveSupabaseRepo = {
  getArchive() {
    // Copy — never hand out the internal array reference.
    return snapshot.map((e) => ({ ...e }));
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
