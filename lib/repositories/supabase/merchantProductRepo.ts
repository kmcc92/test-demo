// Supabase-backed MERCHANT PRODUCTS repository — global, mutable public CATALOG.
//
// GLOBAL public data: reuse the certificate-registry pattern (module-scoped
// snapshot, lifecycle provider, hydrate-once, realtime keeps it fresh). NO
// user-scoping, NO epoch guard, NO privacy machinery — unlike purchases. The
// catalog is CATALOG only: never ownership, never purchase artifacts, never
// certificate state (those are distinct domains).
//
// This module is the ONLY place the catalog snapshot exists:
//   - snapshot: Map<productId, MerchantProduct>  (FLAT, keyed by id)
//   - version: monotonic, bumped only on observable change
//   - realtime channel (GLOBAL — unfiltered; the catalog is public)
//
// Real schema (introspected): merchant_products(id text PK, merchant_id text,
// type text, name text, price integer, description text, image text, category
// text, certificate_id text, created_at timestamptz). NO updated_at column.
// Map: merchantEmail -> merchant_id (multi-tenant groundwork; never hardcode a
// single merchant), createdAt -> created_at, certificateId -> certificate_id.
//
// Lazy dynamic-import of the supabase client (Step 4 import-safety).

import { emitDomainEvent } from "@/lib/domain-events";
import type { MerchantProduct } from "@/lib/merchant-storage";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

const TABLE = "merchant_products";
const COLUMNS =
  "id, merchant_id, type, name, price, description, image, category, certificate_id, created_at";

// Mirror lib/merchant-storage.ts reserved ids (from the deprecated mock catalog).
const RESERVED_CERTIFICATE_IDS = ["TEST-GOLD-001", "TEST-GOLD-002"];

type ProductRow = {
  id: string;
  merchant_id: string | null;
  type: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string | null;
  certificate_id: string | null;
  created_at: string;
};

// ---- Private module-scoped state (GLOBAL catalog) ----

const snapshot = new Map<string, MerchantProduct>();
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

function rowToProduct(row: ProductRow): MerchantProduct {
  return {
    id: row.id,
    type: row.type === "exclusive" ? "exclusive" : "shop",
    name: row.name,
    description: row.description,
    price: Number(row.price),
    image: row.image,
    category: row.category ?? undefined,
    certificateId: row.certificate_id ?? undefined,
    createdAt: row.created_at,
    merchantEmail: row.merchant_id ?? "",
  };
}

function productToInsertRow(product: MerchantProduct) {
  return {
    id: product.id,
    merchant_id: product.merchantEmail, // merchantEmail -> merchant_id (no hardcode)
    type: product.type,
    name: product.name,
    price: product.price,
    description: product.description,
    image: product.image,
    category: product.category ?? null,
    certificate_id: product.certificateId ?? null, // #1 verbatim; never generated
    created_at: product.createdAt,
  };
}

// Compare only the MUTABLE presentation fields — id/certificateId/type are
// immutable, so an echo that changes nothing observable is a no-op.
function mutablyEqual(a: MerchantProduct, b: MerchantProduct): boolean {
  return (
    a.name === b.name &&
    a.price === b.price &&
    a.description === b.description &&
    a.image === b.image &&
    a.category === b.category &&
    a.type === b.type
  );
}

// Upsert into the snapshot. On an UPDATE of an existing row, id + certificateId
// are IMMUTABLE — never let an UPDATE payload mutate them. Bumps version + emits
// ONLY on observable change (own-write echoes / identical realtime = no-op).
function applyProduct(product: MerchantProduct): void {
  const existing = snapshot.get(product.id);
  if (existing) {
    if (mutablyEqual(existing, product)) return;
    snapshot.set(product.id, {
      ...product,
      id: existing.id,
      certificateId: existing.certificateId, // immutable
    });
  } else {
    snapshot.set(product.id, { ...product });
  }
  currentVersion += 1;
  emitDomainEvent("merchant-products-changed");
}

function removeProduct(id: string): void {
  if (!snapshot.has(id)) return; // missing id = idempotent no-op
  snapshot.delete(id);
  currentVersion += 1;
  emitDomainEvent("merchant-products-changed");
}

