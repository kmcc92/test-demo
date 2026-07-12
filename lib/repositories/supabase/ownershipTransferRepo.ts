// Supabase-backed OWNERSHIP TRANSFERS repository — the Stage 6 append-only
// ownership transfer ledger + public-safe provenance read.
//
// SHAPE: append-only, one-to-many, ordered — the same family as the certificate
// events repo (certificateEventsRepo.ts is the canonical template). This module
// is the ONLY place the provenance snapshot exists:
//   - snapshot: Map<normalizedCertId, OwnershipTransferView[]>  (each array kept
//     sorted DESC by (transferred_at, payment_ref) — most-recent transfer first)
//   - seenIds: Set<paymentRef> — LOAD-BEARING dedupe key = payment_ref (the ledger
//     PK). Makes record() retries, RPC re-hydrate, and a 23505 duplicate insert
//     exactly-once.
//   - a monotonic version counter (bumped ONLY on a genuine new append)
//   - the in-flight hydration promise (idempotency)
//
// PRIVACY (CLAUDE.md): the snapshot holds ONLY the OwnershipTransferView public
// projection — NEVER buyer_email, seller_email, buyer_wallet, or payment_ref.
// The full private row (with emails/wallet) is persisted to the table but is
// never read back into memory here; this repo is the public provenance surface.
//
// READ PATH: like archiveRepo, the ledger is cross-user but its table SELECT is
// owner-scoped under RLS, so a direct `.from(...).select(...)` would return only
// the caller's own transfers. Public provenance therefore hydrates through the
// SECURITY DEFINER `ownership_provenance_public()` RPC (see
// supabase/ownership_transfers.sql), which bypasses RLS but projects ONLY the
// public-safe columns.
//
// REALTIME is DEFERRED (mirrors archiveRepo): the public RPC read cannot be
// mirrored by a table-level Realtime channel (Realtime honors the owner-scoped
// SELECT policy, so anon/other viewers would receive nothing), and provenance is
// not latency-sensitive. record() still bumps version + emits so a page mounted
// by the transacting user updates in place. version() is retained per the repo
// pattern for a future Realtime add.
//
// The Supabase client is lazily dynamic-imported (import-safety): merely
// importing this module never loads lib/supabase.ts, so the app/test import graph
// stays safe when Supabase env vars are absent.

import { emitDomainEvent } from "@/lib/domain-events";
import {
  buildOwnershipTransferRow,
  toOwnershipTransferView,
  type OwnershipTransferView,
} from "@/lib/ownership-transfers";
import type { SupabaseClient } from "@supabase/supabase-js";

const RPC = "ownership_provenance_public";

// The provenance RPC returns ONLY these public-safe columns — never email /
// wallet (enforced server-side by the function definition).
type ProvenanceRow = {
  certificate_id: string | null;
  product_name: string | null;
  price: number;
  transferred_at: string;
};

