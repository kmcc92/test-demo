"use client";

import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import GoldButton from "@/components/ui/GoldButton";
import { formatPrice } from "@/lib/utils";

export type ShopOrder = {
  orderId: string;
  productId: string;
  productName: string;
  price: number;
  purchasedAt: string;
};

interface ShopOrderConfirmModalProps {
  order: ShopOrder;
  onClose: () => void;
}

export default function ShopOrderConfirmModal({ order, onClose }: ShopOrderConfirmModalProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="shop-order-backdrop"
        initial={reduced ? {} : { opacity: 0 }}
        animate={reduced ? {} : { opacity: 1 }}
        exit={reduced ? {} : { opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)" }}
      />

      <motion.div
        key="shop-order-modal"
        initial={reduced ? {} : { opacity: 0, y: 16 }}
        animate={reduced ? {} : { opacity: 1, y: 0 }}
        exit={reduced ? {} : { opacity: 0, y: 16 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
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
          {/* Checkmark */}
          <div style={{ marginBottom: "28px" }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
              <circle cx="16" cy="16" r="15" stroke="#C9A84C" strokeWidth="1.5" />
              <path d="M10 16.5L14.5 21L22 12" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <p style={{ fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a", marginBottom: "8px" }}>
            Order Confirmed
          </p>

          <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "26px", fontWeight: 300, color: "#080808", letterSpacing: "0.04em", lineHeight: 1.2, marginBottom: "32px" }}>
            {order.productName}
          </h2>

          <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a" }}>
                Order
              </span>
              <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "13px", color: "#080808" }}>
                {order.orderId}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a" }}>
                Total
              </span>
              <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "13px", color: "#080808" }}>
                {formatPrice(order.price)}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a" }}>
                Estimated Delivery
              </span>
              <span style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "13px", color: "#080808" }}>
                3–5 business days
              </span>
            </div>
          </div>

          <GoldButton variant="outline" size="md" className="w-full" onClick={onClose}>
            Continue Shopping
          </GoldButton>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
