"use client";

import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import AuthBadge from "@/components/ui/AuthBadge";
import GoldButton from "@/components/ui/GoldButton";
import { useOwnership } from "@/hooks/useOwnership";
import { usePurchaseFlow } from "@/hooks/usePurchaseFlow";
import PrerequisitesModal from "@/components/checkout/PrerequisitesModal";
import PurchaseConfirmModal from "@/components/checkout/PurchaseConfirmModal";

interface ShopQuickViewProps {
  product: Product | null;
  onClose: () => void;
}

export default function ShopQuickView({ product, onClose }: ShopQuickViewProps) {
  const reduced = useReducedMotion();
  const { isOwned } = useOwnership();
  const { step, initiatePurchase, dismiss, confirm } = usePurchaseFlow(product);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = product ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [product]);

  return (
    <>
    <AnimatePresence>
      {product && (
        <>
          <motion.div
            key="backdrop"
            initial={reduced ? {} : { opacity: 0 }}
            animate={reduced ? {} : { opacity: 1 }}
            exit={reduced ? {} : { opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.4)" }}
          />

          <motion.aside
            key="drawer"
            initial={reduced ? {} : { x: "100%" }}
            animate={reduced ? {} : { x: 0 }}
            exit={reduced ? {} : { x: "100%" }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 50,
              width: "100%",
              maxWidth: "420px",
              background: "#ffffff",
              borderLeft: "1px solid #cccccc",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            {/* Image */}
            <div style={{ position: "relative", flexShrink: 0, background: "#f0ede8", aspectRatio: "4/3", overflow: "hidden" }}>
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="420px"
              />
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ffffff",
                  border: "1px solid #cccccc",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#080808"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#cccccc"; }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M1 1L11 11M11 1L1 11" stroke="#080808" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Details */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "32px" }}>

              {/* Name */}
              <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "28px", fontWeight: 300, color: "#080808", letterSpacing: "0.04em", lineHeight: 1.2 }}>
                {product.name}
              </h2>

              {/* Auth badge (exclusive only) */}
              {product.stock_type === "exclusive" && (
                <div style={{ marginTop: "16px" }}>
                  <AuthBadge size="sm" />
                </div>
              )}

              {/* Price */}
              <p style={{ marginTop: "20px", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "24px", color: "#080808" }}>
                {formatPrice(product.price)}
              </p>

              {/* Divider */}
              <div style={{ marginTop: "24px", borderTop: "1px solid #e0e0e0" }} />

              {/* Edition / Certificate (exclusive only) */}
              {product.stock_type === "exclusive" && (product.edition || product.certificateId) && (
                <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {product.edition && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#6b6b6b" }}>
                        Edition
                      </span>
                      <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "14px", color: "#080808" }}>
                        {product.edition}
                      </span>
                    </div>
                  )}
                  {product.certificateId && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#6b6b6b" }}>
                        Certificate
                      </span>
                      <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "11px", color: "#C9A84C" }}>
                        {product.certificateId}
                      </span>
                    </div>
                  )}
                  <div style={{ paddingTop: "12px", borderTop: "1px solid #e0e0e0" }} />
                </div>
              )}

              {/* Description */}
              <p style={{ marginTop: product.stock_type === "exclusive" ? "0" : "24px", fontSize: "14px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#3a3a3a", lineHeight: 1.7 }}>
                {product.description}
              </p>

              {/* CTAs */}
              <div style={{ marginTop: "auto", paddingTop: "32px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {isOwned(product.id) ? (
                  <div style={{ padding: "12px", textAlign: "center", border: "1px solid #C9A84C" }}>
                    <p style={{ fontSize: "10px", letterSpacing: "0.35em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#C9A84C" }}>
                      You Own This Piece
                    </p>
                  </div>
                ) : (
                  <GoldButton
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={initiatePurchase}
                  >
                    Add to Bag
                  </GoldButton>
                )}
                <GoldButton variant="outline" size="md" className="w-full" onClick={onClose}>
                  Continue Shopping
                </GoldButton>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>

    {product && step.phase === "prereq" && (
      <PrerequisitesModal missing={step.missing} onClose={dismiss} />
    )}
    {product && step.phase === "confirm" && (
      <PurchaseConfirmModal
        product={product}
        card={step.card}
        walletAddress={step.walletAddress}
        onConfirm={confirm}
        onClose={dismiss}
      />
    )}
    </>
  );
}
