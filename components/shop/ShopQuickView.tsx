"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import ShopCheckoutModal from "./ShopCheckoutModal";
import ShopOrderConfirmModal, { type ShopOrder } from "./ShopOrderConfirmModal";

interface ShopQuickViewProps {
  product: Product | null;
  onClose: () => void;
}

function generateOrderId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `ORD-${rand(4)}-${rand(4)}`;
}

type Phase = "view" | "checkout" | "confirmed";

export default function ShopQuickView({ product, onClose }: ShopQuickViewProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("view");
  const [order, setOrder] = useState<ShopOrder | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = product ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [product]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!product) {
      setPhase("view");
      setOrder(null);
    }
  }, [product]);

  function handleBuyNow() {
    setPhase("checkout");
  }

  function handleConfirm() {
    if (!product) return;
    const newOrder: ShopOrder = {
      orderId: generateOrderId(),
      productId: product.id,
      productName: product.name,
      price: product.price,
      purchasedAt: new Date().toISOString(),
    };
    setOrder(newOrder);
    setPhase("confirmed");
  }

  function handleOrderDone() {
    setPhase("view");
    setOrder(null);
    onClose();
  }

  return (
    <>
      <AnimatePresence>
        {product && (
          <>
            <motion.div
              key="shop-qv-backdrop"
              initial={reduced ? {} : { opacity: 0 }}
              animate={reduced ? {} : { opacity: 1 }}
              exit={reduced ? {} : { opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={onClose}
              style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.4)" }}
            />

            <motion.aside
              key="shop-qv-drawer"
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
                <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "28px", fontWeight: 300, color: "#080808", letterSpacing: "0.04em", lineHeight: 1.2 }}>
                  {product.name}
                </h2>

                <p style={{ marginTop: "20px", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "24px", color: "#080808" }}>
                  {formatPrice(product.price)}
                </p>

                <div style={{ marginTop: "24px", borderTop: "1px solid #e0e0e0" }} />

                <p style={{ marginTop: "24px", fontSize: "14px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#3a3a3a", lineHeight: 1.7 }}>
                  {product.description}
                </p>

                <div style={{ marginTop: "auto", paddingTop: "32px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <motion.button
                    onClick={handleBuyNow}
                    whileHover={reduced ? {} : { scale: 1.02 }}
                    whileTap={reduced ? {} : { scale: 0.99 }}
                    className="w-full h-14 px-10 text-sm tracking-widest uppercase font-[family-name:var(--font-dm-sans)] transition-colors duration-300"
                    style={{ background: "#ffffff", color: "var(--gold)", border: "1px solid var(--gold)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--gold)"; e.currentTarget.style.color = "#ffffff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.color = "var(--gold)"; }}
                  >
                    Buy Now
                  </motion.button>
                  <motion.button
                    onClick={onClose}
                    whileHover={reduced ? {} : { scale: 1.02 }}
                    whileTap={reduced ? {} : { scale: 0.99 }}
                    className="w-full h-11 px-6 text-xs tracking-widest uppercase font-[family-name:var(--font-dm-sans)] bg-transparent text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--gold)] transition-colors duration-300"
                  >
                    Continue Shopping
                  </motion.button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {product && phase === "checkout" && (
        <ShopCheckoutModal
          product={product}
          onConfirm={handleConfirm}
          onClose={() => setPhase("view")}
        />
      )}

      {phase === "confirmed" && order && (
        <ShopOrderConfirmModal order={order} onClose={handleOrderDone} />
      )}
    </>
  );
}
