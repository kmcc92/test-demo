"use client";

import { useState, useEffect, useId } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { type CertificateResult } from "@/lib/mock-verify";
import { SERVICE_HISTORY } from "@/lib/mock-data";
import { lookupCertificate } from "@/lib/verify-lookup";
import {
  getBlockchainData,
  formatTxHash,
  getEtherscanUrl,
  type BlockchainMetadata,
} from "@/lib/mock-blockchain";
import { useWallet } from "@/hooks/useWallet";
import { useOwnership } from "@/hooks/useOwnership";
import { useAuth } from "@/hooks/useAuth";
import GoldButton from "@/components/ui/GoldButton";
import { formatAddress } from "@/lib/utils";
import {
  getCertificateDisplayContext,
  type CertificateDisplayContext,
} from "@/lib/certificate-display-adapter";

function GoldCheckmark({ reduced }: { reduced: boolean | null }) {
  return (
    <div className="relative flex items-center justify-center w-20 h-20 mx-auto mb-8">
      {/* Glow ring */}
      {!reduced && (
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            background:
              "radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%)",
          }}
        />
      )}
      {/* Circle */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        aria-hidden
        className="absolute inset-0"
      >
        <motion.circle
          cx="40"
          cy="40"
          r="36"
          stroke="var(--gold)"
          strokeWidth="1.5"
          fill="none"
          pathLength={1}
          initial={reduced ? {} : { pathLength: 0, opacity: 0 }}
          animate={reduced ? {} : { pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </svg>
      {/* Checkmark */}
      <svg
        width="32"
        height="24"
        viewBox="0 0 32 24"
        fill="none"
        aria-hidden
      >
        <motion.path
          d="M2 12L12 22L30 2"
          stroke="var(--gold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          initial={reduced ? {} : { pathLength: 0 }}
          animate={reduced ? {} : { pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.55, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}

function ProvenanceRow({
  owner,
  action,
  date,
  reduced,
  index,
}: {
  owner: string;
  action: string;
  date: string;
  reduced: boolean | null;
  index: number;
}) {
  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 8 }}
      animate={reduced ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
      className="flex items-start justify-between py-3 border-b border-[var(--border)] last:border-0"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
          {action}
        </span>
        <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-secondary)]">
          {owner.startsWith("0x") ? formatAddress(owner) : owner}
        </span>
      </div>
      <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-muted)] shrink-0 ml-4">
        {date}
      </span>
    </motion.div>
  );
}

