"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  getArchiveEntries,
  hydrateArchive,
  type ArchiveEntry,
} from "@/lib/repositories";
import { formatPrice } from "@/lib/utils";
import { useOwnership } from "@/hooks/useOwnership";

// /library is the permanent PUBLIC ARCHIVE of authenticated SOLD pieces — every
// purchase with a certificate, deduped to the current owner, read GLOBALLY via
// the ArchiveEntry view model. Owner identity is NEVER shown (anonymous
// "verified collector"); an "owned by you" badge is computed CLIENT-SIDE from
// the current user's own scoped snapshot. Privacy is UX-only until RLS + real
// auth (see archiveRepo header). This is NOT the merchant catalog and NOT the
// user's private collection (that is /collection).

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

// ── Grid card ──────────────────────────────────────────────────────────────

function ArchiveCard({
  entry,
  owned,
  index,
  onClick,
  reduced,
}: {
  entry: ArchiveEntry;
  owned: boolean;
  index: number;
  onClick: () => void;
  reduced: boolean | null;
}) {
  const reported = entry.status === "stolen" || entry.status === "lost";
  return (
    <motion.button
      onClick={onClick}
      initial={reduced ? {} : { opacity: 0, y: 16 }}
      whileInView={reduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.28), ease: "easeOut" }}
      whileHover={reduced ? {} : { scale: 1.02 }}
      className="relative aspect-[3/4] overflow-hidden bg-[var(--bg-dark-secondary)] group cursor-pointer text-left"
      aria-label={`View ${entry.productName}`}
      style={owned ? { outline: "1px solid #C9A84C" } : undefined}
    >
      {entry.image ? (
        <Image
          src={entry.image}
          alt={entry.productName}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: "#111" }} />
      )}

      {/* Authenticated badge (from certificate registry existence) */}
      {entry.authenticated && (
        <div className="absolute top-2 left-2 z-10">
          <span
            className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] px-2 py-0.5"
            style={{ color: "#C9A84C", border: "1px solid #C9A84C", background: "rgba(8,8,8,0.7)" }}
          >
            ✓ Authenticated
          </span>
        </div>
      )}

      {/* Owned-by-you badge (client-side, no identity) */}
      {owned && (
        <div className="absolute top-2 right-2 z-10">
          <span
            className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] px-2 py-0.5"
            style={{ color: "#C9A84C", border: "1px solid #C9A84C", background: "rgba(8,8,8,0.7)" }}
          >
            Owned by You
          </span>
        </div>
      )}

      {/* Stolen / lost status badge (separate concept from authentication) */}
      {reported && (
        <div className="absolute bottom-2 left-2 z-10">
          <span
            className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] px-2 py-0.5"
            style={{ color: "#e5484d", border: "1px solid #e5484d", background: "rgba(8,8,8,0.75)" }}
          >
            Reported {entry.status}
          </span>
        </div>
      )}

      {/* Price + sold date */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pt-10 pb-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-end justify-between gap-2">
          <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-white tabular-nums">
            {formatPrice(entry.price)}
          </span>
          <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[rgba(255,255,255,0.5)] tabular-nums">
            {formatDate(entry.soldDate)}
          </span>
        </div>
      </div>

      <div className="absolute inset-0 ring-inset ring-1 ring-[var(--gold)] opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
    </motion.button>
  );
}

// ── Detail drawer (public fields only) ─────────────────────────────────────

