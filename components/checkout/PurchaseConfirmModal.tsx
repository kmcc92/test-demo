"use client";

import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/mock-data";
import type { SavedCard } from "@/lib/payment-storage";
import { formatPrice, formatAddress } from "@/lib/utils";
import GoldButton from "@/components/ui/GoldButton";

const GOLD = "#C9A84C";
const BLACK = "#080808";
const MUTED = "#6b6b6b";
const BORDER = "#e0e0e0";

const CARD_LABEL: Record<SavedCard["cardType"], string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  other: "Card",
};

interface ConfirmRowProps {
  label: string;
  value: string;
  gold?: boolean;
}

function ConfirmRow({ label, value, gold }: ConfirmRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 0",
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <span
        style={{
          fontSize: "10px",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          fontFamily: "var(--font-dm-sans), sans-serif",
          color: MUTED,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-ibm-mono), monospace",
          fontSize: "13px",
          color: gold ? GOLD : BLACK,
        }}
      >
        {value}
      </span>
    </div>
  );
}

interface PurchaseConfirmModalProps {
  product: Product;
  card: SavedCard;
  walletAddress: `0x${string}`;
  onConfirm: () => void;
  onClose: () => void;
}

export default function PurchaseConfirmModal({
  product,
  card,
  walletAddress,
  onConfirm,
  onClose,
}: PurchaseConfirmModalProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="confirm-backdrop"
        initial={reduced ? {} : { opacity: 0 }}
        animate={reduced ? {} : { opacity: 1 }}
        exit={reduced ? {} : { opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <motion.div
          key="confirm-panel"
          initial={reduced ? {} : { opacity: 0, y: 16 }}
          animate={reduced ? {} : { opacity: 1, y: 0 }}
          exit={reduced ? {} : { opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#ffffff",
            border: `1px solid ${BORDER}`,
            width: "100%",
            maxWidth: "420px",
            padding: "40px",
          }}
        >
          {/* Header */}
          <p
            style={{
              fontSize: "10px",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              fontFamily: "var(--font-dm-sans), sans-serif",
              color: GOLD,
              marginBottom: "8px",
            }}
          >
            Confirm Purchase
          </p>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: "26px",
              fontWeight: 300,
              color: BLACK,
              letterSpacing: "0.03em",
              lineHeight: 1.2,
              marginBottom: "32px",
            }}
          >
            {product.name}
          </h2>

          {/* Details rows */}
          <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: "32px" }}>
            <ConfirmRow label="Price" value={formatPrice(product.price)} gold />
            <ConfirmRow
              label="Payment"
              value={`${CARD_LABEL[card.cardType]} •••• ${card.lastFour}`}
            />
            <ConfirmRow label="Wallet" value={formatAddress(walletAddress)} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <GoldButton variant="primary" size="lg" className="w-full" onClick={onConfirm}>
              Confirm &amp; Checkout
            </GoldButton>
            <GoldButton variant="outline" size="md" className="w-full" onClick={onClose}>
              Cancel
            </GoldButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
