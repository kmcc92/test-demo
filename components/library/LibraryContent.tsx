"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { PRODUCTS, type LibraryEntry, type SaleRecord, type ServiceRecord } from "@/lib/mock-data";
import { getMerchantProductsByType, type MerchantProduct } from "@/lib/merchant-storage";
import { getCertificateStatus } from "@/lib/certificate-status";
import { useDomainSubscription } from "@/lib/use-domain-subscription";
import { formatPrice } from "@/lib/utils";
import { useOwnership } from "@/hooks/useOwnership";
import { useAuth } from "@/hooks/useAuth";
import type { PurchaseRecord } from "@/lib/purchase-storage";

// Returns the canonical product record for a library entry.
// Searches regular products first, then exclusive — matches PRODUCTS array order.
// Falls back to undefined when productId is absent (library-only archive entries).
function getSourceItem(productId: string | undefined) {
  if (!productId) return undefined;
  return PRODUCTS.find((p) => p.id === productId);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

// ── Price strip — shown on the card face ──────────────────────────────────

function PriceStrip({ entry, ownedPrice }: { entry: LibraryEntry; ownedPrice?: number }) {
  if (ownedPrice !== undefined) {
    return (
      <div className="absolute bottom-0 left-0 right-0 px-4 pt-10 pb-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-end justify-between gap-2">
          <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-white tabular-nums">
            {formatPrice(ownedPrice)}
          </span>
        </div>
      </div>
    );
  }

  const current = entry.salesHistory[0];
  const previous = entry.salesHistory[1];

  if (!current) {
    return (
      <div className="absolute bottom-0 left-0 right-0 px-4 pt-10 pb-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-end justify-between gap-2">
          <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-white tabular-nums">
            —
          </span>
        </div>
      </div>
    );
  }

  const pct = previous
    ? ((current.price - previous.price) / previous.price) * 100
    : null;
  const isUp = pct !== null && pct >= 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 px-4 pt-10 pb-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none">
      <div className="flex items-end justify-between gap-2">
        {/* Prices */}
        <div className="flex flex-col gap-0.5">
          {previous && (
            <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[rgba(255,255,255,0.35)] tabular-nums">
              {formatPrice(previous.price)}
            </span>
          )}
          <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-white tabular-nums">
            {formatPrice(current.price)}
          </span>
        </div>

        {/* Change indicator */}
        {pct !== null && (
          <div
            className={`flex items-center gap-1 shrink-0 ${
              isUp ? "text-emerald-400" : "text-red-400"
            }`}
          >
            <span className="text-sm leading-none">{isUp ? "↑" : "↓"}</span>
            <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] tabular-nums">
              {Math.abs(pct).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Provenance row — used inside the detail drawer ────────────────────────

function ProvenanceRow({
  sale,
  tag,
}: {
  sale: SaleRecord;
  tag?: "current" | "first";
}) {
  return (
    <div className="flex items-center py-3" style={{ borderTop: "1px solid #080808" }}>
      <span
        className="w-20 shrink-0 font-[family-name:var(--font-ibm-mono)] text-xs tabular-nums"
        style={{ color: "#080808" }}
      >
        {formatDate(sale.date)}
      </span>

      <span
        className={`flex-1 text-sm truncate pr-3 font-[family-name:var(--font-dm-sans)] ${
          sale.owner === "Private" ? "italic" : ""
        }`}
        style={{ color: "#080808" }}
      >
        {sale.owner}
      </span>

      <span
        className="font-[family-name:var(--font-ibm-mono)] text-sm tabular-nums font-medium shrink-0 mr-3"
        style={{ color: "#080808" }}
      >
        {formatPrice(sale.price)}
      </span>

      <span className="w-14 shrink-0 text-right">
        {tag === "current" && (
          <span
            className="text-[9px] tracking-[0.2em] uppercase font-[family-name:var(--font-dm-sans)] px-1.5 py-0.5"
            style={{ color: "#C9A84C", border: "1px solid #C9A84C" }}
          >
            Now
          </span>
        )}
        {tag === "first" && (
          <span
            className="text-[9px] tracking-[0.2em] uppercase font-[family-name:var(--font-dm-sans)]"
            style={{ color: "#080808" }}
          >
            First
          </span>
        )}
      </span>
    </div>
  );
}

// ── Detail drawer ─────────────────────────────────────────────────────────

function DetailDrawer({
  entry,
  onClose,
  reduced,
  ownedPurchase,
  userEmail,
}: {
  entry: LibraryEntry | null;
  onClose: () => void;
  reduced: boolean | null;
  ownedPurchase: PurchaseRecord | null;
  userEmail: string | null;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = entry ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [entry]);

  // The certificate ID to display: generated checkout cert when owned, static mock cert otherwise.
  const displayCertificateId = entry
    ? (ownedPurchase?.certificateId ?? entry.certificateId)
    : "";

  // Total transaction count includes the owned purchase row when present.
  const totalTransactions = entry
    ? entry.salesHistory.length + (ownedPurchase ? 1 : 0)
    : 0;

  function getTag(index: number, total: number): "current" | "first" | undefined {
    if (index === 0) return "current";
    if (index === total - 1 && total > 1) return "first";
    return undefined;
  }

  return (
    <AnimatePresence>
      {entry && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={reduced ? {} : { opacity: 0 }}
            animate={reduced ? {} : { opacity: 1 }}
            exit={reduced ? {} : { opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)" }}
          />

          {/* Panel */}
          <motion.aside
            key="drawer"
            initial={reduced ? {} : { x: "100%" }}
            animate={reduced ? {} : { x: 0 }}
            exit={reduced ? {} : { x: "100%" }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg flex flex-col overflow-y-auto"
            style={{ background: "#ffffff", borderLeft: "1px solid #080808" }}
          >
            {/* Image */}
            <div className="relative aspect-[4/3] flex-shrink-0 overflow-hidden" style={{ background: "#f0ede8" }}>
              <Image
                src={getSourceItem(entry.productId)?.images[0] ?? entry.image}
                alt={entry.name}
                fill
                className="object-cover"
                sizes="512px"
              />
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center transition-opacity duration-200 hover:opacity-70"
                style={{ background: "#ffffff", border: "1px solid #080808" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M1 1L11 11M11 1L1 11" stroke="#080808" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* All content below image */}
            <div className="flex flex-col flex-1 px-8 py-8" style={{ background: "#ffffff" }}>

              {/* Category */}
              <p
                className="text-[10px] tracking-[0.45em] uppercase font-[family-name:var(--font-dm-sans)]"
                style={{ color: "#080808" }}
              >
                {entry.category}
              </p>

              {/* Product name */}
              <h2
                className="mt-3 font-[family-name:var(--font-cormorant)] text-4xl leading-tight tracking-wide"
                style={{ color: "#080808", fontWeight: 600 }}
              >
                {entry.name}
              </h2>

              {/* Section divider */}
              <div className="mt-6" style={{ borderTop: "1px solid #080808" }} />

              {/* Certificate & authentication */}
              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)]"
                    style={{ color: "#080808" }}
                  >
                    Certificate
                  </span>
                  <span
                    className="font-[family-name:var(--font-ibm-mono)] text-xs"
                    style={{ color: "#080808" }}
                  >
                    {displayCertificateId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)]"
                    style={{ color: "#080808" }}
                  >
                    Status
                  </span>
                  <span
                    className="text-[10px] tracking-[0.25em] uppercase font-[family-name:var(--font-dm-sans)] px-2 py-0.5"
                    style={{ color: "#C9A84C", border: "1px solid #C9A84C" }}
                  >
                    Authenticated
                  </span>
                </div>
              </div>

              {/* Ownership banner */}
              {ownedPurchase && userEmail && (
                <div
                  className="mt-4 flex items-center justify-center gap-2 py-2.5"
                  style={{ border: "1px solid #C9A84C", background: "rgba(201,168,76,0.04)" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#C9A84C" }} />
                  <span
                    className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)]"
                    style={{ color: "#C9A84C" }}
                  >
                    You Own This Piece
                  </span>
                </div>
              )}

              {/* Section divider */}
              <div className="mt-6" style={{ borderTop: "1px solid #080808" }} />

              {/* Description */}
              <p
                className="mt-6 text-sm font-[family-name:var(--font-dm-sans)] leading-relaxed"
                style={{ color: "#080808" }}
              >
                {entry.description}
              </p>

              {/* Section divider */}
              <div className="mt-8" style={{ borderTop: "1px solid #080808" }} />

              {/* Provenance heading — count includes owned row */}
              <div className="mt-6 flex items-baseline gap-3">
                <p
                  className="text-[10px] tracking-[0.45em] uppercase font-[family-name:var(--font-dm-sans)] font-semibold"
                  style={{ color: "#080808" }}
                >
                  Provenance Record
                </p>
                <span
                  className="font-[family-name:var(--font-ibm-mono)] text-[10px]"
                  style={{ color: "#080808" }}
                >
                  {totalTransactions}{" "}
                  {totalTransactions === 1 ? "transaction" : "transactions"}
                </span>
              </div>

              {/* Column headings */}
              <div
                className="flex items-center mt-4 pb-2"
                style={{ borderBottom: "1px solid #080808" }}
              >
                <span
                  className="w-20 shrink-0 text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)]"
                  style={{ color: "#080808" }}
                >
                  Date
                </span>
                <span
                  className="flex-1 text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)]"
                  style={{ color: "#080808" }}
                >
                  Owner
                </span>
                <span
                  className="shrink-0 mr-3 text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)]"
                  style={{ color: "#080808" }}
                >
                  Price
                </span>
                <span className="w-14 shrink-0" />
              </div>

              {/* Owned purchase row — most recent, prepended above mock history */}
              {ownedPurchase && userEmail && (
                <ProvenanceRow
                  sale={{
                    date: ownedPurchase.purchasedAt.slice(0, 10),
                    price: ownedPurchase.price,
                    owner: userEmail,
                  }}
                  tag="current"
                />
              )}

              {/* Original mock provenance — immutable, unchanged underneath */}
              {entry.salesHistory.map((sale, i) => {
                const adjustedTag = ownedPurchase
                  ? (i === entry.salesHistory.length - 1 && entry.salesHistory.length > 0
                    ? "first"
                    : undefined)
                  : getTag(i, entry.salesHistory.length);
                return (
                  <ProvenanceRow
                    key={sale.date + i}
                    sale={sale}
                    tag={adjustedTag}
                  />
                );
              })}

              {/* Service History */}
              {entry.serviceHistory && entry.serviceHistory.length > 0 && (
                <>
                  <div className="mt-8" style={{ borderTop: "1px solid #080808" }} />
                  <div className="mt-6 mb-2">
                    <p
                      className="text-[10px] tracking-[0.45em] uppercase font-[family-name:var(--font-dm-sans)] font-semibold mb-4"
                      style={{ color: "#080808" }}
                    >
                      Service History
                    </p>
                    {entry.serviceHistory.map((record, i) => (
                      <div
                        key={record.id}
                        className="py-3"
                        style={{ borderTop: `1px solid ${i === 0 ? "#080808" : "rgba(0,0,0,0.1)"}` }}
                      >
                        <div className="flex items-baseline justify-between mb-1">
                          <span
                            className="text-[10px] tracking-[0.2em] uppercase font-[family-name:var(--font-dm-sans)]"
                            style={{ color: "#080808" }}
                          >
                            {record.type}
                          </span>
                          <span
                            className="font-[family-name:var(--font-ibm-mono)] text-[10px] tabular-nums shrink-0 ml-3"
                            style={{ color: "#8A8A8A" }}
                          >
                            {formatDate(record.date)}
                          </span>
                        </div>
                        <p
                          className="text-[10px] font-[family-name:var(--font-dm-sans)] mb-1.5"
                          style={{ color: "#8A8A8A" }}
                        >
                          {record.performedBy}
                        </p>
                        <p
                          className="text-xs font-[family-name:var(--font-dm-sans)] leading-relaxed"
                          style={{ color: "#3A3A3A" }}
                        >
                          {record.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Library grid card ─────────────────────────────────────────────────────

function LibraryCard({
  entry,
  index,
  isOwned,
  onClick,
  reduced,
  ownedPrice,
}: {
  entry: LibraryEntry;
  index: number;
  isOwned: boolean;
  onClick: () => void;
  reduced: boolean | null;
  ownedPrice?: number;
}) {
  const [shimmer, setShimmer] = useState(false);
  // Initialize to current isOwned so navigating back to library doesn't re-shimmer.
  const prevOwnedRef = useRef(isOwned);

  useEffect(() => {
    if (isOwned && !prevOwnedRef.current) {
      setShimmer(true);
      prevOwnedRef.current = true;
    }
    if (!isOwned) {
      prevOwnedRef.current = false;
    }
  }, [isOwned]);

  return (
    <motion.button
      onClick={onClick}
      initial={reduced ? {} : { opacity: 0, y: 16 }}
      whileInView={reduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.28), ease: "easeOut" }}
      whileHover={reduced ? {} : { scale: 1.02 }}
      className="relative aspect-[3/4] overflow-hidden bg-[var(--bg-dark-secondary)] group cursor-pointer text-left"
      aria-label={`View ${entry.name}`}
      style={isOwned ? { outline: "1px solid #C9A84C" } : undefined}
    >
      <Image
        src={getSourceItem(entry.productId)?.images[0] ?? entry.image}
        alt={entry.name}
        fill
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
      />

      {/* Transient shimmer border — fires once on ownership acquisition, 1.5s only */}
      {shimmer && !reduced && (
        <motion.div
          animate={{ opacity: [0, 1, 0.7, 0] }}
          transition={{ duration: 1.5, ease: "easeInOut", times: [0, 0.2, 0.6, 1] }}
          onAnimationComplete={() => setShimmer(false)}
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: "inset 0 0 0 2px rgba(201,168,76,0.9), inset 0 0 24px rgba(201,168,76,0.25)",
          }}
        />
      )}

      {/* AUTHENTICATED badge — fades in when owned */}
      <AnimatePresence>
        {isOwned && (
          <motion.div
            key="auth-badge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute top-2 left-2 z-10"
          >
            <span
              className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] px-2 py-0.5"
              style={{ color: "#C9A84C", border: "1px solid #C9A84C", background: "rgba(8,8,8,0.7)" }}
            >
              Authenticated
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Owned badge */}
      {isOwned && (
        <div className="absolute top-2 right-2 z-10">
          <span
            className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] px-2 py-0.5"
            style={{ color: "#C9A84C", border: "1px solid #C9A84C", background: "rgba(8,8,8,0.7)" }}
          >
            Owned
          </span>
        </div>
      )}

      {/* NOT FOR SALE badge — archive-only entries (no productId) */}
      {!entry.productId && !isOwned && (
        <div className="absolute top-2 right-2 z-10">
          <span
            className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] px-2 py-0.5"
            style={{ color: "#ffffff", border: "1px solid rgba(255,255,255,0.5)", background: "rgba(8,8,8,0.75)" }}
          >
            Not For Sale
          </span>
        </div>
      )}

      {/* Hover reveal — subtle gold ring */}
      <div className="absolute inset-0 ring-inset ring-1 ring-[var(--gold)] opacity-0 group-hover:opacity-30 transition-opacity duration-300" />

      <PriceStrip entry={entry} ownedPrice={ownedPrice} />
    </motion.button>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function LibraryContent() {
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<LibraryEntry | null>(null);
  const { purchases } = useOwnership();
  const { user } = useAuth();

  const userEmail = user?.email ?? null;

  const [merchantProducts, setMerchantProducts] = useState<MerchantProduct[]>([]);

  // Certificate status overlay is client-only (lib/certificate-status.ts returns
  // "active" on the server). `mounted` forces a re-filter after hydration so the
  // status-based exclusion below takes effect — a brief flicker for stolen/lost
  // items on first paint is expected and acceptable.
  const [mounted, setMounted] = useState(false);

  const certificateStatusVersion = useDomainSubscription(
    "certificate-status-changed",
    () => Date.now()
  );

  useEffect(() => {
    setMerchantProducts(getMerchantProductsByType("exclusive"));
    setMounted(true);
  }, []);

  const merchantLibraryEntries = useMemo<LibraryEntry[]>(
    () =>
      merchantProducts.map((m) => ({
        id: `lib-merchant-${m.id}`,
        productId: m.id,
        name: m.name,
        certificateId: m.certificateId ?? "",
        image: m.image,
        salesHistory: [] as SaleRecord[],
        serviceHistory: [] as ServiceRecord[],
        description: m.description,
        category: "accessories",
      })),
    [merchantProducts]
  );

  // Purchases with a certificateId are exclusive-type; shop purchases have no certificateId.
  const eligiblePurchases = useMemo(
    () => purchases.filter(
      (p) => typeof p.certificateId === "string" && p.certificateId.length > 0
    ),
    [purchases]
  );

  // Library entries derived strictly from real purchases — most recent
  // purchase per product wins (per PURCHASE RESOLUTION RULE).
  const purchaseLibraryEntries = useMemo<LibraryEntry[]>(() => {
    const latestByProduct = new Map<string, PurchaseRecord>();
    eligiblePurchases.forEach((p) => {
      if (!p.productId) return;
      const existing = latestByProduct.get(p.productId);
      if (!existing || new Date(p.purchasedAt).getTime() > new Date(existing.purchasedAt).getTime()) {
        latestByProduct.set(p.productId, p);
      }
    });
    return Array.from(latestByProduct.entries()).map(([productId, purchase]) => {
      const source = getSourceItem(productId);
      return {
        id: `lib-purchase-${purchase.id}`,
        productId,
        name: purchase.productName,
        description: source?.description ?? "",
        category: source?.category ?? "accessories",
        image: source?.images[0] ?? "",
        certificateId: purchase.certificateId,
        salesHistory: [] as SaleRecord[],
        serviceHistory: [] as ServiceRecord[],
      };
    });
  }, [eligiblePurchases]);

  const displayEntries = useMemo(
    () => [...purchaseLibraryEntries, ...merchantLibraryEntries],
    [purchaseLibraryEntries, merchantLibraryEntries]
  );

  // Archive entries without a productId are always shown; entries with a productId
  // are shown only when they come from the known library layers (purchase-derived or merchant).
  // Additionally, entries whose certificate has been reported stolen/lost (status overlay,
  // lib/certificate-status.ts) are excluded — this is the sole place that filter is applied.
  const filteredEntries = useMemo(
    () =>
      displayEntries.filter((e) => {
        if (!e.productId) return true;
        if (e.certificateId.length === 0) return false;
        const status = getCertificateStatus(e.certificateId);
        return status !== "stolen" && status !== "lost";
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayEntries, mounted, certificateStatusVersion]
  );

  // Derive ownership map from eligible purchases only.
  // productId → purchase record (first/most recent purchase per product).
  // Recomputes reactively on purchase or logout — no manual sync needed.
  const ownedByProductId = useMemo(() => {
    const map = new Map<string, PurchaseRecord>();
    eligiblePurchases.forEach((p) => {
      if (p.productId && !map.has(p.productId)) {
        map.set(p.productId, p);
      }
    });
    return map;
  }, [eligiblePurchases]);

  // Derive the most recent valid purchase for the selected entry.
  // Filters by productId, then selects the highest purchasedAt timestamp via reduce.
  // Price sourced exclusively from purchase.price — no mock-data or product price used.
  const ownedPurchase = useMemo(() => {
    if (!selected?.productId) return null;
    const matching = eligiblePurchases.filter(
      (p) =>
        p.productId === selected.productId &&
        typeof p.purchasedAt === "string" &&
        p.purchasedAt.length > 0
    );
    if (matching.length === 0) return null;
    return matching.reduce<PurchaseRecord>(
      (best, p) => (p.purchasedAt > best.purchasedAt ? p : best),
      matching[0]
    );
  }, [selected, eligiblePurchases]);

  return (
    <div className="min-h-full bg-[var(--bg-dark)] flex-1">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-8 pt-16 pb-14 border-b border-[var(--border-on-dark)]">
        <p className="text-[10px] tracking-[0.45em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)] mb-5">
          Authentication Archive
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-6xl md:text-7xl font-light text-[var(--text-primary)] tracking-wide mb-6">
          Library
        </h1>
        <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--on-dark-muted)] max-w-xl leading-relaxed">
          A permanent record of every piece to pass through the TEST authentication
          protocol. Click any piece to view provenance.
        </p>

      </div>

      {/* Card grid */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredEntries.map((entry, i) => {
            const owned = !!(entry.productId && ownedByProductId.has(entry.productId));
            const matches = eligiblePurchases.filter((p) => p.productId === entry.productId);
            let cardOwnedPrice: number | undefined;
            if (matches.length > 0) {
              const maxTimestamp = Math.max(
                ...matches.map((p) => new Date(p.purchasedAt).getTime())
              );
              const best = matches.find(
                (p) => new Date(p.purchasedAt).getTime() === maxTimestamp
              );
              cardOwnedPrice = best?.price;
            }
            return (
              <LibraryCard
                key={entry.id}
                entry={entry}
                index={i}
                isOwned={owned}
                onClick={() => setSelected(entry)}
                reduced={reduced}
                ownedPrice={cardOwnedPrice}
              />
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-8 pb-16 border-t border-[var(--border-on-dark)] pt-8">
        <p className="text-[10px] font-[family-name:var(--font-ibm-mono)] text-[var(--on-dark-subtle)] leading-relaxed max-w-xl">
          All entries are sealed on the Polygon network and cannot be altered.
          Each certificate ID is a permanent, on-chain record of ownership and provenance.
        </p>
      </div>

      {/* Detail drawer */}
      <DetailDrawer
        entry={selected}
        onClose={() => setSelected(null)}
        reduced={reduced}
        ownedPurchase={ownedPurchase}
        userEmail={userEmail}
      />
    </div>
  );
}
