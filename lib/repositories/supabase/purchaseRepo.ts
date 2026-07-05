// Supabase-backed PURCHASES repository — the first PRIVATE, per-user domain.
//
// SECURITY REALITY (do not overclaim): auth is still fake (email-only, anon
// key, no JWT). The email-based Realtime/query filtering below is UX-ONLY — it
// scopes what THIS UI sees, but it is NOT a security boundary: a client could
// still query another user's rows via the anon key. TRUE protection requires
// RLS keyed on a verified identity (auth.jwt() email), which needs real Supabase
// Auth (later in Phase 5). Until then, purchase data is NOT access-secured.
//
// This module is the ONLY place the purchase snapshot exists. It privately owns:
//   - snapshot: PurchaseRecord[]  — the CURRENT USER ONLY (single array, never
//     Map<email,...>: retaining multiple users' private data in memory is a
//     leak risk, so a single-user array is a deliberate security decision).
//   - snapshotEmail: whose data the snapshot holds
//   - seenIds: Set<id> dedupe (PK = id, which is the payment reference)
//   - ownedProductIds: Set for O(1) isOwned
//   - version: monotonic, bumped only on observable change
//   - realtime channel (filtered to the user's email — UX-only)
//   - epoch: bumped on every hydrate AND every write, to (a) discard a stale
//     hydrate that resolves after a user switch, and (b) prevent an in-flight
//     pre-write hydrate from clobbering a just-persisted local write.
//
// Lazy dynamic-import of the supabase client (Step 4 import-safety).

import { emitDomainEvent } from "@/lib/domain-events";
import type { PurchaseRecord } from "@/lib/purchase-storage";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

const TABLE = "purchases";
const COLUMNS =
  "id, email, product_id, product_name, certificate_id, price, purchased_at, wallet_address, tx_hash";

// Write input = PurchaseRecord (unchanged) + the snapshot columns captured at
// purchase time (product_image/description) so images survive product deletion.
// PurchaseRecord itself is NOT modified (lib/purchase-storage.ts is untouched).
export type PurchaseInsert = PurchaseRecord & {
  productImage?: string;
  productDescription?: string;
};

export interface TransferParams {
  paymentRef: string;
  certificateId: string;
  productId: string;
  productName: string;
  buyerEmail: string;
  sellerEmail: string;
  price: number;
  buyerWallet?: string;
  productImage?: string;
  productDescription?: string;
}

type PurchaseRow = {
  id: string;
  email: string;
  product_id: string;
  product_name: string;
  certificate_id: string;
  price: number;
  purchased_at: string;
  wallet_address: string | null;
  tx_hash: string;
};

// ---- Private module-scoped state (CURRENT USER ONLY) ----

let snapshot: PurchaseRecord[] = [];
let snapshotEmail: string | null = null;
const seenIds = new Set<string>();
let ownedProductIds = new Set<string>();
let currentVersion = 0;
let epoch = 0;
let client: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;

async function getClient(): Promise<SupabaseClient> {
  if (!client) {
    const mod = await import("@/lib/supabase");
    client = mod.supabase;
  }
  return client;
}

function rowToRecord(row: PurchaseRow): PurchaseRecord {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    certificateId: row.certificate_id,
    txHash: row.tx_hash,
    price: Number(row.price),
    purchasedAt: row.purchased_at,
    walletAddress: row.wallet_address ?? undefined,
  };
}

function rebuildOwned(): void {
  ownedProductIds = new Set(snapshot.map((p) => p.productId));
}

function bumpAndEmit(): void {
  currentVersion += 1;
  emitDomainEvent("purchases-changed");
}

function teardownRealtime(): void {
  if (client && realtimeChannel) {
    client.removeChannel(realtimeChannel);
  }
  realtimeChannel = null;
}

function clearState(): void {
  teardownRealtime();
  snapshot = [];
  snapshotEmail = null;
  seenIds.clear();
  ownedProductIds = new Set();
}

// Append a persisted purchase (dedupe by PK id). No-op (no emit) if already seen
// — makes realtime echo / retry / hydrate overlap exactly-once.
function applyPurchase(record: PurchaseRecord): void {
  if (seenIds.has(record.id)) return;
  seenIds.add(record.id);
  snapshot = [record, ...snapshot];
  ownedProductIds.add(record.productId);
  bumpAndEmit();
}

function removeById(id: string): void {
  if (!seenIds.has(id)) return;
  seenIds.delete(id);
  snapshot = snapshot.filter((p) => p.id !== id);
  rebuildOwned();
  bumpAndEmit();
}

