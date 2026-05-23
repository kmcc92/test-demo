"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { saveOrder } from "@/lib/order-storage";
import ShopCheckoutModal, { type CheckoutResult } from "./ShopCheckoutModal";
import ShopOrderConfirmModal, { type ShopOrder } from "./ShopOrderConfirmModal";

interface ShopQuickViewProps {
  product: Product | null;
  onClose: () => void;
}

type Phase = "view" | "checkout" | "confirmed";

export default function ShopQuickView({ product, onClose }: ShopQuickViewProps) {
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("view");
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = product ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [product]);

  useEffect(() => {
    setPhase("view");
    setOrder(null);
    setActiveImage(0);
    setSelectedSize(null);
    setSizeError(false);
  }, [product]);

  function handleBuyNow() {
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      setSizeError(true);
      return;
    }
    setPhase("checkout");
  }

  function handleConfirm(result: CheckoutResult) {
    if (!product) return;
    if (user?.email) {
      saveOrder(user.email, {
        orderId:          result.orderId,
        productId:        product.id,
        productName:      product.name,
        price:            product.price,
        size:             result.size,
        purchasedAt:      result.purchasedAt,
        trackingNumber:   result.trackingNumber,
        estimatedDelivery: result.shippingMethod.eta,
      });
    }
    setOrder({ orderId: result.orderId, productId: product.id, productName: product.name, price: product.price, purchasedAt: result.purchasedAt });
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
              {/* Main image */}
              <div style={{ position: "relative", flexShrink: 0, background: "#f0ede8", aspectRatio: "4/3", overflow: "hidden" }}>
                <Image
                  src={product.images[activeImage]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  style={{ transition: "opacity 0.25s ease" }}
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

              {/* Thumbnail row */}
              {product.images.length > 1 && (
                <div style={{ display: "flex", gap: "8px", padding: "12px 16px", background: "#faf9f7", flexShrink: 0 }}>
                  {product.images.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      aria-label={`View image ${i + 1}`}
                      style={{
                        position: "relative",
                        width: "64px",
                        height: "64px",
                        flexShrink: 0,
                        border: i === activeImage ? "1px solid #080808" : "1px solid #e0e0e0",
                        cursor: "pointer",
                        background: "#f0ede8",
                        overflow: "hidden",
                        transition: "border-color 0.2s",
                      }}
                    >
                      <Image src={src} alt="" fill className="object-cover" sizes="64px" />
                    </button>
                  ))}
                </div>
              )}

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

                {/* Size selector */}
                {product.sizes && product.sizes.length > 0 && (
                  <div style={{ marginTop: "24px" }}>
                    <p style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans)", color: "#8a8a8a", marginBottom: "10px" }}>
                      Size
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => {
                            setSelectedSize(size === selectedSize ? null : size);
                            setSizeError(false);
                          }}
                          style={{
                            height: "36px",
                            minWidth: "44px",
                            padding: "0 12px",
                            fontSize: "11px",
                            letterSpacing: "0.08em",
                            fontFamily: "var(--font-dm-sans)",
                            cursor: "pointer",
                            background: "#ffffff",
                            color: "#080808",
                            fontWeight: size === selectedSize ? 700 : 400,
                            border: size === selectedSize ? "1px solid #080808" : "1px solid #e0e0e0",
                            transition: "border-color 0.15s",
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    {sizeError && (
                      <p style={{ marginTop: "8px", fontSize: "11px", color: "#b00000", fontFamily: "var(--font-dm-sans)", letterSpacing: "0.04em" }}>
                        Please select a size
                      </p>
                    )}
                  </div>
                )}

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
          selectedSize={selectedSize ?? undefined}
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
