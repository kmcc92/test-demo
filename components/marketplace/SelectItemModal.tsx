"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useOwnership } from "@/hooks/useOwnership";
import { useMarketplace } from "@/hooks/useMarketplace";
import { PRODUCTS, AUCTIONS } from "@/lib/mock-data";
import type { PurchaseRecord } from "@/lib/purchase-storage";

interface SelectItemModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (purchase: PurchaseRecord) => void;
}

function getProductImage(productId: string): string {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (product) return product.images[0] ?? "";
  const auction = AUCTIONS.find((a) => a.id === productId);
  if (auction) return auction.image ?? "";
  return "";
}

export default function SelectItemModal({ open, onClose, onSelect }: SelectItemModalProps) {
  if (typeof window === "undefined") return null;

  const reduced = useReducedMotion();
  const { purchases } = useOwnership();
  const { isListed } = useMarketplace();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const eligiblePurchases = purchases.filter(
    (p) => !!p.certificateId && p.certificateId !== "" && p.productId.startsWith("excl-")
  );

  const allListed =
    eligiblePurchases.length > 0 && eligiblePurchases.every((p) => isListed(p.productId));

  const S = {
    eyebrow: {
      fontSize: "10px",
      letterSpacing: "0.4em",
      textTransform: "uppercase" as const,
      fontFamily: "var(--font-dm-sans), sans-serif",
      color: "#8a8a8a",
      marginBottom: "8px",
    },
    heading: {
      fontFamily: "var(--font-cormorant), serif",
      fontSize: "26px",
      fontWeight: 300,
      color: "#080808",
      lineHeight: 1.2,
      marginBottom: "28px",
    },
  };

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="select-backdrop"
          initial={reduced ? {} : { opacity: 0 }}
          animate={reduced ? {} : { opacity: 1 }}
          exit={reduced ? {} : { opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 80,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
          }}
        >
          <motion.div
            key="select-panel"
            initial={reduced ? {} : { opacity: 0, y: 16 }}
            animate={reduced ? {} : { opacity: 1, y: 0 }}
            exit={reduced ? {} : { opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              border: "1px solid #e0e0e0",
              width: "100%",
              maxWidth: "480px",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "40px",
            }}
          >
            <p style={S.eyebrow}>Select Item</p>
            <h2 style={S.heading}>Choose a Piece to List</h2>

            {allListed ? (
              <p style={{ fontSize: "13px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a", lineHeight: 1.7, marginBottom: "28px" }}>
                All your authenticated pieces are currently listed.
              </p>
            ) : (
              <div style={{ marginBottom: "8px" }}>
                {eligiblePurchases.map((purchase, i) => {
                  const image = getProductImage(purchase.productId);
                  const listed = isListed(purchase.productId);
                  return (
                    <div
                      key={purchase.id}
                      onClick={listed ? undefined : () => { onSelect(purchase); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "16px 0",
                        borderBottom: i < eligiblePurchases.length - 1 ? "1px solid #f0f0f0" : "none",
                        cursor: listed ? "not-allowed" : "pointer",
                        opacity: listed ? 0.45 : 1,
                      }}
                    >
                      {/* Thumbnail */}
                      <div style={{ position: "relative", width: "56px", height: "70px", flexShrink: 0, background: "#f0ede8", overflow: "hidden" }}>
                        {image && (
                          <Image src={image} alt={purchase.productName} fill className="object-cover" sizes="56px" />
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "17px", fontWeight: 300, color: "#080808", lineHeight: 1.2, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {purchase.productName}
                        </p>
                        <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "9px", color: "#C9A84C", marginBottom: "8px" }}>
                          {purchase.certificateId}
                        </p>
                        {listed ? (
                          <span style={{ fontSize: "8px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a", border: "1px solid #e0e0e0", padding: "2px 7px" }}>
                            Already Listed
                          </span>
                        ) : (
                          <span style={{ fontSize: "8px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.4)", padding: "2px 7px" }}>
                            Authenticated
                          </span>
                        )}
                      </div>

                      {/* Arrow for selectable items */}
                      {!listed && (
                        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M9 1L13 5M13 5L9 9M13 5H1" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "13px",
                background: "transparent",
                border: "1px solid #e0e0e0",
                fontSize: "10px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                fontFamily: "var(--font-dm-sans), sans-serif",
                color: "#080808",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