function BlockchainPanel({
  data,
  reduced,
}: {
  data: BlockchainMetadata;
  reduced: boolean | null;
}) {
  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0 }}
      animate={reduced ? {} : { opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.9 }}
      className="mt-6"
    >
      <p className="text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-3">
        On-Chain Record
      </p>
      <div className="border border-[var(--border)] p-5 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
            Network
          </span>
          <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-secondary)]">
            {data.network}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
            Block
          </span>
          <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-secondary)]">
            {data.blockNumber.toLocaleString("en-US")}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
            Timestamp
          </span>
          <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-secondary)]">
            {new Date(data.timestamp).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
            Contract
          </span>
          <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-secondary)]">
            {formatAddress(data.contractAddress)}
          </span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-[var(--border)]">
          <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
            Transaction
          </span>
          <a
            href={getEtherscanUrl(data.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--gold)] hover:underline underline-offset-2 transition-colors"
          >
            {formatTxHash(data.txHash)} ↗
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function ReportedStatusBanner({
  status,
  reportedDate,
  reportedLocation,
  reduced,
}: {
  status: "active" | "stolen" | "lost";
  reportedDate?: string;
  reportedLocation?: string;
  reduced: boolean | null;
}) {
  if (status === "active") return null;

  const copy =
    status === "stolen"
      ? "THIS ITEM HAS BEEN REPORTED STOLEN"
      : "THIS ITEM HAS BEEN REPORTED LOST";

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: -8 }}
      animate={reduced ? {} : { opacity: 1, y: 0 }}
      exit={reduced ? {} : { opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-lg mx-auto mt-10 border border-red-900/50 bg-red-950/10 px-5 py-3 text-center"
    >
      <p className="text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-red-400">
        ⚠ {copy}
      </p>
      {(reportedDate || reportedLocation) && (
        <div className="mt-2 space-y-0.5">
          {reportedDate && (
            <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-red-300/80">
              Reported on: {reportedDate}
            </p>
          )}
          {reportedLocation && (
            <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-red-300/80">
              Location: {reportedLocation}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ResultCard({
  result,
  reduced,
  isOwner,
  blockchainData,
}: {
  result: CertificateResult;
  reduced: boolean | null;
  isOwner: boolean;
  blockchainData: BlockchainMetadata | null;
}) {
  const cardVariants = {
    initial: reduced ? {} : { opacity: 0, y: 24 },
    animate: reduced ? {} : { opacity: 1, y: 0 },
    exit: reduced ? {} : { opacity: 0, y: -16 },
  };

  if (result.status === "authenticated" && result.registryUnowned) {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg mx-auto mt-10 border border-[var(--border-gold)] p-8"
      >
        <GoldCheckmark reduced={reduced} />

        <motion.div
          initial={reduced ? {} : { opacity: 0 }}
          animate={reduced ? {} : { opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-center mb-8"
        >
          <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)] mb-2">
            Authentic — Unowned
          </p>
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[var(--text-primary)] tracking-wide">
            {result.itemName}
          </h2>
        </motion.div>

        <motion.div
          initial={reduced ? {} : { opacity: 0 }}
          animate={reduced ? {} : { opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="space-y-3 mb-6 border border-[var(--border)] p-5"
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
              Certificate
            </span>
            <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--gold)]">
              {result.certificateId}
            </span>
          </div>
        </motion.div>

        <motion.p
          initial={reduced ? {} : { opacity: 0 }}
          animate={reduced ? {} : { opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="text-center text-xs font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] leading-relaxed"
        >
          This item has been authenticated but has not yet been purchased.
        </motion.p>
      </motion.div>
    );
  }

  if (result.status === "authenticated") {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg mx-auto mt-10 border border-[var(--border-gold)] p-8"
      >
        <GoldCheckmark reduced={reduced} />

        <motion.div
          initial={reduced ? {} : { opacity: 0 }}
          animate={reduced ? {} : { opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-center mb-8"
        >
          <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)] mb-2">
            Authenticated
          </p>
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[var(--text-primary)] tracking-wide">
            {result.itemName}
          </h2>
        </motion.div>

        <motion.div
          initial={reduced ? {} : { opacity: 0 }}
          animate={reduced ? {} : { opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="space-y-3 mb-8 border border-[var(--border)] p-5"
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
              Certificate
            </span>
            <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--gold)]">
              {result.certificateId}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
              Edition
            </span>
            <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-secondary)]">
              {result.edition}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
              Minted
            </span>
            <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-secondary)]">
              {result.mintDate}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
              Owner
            </span>
            <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-secondary)]">
              {result.owner ? formatAddress(result.owner) : "—"}
            </span>
          </div>
        </motion.div>

        {isOwner && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 8 }}
            animate={reduced ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
            className="flex items-center justify-center gap-2 py-3 mb-6 border border-[var(--border-gold)] bg-[rgba(201,168,76,0.06)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
            <span className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)]">
              You Own This Piece
            </span>
          </motion.div>
        )}

        {result.provenance && result.provenance.length > 0 && (
          <motion.div
            initial={reduced ? {} : { opacity: 0 }}
            animate={reduced ? {} : { opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <p className="text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-3">
              Provenance
            </p>
            <div className="border border-[var(--border)]">
              {result.provenance.map((p, i) => (
                <ProvenanceRow
                  key={i}
                  owner={p.owner}
                  action={p.action}
                  date={p.date}
                  reduced={reduced}
                  index={i}
                />
              ))}
            </div>
          </motion.div>
        )}

        {blockchainData && (
          <BlockchainPanel data={blockchainData} reduced={reduced} />
        )}

        {(() => {
          const history = SERVICE_HISTORY[result.certificateId];
          if (!history || history.length === 0) return null;
          return (
            <motion.div
              initial={reduced ? {} : { opacity: 0 }}
              animate={reduced ? {} : { opacity: 1 }}
              transition={{ duration: 0.4, delay: 1.1 }}
              className="mt-6"
            >
              <p className="text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-3">
                Service History
              </p>
              <div className="border border-[var(--border)]">
                {history.map((record, i) => (
                  <div
                    key={record.id}
                    className="p-4"
                    style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-secondary)]">
                        {record.type}
                      </span>
                      <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--text-muted)] shrink-0 ml-4">
                        {record.date}
                      </span>
                    </div>
                    <p className="text-[10px] font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-1">
                      {record.performedBy}
                    </p>
                    <p className="text-xs font-[family-name:var(--font-dm-sans)] text-[var(--text-secondary)] leading-relaxed">
                      {record.notes}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}
      </motion.div>
    );
  }

  if (result.status === "stolen") {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-lg mx-auto mt-10 border border-red-900/50 p-8 bg-red-950/10"
      >
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 border border-red-900/40 bg-red-950/20">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <path
              d="M14 4L25.5 23.5H2.5L14 4Z"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M14 11V16" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="14" cy="20" r="1" fill="#ef4444" />
          </svg>
        </div>
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-red-400 mb-2">
            Flagged — Reported Stolen
          </p>
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[var(--text-primary)] tracking-wide">
            {result.itemName}
          </h2>
        </div>
        <div className="border border-red-900/30 p-4 mb-6 text-center">
          <p className="text-sm font-[family-name:var(--font-dm-sans)] text-red-300 leading-relaxed">
            This item has been reported stolen. Do not purchase. Contact TEST support immediately if you have information about its whereabouts.
          </p>
        </div>
        <div className="flex justify-center">
          <GoldButton variant="ghost" size="sm">
            Contact Support
          </GoldButton>
        </div>
      </motion.div>
    );
  }

  if (result.status === "revoked") {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-lg mx-auto mt-10 border border-amber-900/40 p-8 bg-amber-950/10"
      >
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 border border-amber-900/30">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="#d97706" strokeWidth="1.5" />
            <path d="M8 8L16 16M16 8L8 16" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-amber-500 mb-2">
            Certificate Revoked
          </p>
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[var(--text-primary)] tracking-wide">
            {result.itemName}
          </h2>
        </div>
        <div className="border border-amber-900/30 p-4">
          <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-2">
            Reason
          </p>
          <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-secondary)] leading-relaxed">
            {result.revokedReason}
          </p>
        </div>
      </motion.div>
    );
  }

  if (result.status === "transferred") {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-lg mx-auto mt-10 border border-[var(--border-gold)]/50 p-8"
      >
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 border border-[var(--border-gold)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="var(--gold)" strokeWidth="1.5" opacity="0.6" />
            <path d="M8 12H16M13 9L16 12L13 15" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
          </svg>
        </div>
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)]/70 mb-2">
            Transferred
          </p>
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[var(--text-primary)] tracking-wide">
            {result.itemName}
          </h2>
        </div>
        <div className="border border-[var(--border)] p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
              Current Owner
            </span>
            <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-secondary)]">
              {result.owner ? formatAddress(result.owner) : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
              Previous Owner
            </span>
            <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-muted)]">
              {result.previousOwner ? formatAddress(result.previousOwner) : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
              Edition
            </span>
            <span className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[var(--text-secondary)]">
              {result.edition}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // not_found
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-lg mx-auto mt-10 border border-[var(--border)] p-8 text-center"
    >
      <p className="font-[family-name:var(--font-ibm-mono)] text-xs text-[var(--text-muted)] mb-3">
        {result.certificateId}
      </p>
      <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
        Certificate Not Found
      </p>
      <p className="mt-4 text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] leading-relaxed">
        No record found for this identifier. Verify the certificate ID is correct.
      </p>
    </motion.div>
  );
}

