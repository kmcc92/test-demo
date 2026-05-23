"use client";

import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import GoldButton from "@/components/ui/GoldButton";
import { useAuth } from "@/hooks/useAuth";
import { readCards, type SavedCard } from "@/lib/payment-storage";

interface ShopCheckoutModalProps {
  product: Product;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ShopCheckoutModal({ product, onConfirm, onClose }: ShopCheckoutModalProps) {
  const reduced = useReducedMotion();
  const { user } = useAuth();

  const cards: SavedCard[] = user?.email ? readCards(user.email) : [];
  const primaryCard = cards[0] ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="shop-checkout-backdrop"
        initial={reduced ? {} : { opacity: 0 }}
        animate={reduced ? {} : { opacity: 1 }}
        exit={reduced ? {} : { opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)" }}
      />

      <motion.div
        key="shop-checkout-modal"
        initial={reduced ? {} : { opacity: 0, y: 16 }}
        animate={reduced ? {} : { opacity: 1, y: 0 }}
        exit={reduced ? {} : { opacity: 0, y: 16 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          pointerEvents: "none",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#ffffff",
            width: "100%",
            maxWidth: "420px",
            padding: "40px",
            pointerEvents: "auto",
          }}
        >
          <p style={{ fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a", marginBottom: "24px" }}>
            Confirm Purchase
          </p>

          <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "26px", fontWeight: 300, color: "#080808", letterSpacing: "0.04em", lineHeight: 1.2, marginBottom: "8px" }}>
            {product.name}
          </h2>

          <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "20px", color: "#080808", marginBottom: "32px" }}>
            {formatPrice(product.price)}
          </p>

          <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "24px", marginBottom: "32px" }}>
            <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a", marginBottom: "12px" }}>
              Payment
            </p>
            {primaryCard ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "36px", height: "24px", background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "8px", fontFamily: "var(--font-ibm-mono), monospace", color: "#080808" }}>
                    {primaryCard.cardType === "visa" ? "VI" : primaryCard.cardType === "mastercard" ? "MC" : "··"}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "14px", color: "#080808" }}>
                  •••• {primaryCard.lastFour}
                </span>
              </div>
            ) : (
              <p style={{ fontSize: "13px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#3a3a3a", lineHeight: 1.6 }}>
                No saved card.{" "}
                <a href="/account" style={{ color: "#C9A84C", textDecoration: "underline" }}>
                  Add one in your account
                </a>
                .
              </p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <GoldButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={onConfirm}
              disabled={!primaryCard}
            >
              Confirm Purchase
            </GoldButton>
            <GoldButton variant="outline" size="md" className="w-full" onClick={onClose}>
              Cancel
            </GoldButton>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