function DetailDrawer({
  entry,
  owned,
  onClose,
  reduced,
}: {
  entry: ArchiveEntry | null;
  owned: boolean;
  onClose: () => void;
  reduced: boolean | null;
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

  const reported = entry?.status === "stolen" || entry?.status === "lost";

  return (
    <AnimatePresence>
      {entry && (
        <>
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
          <motion.aside
            key="drawer"
            initial={reduced ? {} : { x: "100%" }}
            animate={reduced ? {} : { x: 0 }}
            exit={reduced ? {} : { x: "100%" }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg flex flex-col overflow-y-auto"
            style={{ background: "#ffffff", borderLeft: "1px solid #080808" }}
          >
            <div className="relative aspect-[4/3] flex-shrink-0 overflow-hidden" style={{ background: "#f0ede8" }}>
              {entry.image && (
                <Image src={entry.image} alt={entry.productName} fill className="object-cover" sizes="512px" />
              )}
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

            <div className="flex flex-col flex-1 px-8 py-8" style={{ background: "#ffffff", color: "#080808" }}>
              <h2 className="font-[family-name:var(--font-cormorant)] text-4xl leading-tight tracking-wide" style={{ fontWeight: 600 }}>
                {entry.productName}
              </h2>

              <div className="mt-6" style={{ borderTop: "1px solid #080808" }} />

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)]">Certificate</span>
                  <span className="font-[family-name:var(--font-ibm-mono)] text-xs">{entry.certificateId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)]">Authentication</span>
                  <span
                    className="text-[10px] tracking-[0.25em] uppercase font-[family-name:var(--font-dm-sans)] px-2 py-0.5"
                    style={
                      entry.authenticated
                        ? { color: "#C9A84C", border: "1px solid #C9A84C" }
                        : { color: "#8A8A8A", border: "1px solid #8A8A8A" }
                    }
                  >
                    {entry.authenticated ? "✓ Authenticated" : "Unverified"}
                  </span>
                </div>
                {reported && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)]">Status</span>
                    <span
                      className="text-[10px] tracking-[0.25em] uppercase font-[family-name:var(--font-dm-sans)] px-2 py-0.5"
                      style={{ color: "#c0392b", border: "1px solid #c0392b" }}
                    >
                      Reported {entry.status}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)]">Sold</span>
                  <span className="font-[family-name:var(--font-ibm-mono)] text-xs">
                    {formatPrice(entry.price)} · {formatDate(entry.soldDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)]">Owner</span>
                  <span className="text-xs font-[family-name:var(--font-dm-sans)] italic" style={{ color: "#3A3A3A" }}>
                    {owned ? "You" : "A verified collector"}
                  </span>
                </div>
              </div>

              {owned && (
                <div
                  className="mt-4 flex items-center justify-center gap-2 py-2.5"
                  style={{ border: "1px solid #C9A84C", background: "rgba(201,168,76,0.04)" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#C9A84C" }} />
                  <span className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)]" style={{ color: "#C9A84C" }}>
                    You Own This Piece
                  </span>
                </div>
              )}

              {entry.description && (
                <>
                  <div className="mt-6" style={{ borderTop: "1px solid #080808" }} />
                  <p className="mt-6 text-sm font-[family-name:var(--font-dm-sans)] leading-relaxed">
                    {entry.description}
                  </p>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function LibraryContent() {
  const reduced = useReducedMotion();
  const { purchases } = useOwnership();
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [selected, setSelected] = useState<ArchiveEntry | null>(null);

  // Hydrate the GLOBAL archive on mount, then render. Realtime is deferred, so
  // reactivity is mount-hydrate → setState (no domain event); version() exists
  // on the repo for a future realtime add.
  useEffect(() => {
    let active = true;
    let dispose: (() => void) | null = null;
    hydrateArchive()
      .then((teardown) => {
        dispose = teardown;
        if (active) setEntries(getArchiveEntries());
      })
      .catch(() => {
        if (active) setEntries([]);
      });
    return () => {
      active = false;
      if (dispose) dispose();
    };
  }, []);

  // "Owned by you" is computed CLIENT-SIDE from the current user's own scoped
  // snapshot — never from public archive data. Not a filter, just a badge.
  const ownedCertIds = useMemo(
    () =>
      new Set(
        purchases
          .filter((p) => typeof p.certificateId === "string" && p.certificateId.length > 0)
          .map((p) => p.certificateId.toUpperCase())
      ),
    [purchases]
  );

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
          A permanent record of every authenticated piece sold on TEST. Owners are shown
          anonymously. Click any piece to view its certificate and sale details.
        </p>
      </div>

      {/* Card grid */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        {entries.length === 0 ? (
          <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--on-dark-subtle)]">
            No authenticated pieces have been sold yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {entries.map((entry, i) => (
              <ArchiveCard
                key={entry.certificateId}
                entry={entry}
                owned={ownedCertIds.has(entry.certificateId.toUpperCase())}
                index={i}
                onClick={() => setSelected(entry)}
                reduced={reduced}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-8 pb-16 border-t border-[var(--border-on-dark)] pt-8">
        <p className="text-[10px] font-[family-name:var(--font-ibm-mono)] text-[var(--on-dark-subtle)] leading-relaxed max-w-xl">
          Each certificate ID is a permanent record of authentication and sale. Ownership
          identity is private; the archive shows verified collectors anonymously.
        </p>
      </div>

      {/* Detail drawer */}
      <DetailDrawer
        entry={selected}
        owned={!!selected && ownedCertIds.has(selected.certificateId.toUpperCase())}
        onClose={() => setSelected(null)}
        reduced={reduced}
      />
    </div>
  );
}
