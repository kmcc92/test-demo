// Supabase-backed MARKETPLACE LISTINGS repository — persisted peer-to-peer resale
// listings. This is Step 10a: LISTINGS PERSISTENCE ONLY.
//
// SCOPE BOUNDARY — bids are OUT OF SCOPE (Step 10b). The real
// marketplace_listings table has NO bid_history column; individual bids live in
// the separate marketplace_bids table, which this step does not touch. So this
// repo owns ONLY the persisted listing SCALARS. The running per-listing bid list
// (bidHistory) remains a SESSION overlay owned by MarketplaceContext and is
// composed on top of these persisted rows at read time. Until bids migrate, rows
// returned here always carry bidHistory: [] and the persisted current_bid (which
// starts at the reserve and is not raised by session bids). See
// contexts/MarketplaceContext.tsx for the compose step.
//
// GLOBAL public data: reuse the merchant-products pattern (module-scoped Map
// snapshot, lifecycle provider, hydrate-once, realtime keeps it fresh). NO
// user-scoping, NO epoch guard, NO privacy machinery.
//
// SECURITY (Step 10b Auth + Step 10c RLS): auth is REAL and RLS is ON. Listings
// are PUBLIC read (the storefront is browsable logged-out). INSERT is scoped
// server-side to the seller (lower(seller_email) = auth email). UPDATE is open to
// any authenticated user BY DESIGN — the status lifecycle (active→ended/sold) is
// finalized by the winning BUYER (mark sold) and by any VIEWER (settle→ended on
// expiry), not the seller. See supabase/rls_policies.sql.
//
// Real schema (introspected): marketplace_listings(id text PK, product_id text,
// product_name text, certificate_id text FK→certificates.certificate_id, image
// text, seller_email text, seller_wallet text, buy_now_price integer, reserve_price
// integer, current_bid integer, minimum_increment integer, ends_at timestamptz,
// condition text, status text, created_at timestamptz). NOTE: the TS model has
// three fields with NO column — bidHistory (→ marketplace_bids, out of scope),
// provenanceDepth and serviceHistoryCount (display-only, hardcoded 1/0 at
// creation). Those are reconstructed as constants on read. Prices persist as
// integers (Math.round on write — matches the integer columns).
//
// CRUD/global → dedup is Map REPLACEMENT keyed by listing id. Realtime handles
// INSERT/UPDATE/DELETE; own-write echoes are idempotent via a field-equality no-op.
//
// Lazy dynamic-import of the supabase client (Step 4 import-safety).

import { emitDomainEvent } from "@/lib/domain-events";
import type { MarketplaceListing } from "@/lib/marketplace-types";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

const TABLE = "marketplace_listings";
const COLUMNS =
  "id, product_id, product_name, certificate_id, image, seller_email, seller_wallet, buy_now_price, reserve_price, current_bid, minimum_increment, ends_at, condition, status, created_at";

// Fields with no column — display-only, and the ONLY values ever created
// (CreateListingModal hardcodes provenanceDepth: 1, serviceHistoryCount: 0).
const DEFAULT_PROVENANCE_DEPTH = 1;
const DEFAULT_SERVICE_HISTORY_COUNT = 0;

type ListingStatus = MarketplaceListing["status"];

type ListingRow = {
  id: string;
  product_id: string;
  product_name: string;
  certificate_id: string;
  image: string;
  seller_email: string;
  seller_wallet: string;
  buy_now_price: number | null;
  reserve_price: number;
  current_bid: number;
  minimum_increment: number;
  ends_at: string;
  condition: string;
  status: string;
  created_at: string;
};

// ---- Private module-scoped state (GLOBAL listings snapshot) ----

const snapshot = new Map<string, MarketplaceListing>();
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

function normalizeStatus(status: string): ListingStatus {
  return status === "sold" ? "sold" : status === "ended" ? "ended" : "active";
}

// Persisted scalars → MarketplaceListing. bidHistory is always [] here (bids are
// a separate table + a session overlay composed by MarketplaceContext);
// provenanceDepth / serviceHistoryCount are reconstructed constants.
function rowToListing(row: ListingRow): MarketplaceListing {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    certificateId: row.certificate_id,
    image: row.image,
    sellerEmail: row.seller_email,
    sellerWallet: row.seller_wallet,
    reservePrice: Number(row.reserve_price),
    buyNowPrice: row.buy_now_price != null ? Number(row.buy_now_price) : undefined,
    currentBid: Number(row.current_bid),
    minimumIncrement: Number(row.minimum_increment),
    endsAt: row.ends_at,
    condition: row.condition,
    bidHistory: [],
    provenanceDepth: DEFAULT_PROVENANCE_DEPTH,
    serviceHistoryCount: DEFAULT_SERVICE_HISTORY_COUNT,
    status: normalizeStatus(row.status),
  };
}

