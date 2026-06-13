"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { PurchaseRecord } from "@/lib/purchase-storage";
import { formatPrice } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useMarketplace } from "@/hooks/useMarketplace";
import GoldButton from "@/components/ui/GoldButton";

type AuctionDuration = "24h" | "48h" | "7d";

const DURATION_LABELS: Record<AuctionDuration, string> = {
  "24h": "24 Hours",
  "48h": "48 Hours",
  "7d": "7 Days",
};

const DURATION_MS: Record<AuctionDuration, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "48h": 48 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

const S = {
  eyebrow: {
    fontSize: "10px",
    letterSpacing: "0.4em",
    textTransform: "uppercase" as const,
    fontFamily: "var(--font-dm-sans), sans-serif",
    color: "#080808",
    marginBottom: "8px",
  },
  heading: {
    fontFamily: "var(--font-cormorant), serif",
    fontSize: "26px",
    fontWeight: 300,
    color: "#080808",
    lineHeight: 1.2,
    marginBottom: "24px",
  },
  label: {
    fontSize: "9px",
    letterSpacing: "0.3em",
    textTransform: "uppercase" as const,
    fontFamily: "var(--font-dm-sans), sans-serif",
    color: "#8a8a8a",
    display: "block",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    height: "48px",
    paddingLeft: "28px",
    paddingRight: "12px",
    fontSize: "16px",
    fontFamily: "var(--font-ibm-mono), monospace",
    color: "#080808",
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  prefix: {
    position: "absolute" as const,
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    fontFamily: "var(--font-ibm-mono), monospace",
    fontSize: "14px",
    color: "#8a8a8a",
  },
};

interface CreateListingModalProps {
  purchase: PurchaseRecord;
  image: string;
  onClose: () => void;
}

export default function CreateListingModal({ purchase, image, onClose }: CreateListingModalProps) {
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const { address } = useWallet();
  const { createListing, isListed } = useMarketplace();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [reservePrice, setReservePrice] = useState("");
  const [buyNowPrice, setBuyNowPrice] = useState("");
  const [minimumIncrement, setMinimumIncrement] = useState("50");
  const [duration, setDuration] = useState<AuctionDuration>("48h");
  const [condition, setCondition] = useState("");
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  const resetAndClose = useCallback(() => {
    setStep(1);
    setReservePrice("");
    setBuyNowPrice("");
    setMinimumIncrement("50");
    setDuration("48h");
    setCondition("");
    setSuccess(false);
    onClose();
  }, [onClose]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") resetAndClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [resetAndClose]);

  function handleConfirm() {
    if (!user) return;
    if (isListed(purchase.productId)) return;

    createListing({
      productId: purchase.productId,
      productName: purchase.productName,
      certificateId: purchase.certificateId,
      image,
      sellerEmail: user.email,
      sellerWallet: address ?? "",
      reservePrice: parseFloat(reservePrice),
      buyNowPrice: buyNowPrice.trim() ? parseFloat(buyNowPrice) : undefined,
      minimumIncrement: parseFloat(minimumIncrement) || 50,
      endsAt: new Date(Date.now() + DURATION_MS[duration]).toISOString(),
      condition: condition.trim(),
      provenanceDepth: 1,
      serviceHistoryCount: 0,
    });

    setSuccess(true);
  }

  const buyNowError =
    buyNowPrice.trim() !== "" && parseFloat(buyNowPrice) <= parseFloat(reservePrice || "0")
      ? "Buy Now price must be higher than reserve price"
      : "";

  const canProceedStep2 = parseFloat(reservePrice) > 0 && !buyNowError;

  const STEP_LABELS = ["Item", "Price", "Duration", "Condition", "Review"];

  if (!mounted) return null;

  const modal = (
    <AnimatePresence>
      <motion.div
        key="listing-backdrop"
        initial={reduced ? {} : { opacity: 0 }}
        animate={reduced ? {} : { opacity: 1 }}
        exit={reduced ? {} : { opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={resetAndClose}
        style={{
          position: "fixed", inset: 0, zIndex: 80,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
        }}
      >
        <motion.div
          key="listing-panel"
          initial={reduced ? {} : { opacity: 0, y: 16 }}
          animate={reduced ? {} : { opacity: 1, y: 0 }}
          exit={reduced ? {} : { opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            width: "100%",
            maxWidth: "460px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "40px",
          }}
        >
          {success ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{
                width: "52px", height: "52px",
                border: "1px solid rgba(201,168,76,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px",
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 10L8 15L17 6" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p style={{ ...S.eyebrow, color: "#C9A84C" }}>Listed</p>
              <h2 style={{ ...S.heading, marginBottom: "12px" }}>
                Your item is now listed in the marketplace
              </h2>
              <p style={{ fontSize: "13px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#6b6b6b", lineHeight: 1.7, marginBottom: "32px" }}>
                {purchase.productName} is live for auction. You will retain ownership until the auction ends.
              </p>
              <GoldButton variant="primary" size="md" className="w-full" onClick={resetAndClose}>
                Return to Account
              </GoldButton>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "28px" }}>
                {([1, 2, 3, 4, 5] as const).map((s, i) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{
                      fontSize: "9px",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      letterSpacing: "0.1em",
                      color: step === s ? "#080808" : step > s ? "#C9A84C" : "#cccccc",
                      fontWeight: step === s ? 600 : 400,
                      borderBottom: step === s ? "1px solid #080808" : "none",
                      paddingBottom: "1px",
                    }}>
                      {s}
                    </span>
                    {i < 4 && (
                      <div style={{ width: "14px", height: "1px", background: step > s ? "#C9A84C" : "#e0e0e0" }} />
                    )}
                  </div>
                ))}
                <span style={{ ...S.label, marginBottom: 0, marginLeft: "8px" }}>
                  {STEP_LABELS[step - 1]}
                </span>
              </div>

              {/* ── STEP 1: Item Summary ── */}
              {step === 1 && (
                <>
                  <p style={S.eyebrow}>List for Auction</p>
                  <h2 style={S.heading}>{purchase.productName}</h2>

                  <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#f0ede8", marginBottom: "20px", overflow: "hidden" }}>
                    {image && (
                      <Image src={image} alt={purchase.productName} fill className="object-cover" sizes="420px" />
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <span style={{ fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.4)", padding: "3px 8px" }}>
                      Authenticated
                    </span>
                    <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "11px", color: "#C9A84C" }}>
                      {purchase.certificateId}
                    </span>
                  </div>

                  <div style={{ padding: "16px", background: "#f8f6f1", borderLeft: "2px solid #C9A84C", marginBottom: "32px" }}>
                    <p style={{ fontSize: "13px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#6b6b6b", lineHeight: 1.7 }}>
                      You are listing this item for peer-to-peer resale. Ownership transfers only after the auction ends and payment is confirmed.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <GoldButton variant="primary" size="lg" className="w-full" onClick={() => setStep(2)}>
                      Continue
                    </GoldButton>
                    <GoldButton variant="outline" size="md" className="w-full" onClick={resetAndClose}>
                      Cancel
                    </GoldButton>
                  </div>
                </>
              )}

              {/* ── STEP 2: Set Price ── */}
              {step === 2 && (
                <>
                  <p style={S.eyebrow}>Set Price</p>
                  <h2 style={S.heading}>Reserve Price</h2>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={S.label}>Reserve Price (USD)</label>
                    <div style={{ position: "relative" }}>
                      <span style={S.prefix}>$</span>
                      <input
                        type="number"
                        min="1"
                        value={reservePrice}
                        onChange={(e) => setReservePrice(e.target.value)}
                        placeholder="0"
                        style={S.input}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <label style={S.label}>Minimum Increment (USD)</label>
                    <div style={{ position: "relative" }}>
                      <span style={S.prefix}>$</span>
                      <input
                        type="number"
                        min="1"
                        value={minimumIncrement}
                        onChange={(e) => setMinimumIncrement(e.target.value)}
                        style={S.input}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={S.label}>Buy Now Price (optional)</label>
                    <div style={{ position: "relative" }}>
                      <span style={S.prefix}>$</span>
                      <input
                        type="number"
                        min="1"
                        value={buyNowPrice}
                        onChange={(e) => setBuyNowPrice(e.target.value)}
                        placeholder="Leave empty for auction only"
                        style={S.input}
                      />
                    </div>
                    {buyNowError && (
                      <p style={{ fontSize: "11px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#c0392b", marginTop: "6px" }}>
                        {buyNowError}
                      </p>
                    )}
                  </div>
                  <p style={{ fontSize: "11px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a", marginBottom: "32px" }}>
                    Auction starts at your reserve price.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <GoldButton variant="primary" size="lg" className="w-full" onClick={() => setStep(3)} disabled={!canProceedStep2}>
                      Continue
                    </GoldButton>
                    <GoldButton variant="outline" size="md" className="w-full" onClick={() => setStep(1)}>
                      Back
                    </GoldButton>
                  </div>
                </>
              )}

              {/* ── STEP 3: Auction Duration ── */}
              {step === 3 && (
                <>
                  <p style={S.eyebrow}>Duration</p>
                  <h2 style={S.heading}>Auction Duration</h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
                    {(["24h", "48h", "7d"] as AuctionDuration[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        style={{
                          padding: "16px 20px",
                          textAlign: "left",
                          background: "#ffffff",
                          border: duration === d ? "1px solid #080808" : "1px solid #e0e0e0",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "border-color 0.15s",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "13px", color: "#080808", fontWeight: duration === d ? 600 : 400 }}>
                          {DURATION_LABELS[d]}
                        </span>
                        {duration === d && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7L5.5 10.5L12 3.5" stroke="#080808" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <GoldButton variant="primary" size="lg" className="w-full" onClick={() => setStep(4)}>
                      Continue
                    </GoldButton>
                    <GoldButton variant="outline" size="md" className="w-full" onClick={() => setStep(2)}>
                      Back
                    </GoldButton>
                  </div>
                </>
              )}

              {/* ── STEP 4: Condition Notes ── */}
              {step === 4 && (
                <>
                  <p style={S.eyebrow}>Condition</p>
                  <h2 style={S.heading}>Condition Notes</h2>

                  <div style={{ marginBottom: "32px" }}>
                    <label style={S.label}>Optional</label>
                    <textarea
                      value={condition}
                      onChange={(e) => { if (e.target.value.length <= 300) setCondition(e.target.value); }}
                      placeholder="Describe the condition of your item..."
                      rows={5}
                      style={{
                        width: "100%",
                        padding: "12px",
                        fontSize: "13px",
                        fontFamily: "var(--font-dm-sans), sans-serif",
                        color: "#080808",
                        background: "#ffffff",
                        border: "1px solid #e0e0e0",
                        outline: "none",
                        resize: "vertical",
                        boxSizing: "border-box",
                        lineHeight: 1.6,
                      }}
                    />
                    <p style={{ fontSize: "10px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a", marginTop: "6px", textAlign: "right" }}>
                      {condition.length} / 300
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <GoldButton variant="primary" size="lg" className="w-full" onClick={() => setStep(5)}>
                      Continue
                    </GoldButton>
                    <GoldButton variant="outline" size="md" className="w-full" onClick={() => setStep(3)}>
                      Back
                    </GoldButton>
                  </div>
                </>
              )}

              {/* ── STEP 5: Confirmation ── */}
              {step === 5 && (
                <>
                  <p style={S.eyebrow}>Review Listing</p>
                  <h2 style={S.heading}>Confirm Listing</h2>

                  <div style={{ borderTop: "1px solid #e0e0e0", marginBottom: "28px" }}>
                    {([
                      { label: "Item", value: purchase.productName, mono: false },
                      { label: "Certificate", value: purchase.certificateId, mono: true, gold: true },
                      { label: "Reserve Price", value: formatPrice(parseFloat(reservePrice)), mono: true },
                      ...(buyNowPrice.trim() ? [{ label: "Buy Now Price", value: formatPrice(parseFloat(buyNowPrice)), mono: true }] : []),
                      { label: "Min. Increment", value: formatPrice(parseFloat(minimumIncrement) || 50), mono: true },
                      { label: "Duration", value: DURATION_LABELS[duration], mono: false },
                      ...(condition.trim() ? [{ label: "Condition", value: condition.trim(), mono: false }] : []),
                    ] as { label: string; value: string; mono: boolean; gold?: boolean }[]).map(({ label, value, mono, gold }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid #e0e0e0", gap: "16px" }}>
                        <span style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a", flexShrink: 0 }}>
                          {label}
                        </span>
                        <span style={{ fontFamily: mono ? "var(--font-ibm-mono), monospace" : "var(--font-dm-sans), sans-serif", fontSize: "12px", color: gold ? "#C9A84C" : "#080808", textAlign: "right", wordBreak: "break-all" }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <GoldButton variant="primary" size="lg" className="w-full" onClick={handleConfirm}>
                      List for Auction
                    </GoldButton>
                    <GoldButton variant="outline" size="md" className="w-full" onClick={() => setStep(4)}>
                      Back
                    </GoldButton>
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