async function doHydrate(): Promise<() => void> {
  const supabase = await getClient();

  // hydrate() REPLACES the whole snapshot before reopening realtime — never
  // merges stale data.
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw error;

  snapshot.clear();
  for (const row of (data ?? []) as ProductRow[]) {
    const product = rowToProduct(row);
    snapshot.set(product.id, product);
  }
  currentVersion += 1;
  emitDomainEvent("merchant-products-changed");

  // GLOBAL realtime — unfiltered (public catalog, no privacy concern).
  // UPDATE CONFLICT MODEL: no updated_at column → edits are client last-write-
  // wins, full-row overwrite; realtime UPDATE replaces the row. Single-merchant
  // has no concurrent edits and all clients converge to the last DB write.
  // FLAG — Phase 7 (multiple designers) should add `updated_at` PLUS optimistic
  // concurrency / stale-write detection.
  realtimeChannel = supabase
    .channel("merchant-products")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABLE },
      (payload) => {
        const row = payload.new as unknown as ProductRow;
        if (row && row.id) applyProduct(rowToProduct(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: TABLE },
      (payload) => {
        const row = payload.new as unknown as ProductRow;
        if (row && row.id) applyProduct(rowToProduct(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: TABLE },
      (payload) => {
        const old = payload.old as unknown as Partial<ProductRow>;
        if (old && old.id) removeProduct(old.id);
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

export type MerchantProductUpdate = Partial<
  Pick<MerchantProduct, "name" | "description" | "price" | "image" | "category">
>;

export interface MerchantProductSupabaseRepo {
  getAll(): MerchantProduct[];
  getByType(type: "shop" | "exclusive"): MerchantProduct[];
  getById(id: string): MerchantProduct | null;
  isCertificateIdTaken(certificateId: string, excludeProductId?: string): boolean;
  create(product: MerchantProduct): Promise<void>;
  update(id: string, updates: MerchantProductUpdate): Promise<void>;
  delete(id: string): Promise<void>;
  hydrate(): Promise<() => void>;
  version(): number;
}

export const supabaseMerchantProductRepo: MerchantProductSupabaseRepo = {
  getAll() {
    return Array.from(snapshot.values()).map((p) => ({ ...p }));
  },

  getByType(type) {
    return Array.from(snapshot.values())
      .filter((p) => p.type === type)
      .map((p) => ({ ...p }));
  },

  getById(id) {
    const p = snapshot.get(id);
    return p ? { ...p } : null;
  },

  isCertificateIdTaken(certificateId, excludeProductId) {
    const normalized = certificateId.trim().toUpperCase();
    if (RESERVED_CERTIFICATE_IDS.some((id) => id.toUpperCase() === normalized)) {
      return true;
    }
    for (const p of snapshot.values()) {
      if (
        p.id !== excludeProductId &&
        p.certificateId &&
        p.certificateId.toUpperCase() === normalized
      ) {
        return true;
      }
    }
    return false;
  },

  async create(product) {
    const supabase = await getClient();
    const { error } = await supabase.from(TABLE).insert(productToInsertRow(product));
    if (error) {
      if (error.code === "23505") {
        // Duplicate id. Treat as idempotent success ONLY if it is the SAME
        // logical product (same id + same certificate_id); otherwise surface
        // the id collision — never silently mask it.
        const { data } = await supabase
          .from(TABLE)
          .select(COLUMNS)
          .eq("id", product.id)
          .maybeSingle();
        const row = data as ProductRow | null;
        if (row && (row.certificate_id ?? null) === (product.certificateId ?? null)) {
          applyProduct(rowToProduct(row));
          return;
        }
        throw error;
      }
      throw error;
    }
    applyProduct(product);
  },

  async update(id, updates) {
    // Sanitize to mutable presentation fields only — reject certificateId and
    // type changes (mirrors lib/merchant-storage.ts sanitization; identity and
    // type are immutable after creation).
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.price !== undefined) patch.price = updates.price;
    if (updates.image !== undefined) patch.image = updates.image;
    if (updates.category !== undefined) patch.category = updates.category;
    if (Object.keys(patch).length === 0) return;

    const supabase = await getClient();
    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq("id", id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (data) applyProduct(rowToProduct(data as ProductRow));
  },

  async delete(id) {
    // Deletion touches ONLY merchant_products — never purchases, never the
    // certificate registry (invariant #7; FK-verified: no cascade reaches them).
    const supabase = await getClient();
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
    removeProduct(id);
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