function subscribeRealtime(email: string): void {
  if (!client) return;
  // Realtime filtered to the user's rows. UX-ONLY — NOT a security boundary
  // (see the file header). The snapshotEmail guard drops any payload that
  // arrives after a user switch.
  realtimeChannel = client
    .channel(`purchases-${email}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABLE, filter: `email=eq.${email}` },
      (payload) => {
        if (snapshotEmail !== email) return;
        const row = payload.new as unknown as PurchaseRow;
        if (row && row.id) applyPurchase(rowToRecord(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: TABLE, filter: `email=eq.${email}` },
      (payload) => {
        if (snapshotEmail !== email) return;
        const old = payload.old as unknown as Partial<PurchaseRow>;
        if (old && old.id) removeById(old.id);
      }
    )
    .subscribe();
}

export interface PurchaseSupabaseRepo {
  getPurchases(): PurchaseRecord[];
  isOwned(productId: string): boolean;
  version(): number;
  hydrate(email: string): Promise<void>;
  dispose(): void;
  addOwnership(record: PurchaseInsert): Promise<void>;
  removeOwnership(email: string, productId: string): Promise<void>;
  transferOwnership(params: TransferParams): Promise<void>;
}

export const supabasePurchaseRepo: PurchaseSupabaseRepo = {
  getPurchases() {
    // Copy — never hand out the internal array reference.
    return snapshot.map((p) => ({ ...p }));
  },

  isOwned(productId) {
    return ownedProductIds.has(productId);
  },

  version() {
    return currentVersion;
  },

  async hydrate(email) {
    if (!email) {
      this.dispose();
      return;
    }
    const myEpoch = ++epoch;

    // User change: clear the previous user's data IMMEDIATELY (never let it
    // linger while the new fetch is in flight — security).
    if (snapshotEmail !== null && snapshotEmail !== email) {
      clearState();
      bumpAndEmit();
    }

    const supabase = await getClient();
    const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq("email", email);
    if (error) throw error;

    // STALE-HYDRATION GUARD: a newer hydrate (user switch) or a local write
    // bumped the epoch while this fetch was in flight → DISCARD entirely.
    // This is also the WRITE-VS-STALE-HYDRATION guarantee: a successful write
    // does `++epoch`, so any hydrate that started before the write is discarded
    // here and can never overwrite the write's snapshot update. A hydrate that
    // starts AFTER the write re-reads authoritative rows that already include
    // the persisted write (persist-first), so it stays consistent.
    if (epoch !== myEpoch) return;

    teardownRealtime();
    snapshot = ((data ?? []) as PurchaseRow[]).map(rowToRecord);
    seenIds.clear();
    snapshot.forEach((p) => seenIds.add(p.id));
    rebuildOwned();
    snapshotEmail = email;
    subscribeRealtime(email);
    bumpAndEmit();
  },

  dispose() {
    clearState();
    bumpAndEmit();
  },

  async addOwnership(record) {
    // #3 payment reference required — never transfer ownership without one.
    if (!record.txHash) {
      throw new Error("addOwnership requires a payment reference (txHash).");
    }
    const email = snapshotEmail;
    if (!email) {
      throw new Error("addOwnership: no active user (snapshot not hydrated).");
    }
    const supabase = await getClient();
    const { error } = await supabase.from(TABLE).insert({
      id: record.id,
      email,
      product_id: record.productId,
      product_name: record.productName,
      certificate_id: record.certificateId, // #2 verbatim — never generated
      price: record.price,
      purchased_at: record.purchasedAt,
      wallet_address: record.walletAddress ?? null,
      tx_hash: record.txHash,
      product_image: record.productImage ?? null,
      product_description: record.productDescription ?? null,
    });
    // id is the PK (= payment ref): a duplicate is an idempotent success.
    if (error && error.code !== "23505") throw error;

    epoch += 1; // invalidate any in-flight pre-write hydrate (see hydrate guard)
    applyPurchase({
      id: record.id,
      productId: record.productId,
      productName: record.productName,
      certificateId: record.certificateId,
      txHash: record.txHash,
      price: record.price,
      purchasedAt: record.purchasedAt,
      walletAddress: record.walletAddress,
    });
  },

  async removeOwnership(email, productId) {
    const supabase = await getClient();
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("email", email)
      .eq("product_id", productId);
    if (error) throw error;

    epoch += 1;
    if (email === snapshotEmail) {
      const removed = snapshot.filter((p) => p.productId === productId);
      if (removed.length > 0) {
        removed.forEach((p) => seenIds.delete(p.id));
        snapshot = snapshot.filter((p) => p.productId !== productId);
        rebuildOwned();
        bumpAndEmit();
      }
    }
  },

  async transferOwnership(params) {
    // Atomic cross-user transfer via the Postgres RPC (SECURITY DEFINER,
    // idempotent on payment_ref). NEVER two client-side writes — the buyer's
    // client cannot legitimately delete the seller's row under RLS, and two
    // writes can partial-fail. The buyer's snapshot updates via the realtime
    // INSERT (do not double-insert locally); the seller's via realtime DELETE.
    const supabase = await getClient();
    const { error } = await supabase.rpc("transfer_ownership", {
      p_payment_ref: params.paymentRef,
      p_certificate_id: params.certificateId, // #2 verbatim
      p_product_id: params.productId,
      p_product_name: params.productName,
      p_buyer_email: params.buyerEmail,
      p_seller_email: params.sellerEmail,
      p_price: params.price,
      p_buyer_wallet: params.buyerWallet ?? null,
      p_product_image: params.productImage ?? null,
      p_product_desc: params.productDescription ?? null,
    });
    if (error) throw error;
    epoch += 1; // invalidate in-flight pre-transfer hydrate; realtime delivers rows
  },
};