// record() input — camelCase mirror of the transfer flow's TransferParams.
export interface RecordTransferInput {
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

// ---- Private module-scoped state (snapshot lives here and NOWHERE else) ----

const snapshot = new Map<string, OwnershipTransferView[]>();
const seenIds = new Set<string>();
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

// Match lib/ownership-transfers.ts normalization exactly (trim + uppercase).
function normalizeId(certificateId: string): string {
  return certificateId.trim().toUpperCase();
}

// Canonical order: transferred_at DESC — newest transfer first (provenance
// surfaces read top-down).
function compareDesc(a: OwnershipTransferView, b: OwnershipTransferView): number {
  return new Date(b.transferredAt).getTime() - new Date(a.transferredAt).getTime();
}

// Append a KNOWN-persisted transfer (public projection only). Dedupe by
// payment_ref via seenIds: a duplicate is a true no-op (no append, no version
// bump, no emit). Only a genuine new append bumps version + emits.
function applyTransfer(paymentRef: string, view: OwnershipTransferView): void {
  if (seenIds.has(paymentRef)) return;
  seenIds.add(paymentRef);
  const key = normalizeId(view.certificateId);
  const arr = snapshot.get(key) ?? [];
  arr.push({ ...view, certificateId: key });
  arr.sort(compareDesc);
  snapshot.set(key, arr);
  currentVersion += 1;
  emitDomainEvent("ownership-transfers-changed");
}

async function doHydrate(): Promise<() => void> {
  const supabase = await getClient();

  // Cross-user provenance read through the SECURITY DEFINER RPC (bypasses the
  // owner-scoped table SELECT, public columns only). Rows arrive transferred_at
  // DESC (see the function).
  const { data, error } = await supabase.rpc(RPC);
  if (error) throw error;

  snapshot.clear();
  seenIds.clear();
  for (const row of (data ?? []) as ProvenanceRow[]) {
    const certId = (row.certificate_id ?? "").trim();
    if (!certId) continue;
    const key = normalizeId(certId);
    const view = toOwnershipTransferView({
      certificate_id: certId,
      product_name: row.product_name ?? "",
      price: Number(row.price),
      transferred_at: row.transferred_at,
    });
    const arr = snapshot.get(key) ?? [];
    arr.push(view);
    snapshot.set(key, arr);
  }
  currentVersion += 1;
  emitDomainEvent("ownership-transfers-changed");

  return dispose;
}

function dispose(): void {
  snapshot.clear();
  seenIds.clear();
  hydratePromise = null;
}

export interface OwnershipTransferSupabaseRepo {
  getByCertificate(certificateId: string): OwnershipTransferView[];
  list(): OwnershipTransferView[];
  record(input: RecordTransferInput): Promise<void>;
  hydrate(): Promise<() => void>;
  version(): number;
}

export const supabaseOwnershipTransferRepo: OwnershipTransferSupabaseRepo = {
  getByCertificate(certificateId) {
    if (!certificateId) return [];
    // Array is maintained sorted DESC on append; return a copy, never the ref.
    return (snapshot.get(normalizeId(certificateId)) ?? []).map((v) => ({ ...v }));
  },

  list() {
    const all: OwnershipTransferView[] = [];
    for (const arr of snapshot.values()) for (const v of arr) all.push({ ...v });
    return all;
  },

  async record(input) {
    // #3 payment reference required — a transfer is never ledgered without one.
    if (!input.paymentRef) {
      throw new Error("record requires a payment reference (paymentRef).");
    }

    // PERSIST FIRST (authoritative). The FULL private row (emails + wallet) is
    // written to the table; user_id is derived server-side by the buyer_email
    // trigger (never client-sent). transferred_at is captured once here so a
    // retry reuses it (idempotent on the payment_ref PK).
    const transferredAt = new Date().toISOString();
    const row = buildOwnershipTransferRow({
      certificateId: input.certificateId,
      paymentRef: input.paymentRef,
      productId: input.productId,
      productName: input.productName,
      buyerEmail: input.buyerEmail,
      sellerEmail: input.sellerEmail,
      price: input.price,
      buyerWallet: input.buyerWallet,
      productImage: input.productImage,
      productDescription: input.productDescription,
      transferredAt,
    });

    const supabase = await getClient();
    const { error } = await supabase.from("ownership_transfers").insert(row);
    // payment_ref is the PK: a 23505 duplicate is an idempotent success (the
    // transfer was already ledgered). Any OTHER error must NOT touch the snapshot.
    if (error && error.code !== "23505") throw error;

    // Update the snapshot only after the authoritative write succeeded, and only
    // with the PUBLIC projection (never the emails/wallet). seenIds makes this
    // exactly-once across a 23505 retry.
    applyTransfer(
      row.payment_ref,
      toOwnershipTransferView({
        certificate_id: row.certificate_id,
        product_name: row.product_name,
        price: row.price,
        transferred_at: row.transferred_at,
      })
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