// Only the persisted scalars are written — bidHistory / provenanceDepth /
// serviceHistoryCount have no column and are intentionally dropped. Prices round
// to integers to match the integer columns.
function listingToInsertRow(listing: MarketplaceListing): ListingRow {
  return {
    id: listing.id,
    product_id: listing.productId,
    product_name: listing.productName,
    certificate_id: listing.certificateId, // FK verbatim — never generated
    image: listing.image,
    seller_email: listing.sellerEmail,
    seller_wallet: listing.sellerWallet,
    buy_now_price: listing.buyNowPrice != null ? Math.round(listing.buyNowPrice) : null,
    reserve_price: Math.round(listing.reservePrice),
    current_bid: Math.round(listing.currentBid),
    minimum_increment: Math.round(listing.minimumIncrement),
    ends_at: listing.endsAt,
    condition: listing.condition,
    status: listing.status,
    created_at: new Date().toISOString(),
  };
}

// Compare persisted scalars (bidHistory/provenance/service are reconstructed
// constants and never differ between two rows). An echo that changes nothing
// observable is a no-op.
function sameListing(a: MarketplaceListing, b: MarketplaceListing): boolean {
  return (
    a.id === b.id &&
    a.productId === b.productId &&
    a.productName === b.productName &&
    a.certificateId === b.certificateId &&
    a.image === b.image &&
    a.sellerEmail === b.sellerEmail &&
    a.sellerWallet === b.sellerWallet &&
    a.reservePrice === b.reservePrice &&
    a.buyNowPrice === b.buyNowPrice &&
    a.currentBid === b.currentBid &&
    a.minimumIncrement === b.minimumIncrement &&
    a.endsAt === b.endsAt &&
    a.condition === b.condition &&
    a.status === b.status
  );
}

// Upsert into the snapshot. id is immutable on UPDATE. Bumps version + emits
// ONLY on observable change (own-write echoes / identical realtime = no-op).
function applyListing(listing: MarketplaceListing): void {
  const existing = snapshot.get(listing.id);
  if (existing && sameListing(existing, listing)) return;
  snapshot.set(listing.id, { ...listing, id: existing?.id ?? listing.id });
  currentVersion += 1;
  emitDomainEvent("marketplace-listings-changed");
}

function removeListing(id: string): void {
  if (!snapshot.has(id)) return; // missing id = idempotent no-op
  snapshot.delete(id);
  currentVersion += 1;
  emitDomainEvent("marketplace-listings-changed");
}

async function doHydrate(): Promise<() => void> {
  const supabase = await getClient();

  // hydrate() REPLACES the whole snapshot before reopening realtime.
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw error;

  snapshot.clear();
  for (const row of (data ?? []) as ListingRow[]) {
    const listing = rowToListing(row);
    snapshot.set(listing.id, listing);
  }
  currentVersion += 1;
  emitDomainEvent("marketplace-listings-changed");

  // GLOBAL realtime — unfiltered (public listings). CRUD: INSERT (new listing),
  // UPDATE (status active→ended / active→sold), DELETE (robustness; the app has
  // no delete path, but a DELETE echo stays idempotent).
  realtimeChannel = supabase
    .channel("marketplace-listings")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABLE },
      (payload) => {
        const row = payload.new as unknown as ListingRow;
        if (row && row.id) applyListing(rowToListing(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: TABLE },
      (payload) => {
        const row = payload.new as unknown as ListingRow;
        if (row && row.id) applyListing(rowToListing(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: TABLE },
      (payload) => {
        const old = payload.old as unknown as Partial<ListingRow>;
        if (old && old.id) removeListing(old.id);
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

export interface MarketplaceSupabaseRepo {
  getAll(): MarketplaceListing[];
  getById(id: string): MarketplaceListing | null;
  getByProductId(productId: string): MarketplaceListing | null;
  create(listing: MarketplaceListing): Promise<void>;
  setStatus(id: string, status: ListingStatus): Promise<void>;
  hydrate(): Promise<() => void>;
  dispose(): void;
  version(): number;
}

export const supabaseMarketplaceRepo: MarketplaceSupabaseRepo = {
  getAll() {
    return Array.from(snapshot.values()).map((l) => ({ ...l }));
  },

  getById(id) {
    const l = snapshot.get(id);
    return l ? { ...l } : null;
  },

  getByProductId(productId) {
    for (const l of snapshot.values()) {
      if (l.productId === productId) return { ...l };
    }
    return null;
  },

  async create(listing) {
    const supabase = await getClient();
    const { error } = await supabase.from(TABLE).insert(listingToInsertRow(listing));
    if (error) {
      if (error.code === "23505") {
        // Duplicate id (retry). Idempotent success: fetch + apply canonical row.
        const { data } = await supabase
          .from(TABLE)
          .select(COLUMNS)
          .eq("id", listing.id)
          .maybeSingle();
        if (data) {
          applyListing(rowToListing(data as ListingRow));
          return;
        }
      }
      throw error; // e.g. 23503 FK (unregistered cert) — surface, no phantom state
    }
    applyListing(listing);
  },

  async setStatus(id, status) {
    // The ONLY post-create listing mutation (active→ended / active→sold).
    const supabase = await getClient();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ status })
      .eq("id", id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (data) applyListing(rowToListing(data as ListingRow));
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

  dispose,

  version() {
    return currentVersion;
  },
};