function CertificateMetadataCard({
  ctx,
  reduced,
}: {
  ctx: CertificateDisplayContext;
  reduced: boolean | null;
}) {
  if (!ctx.hasCertificate || !ctx.certificate) return null;
  const cert = ctx.certificate;
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 12 }}
      animate={reduced ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
      className="w-full max-w-lg mx-auto mt-4"
    >
      <div className="border border-[var(--border)] p-6">
        {/* Badge */}
        <div className="mb-4">
          <span className="text-[8px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)] border border-[var(--border-gold)] px-2 py-1">
            Linked Certificate Found
          </span>
        </div>

        <p className="text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-4">
          Certificate Metadata
        </p>

        <div className="border border-[var(--border)] p-4 space-y-3">
          {[
            { label: "Certificate ID", value: cert.id, gold: true },
            { label: "Product", value: cert.productName },
            { label: "Product ID", value: cert.productId },
            { label: "Issued To", value: cert.issuedTo },
            { label: "Issued", value: issuedDate },
            { label: "Provenance Depth", value: String(cert.metadata.provenanceDepth) },
            { label: "Service History", value: String(cert.metadata.serviceHistoryCount) },
          ].map(({ label, value, gold }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                {label}
              </span>
              <span
                className="font-[family-name:var(--font-ibm-mono)] text-[11px] max-w-[60%] text-right break-all"
                style={{ color: gold ? "var(--gold)" : "var(--text-secondary)" }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function VerifyPage() {
  const reduced = useReducedMotion();
  const inputId = useId();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("certificateId") ?? searchParams.get("id");
  const { address: walletAddress } = useWallet();
  const { getResolvedPurchases } = useOwnership();
  const { user } = useAuth();

  const [inputValue, setInputValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<CertificateResult | null>(null);
  const [certContext, setCertContext] = useState<CertificateDisplayContext>({
    certificate: null,
    hasCertificate: false,
  });

  const blockchainData = result ? getBlockchainData(result.certificateId) : null;

  const effectiveOwner =
    result?.certificateId === "TEST-GOLD-001" && walletAddress
      ? walletAddress
      : result?.owner;

  const isOwner = !!(
    walletAddress &&
    effectiveOwner &&
    walletAddress.toLowerCase() === effectiveOwner.toLowerCase()
  );

  // Certificate metadata lookup — client-side only, after result is available.
  // Derives productId from verificationResult only; never reads storage during SSR.
  useEffect(() => {
    if (!result) {
      setCertContext({ certificate: null, hasCertificate: false });
      return;
    }
    const productId =
      "productId" in result
        ? (result as { productId?: string }).productId
        : undefined;
    if (!productId) {
      setCertContext({ certificate: null, hasCertificate: false });
      return;
    }
    setCertContext(getCertificateDisplayContext(productId));
  }, [result]);

  async function handleVerify(value?: string) {
    const query = (value ?? inputValue).trim();
    setInputValue(query);
    if (!query || isVerifying) return;
    setIsVerifying(true);
    setResult(null);

    const cert = await lookupCertificate(query, getResolvedPurchases(user?.email ?? ""), user?.email ?? undefined);
    setResult(cert);
    setIsVerifying(false);
  }

  useEffect(() => {
    if (!idParam) return;
    handleVerify(idParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idParam]);

  function handleReset() {
    setResult(null);
    setInputValue("");
    setCertContext({ certificate: null, hasCertificate: false });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleVerify();
  }

  return (
    <div className="flex-1 flex flex-col items-center px-8 py-24">
      {/* Header */}
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 12 }}
        animate={reduced ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-16"
      >
        <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-4">
          Certificate Verification
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-4xl md:text-5xl font-light text-[var(--text-primary)] tracking-wide">
          Verify Ownership
        </h1>
      </motion.div>

      {/* Input */}
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 16 }}
        animate={reduced ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <label
          htmlFor={inputId}
          className="block text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-3"
        >
          Certificate ID
        </label>
        <div className="flex gap-3">
          <input
            id={inputId}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isVerifying || !!result}
            placeholder="TEST-GOLD-001"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 h-12 px-4 border border-[var(--border)] bg-transparent font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold)] transition-colors disabled:opacity-60"
          />
          <GoldButton
            variant="primary"
            size="md"
            loading={isVerifying}
            disabled={isVerifying || !inputValue.trim() || !!result}
            onClick={() => handleVerify()}
            className="shrink-0 px-8"
          >
            Verify
          </GoldButton>
        </div>
      </motion.div>

      {/* Status overlay banner — UI enrichment only, decided in lib/verify-lookup.ts */}
      <AnimatePresence>
        {result?.reportedStatus && result.reportedStatus !== "active" && (
          <ReportedStatusBanner
            key={result.certificateId + "-status"}
            status={result.reportedStatus}
            reportedDate={result.reportedDate}
            reportedLocation={result.reportedLocation}
            reduced={reduced}
          />
        )}
      </AnimatePresence>

      {/* Result — verification system is sole authority, always rendered first */}
      <AnimatePresence mode="wait">
        {result && (
          <ResultCard
            key={result.certificateId + result.status}
            result={result}
            reduced={reduced}
            isOwner={isOwner}
            blockchainData={blockchainData}
          />
        )}
      </AnimatePresence>

      {/* Certificate metadata — decorative display only, always below result */}
      {result && (
        <CertificateMetadataCard ctx={certContext} reduced={reduced} />
      )}

      {/* Reset */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={reduced ? {} : { opacity: 0 }}
            animate={reduced ? {} : { opacity: 1 }}
            exit={reduced ? {} : { opacity: 0 }}
            transition={{ duration: 0.3, delay: 1 }}
            className="mt-8"
          >
            <button
              onClick={handleReset}
              className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-200 underline underline-offset-4"
            >
              Verify Another
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
