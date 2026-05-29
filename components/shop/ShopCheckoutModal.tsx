"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import GoldButton from "@/components/ui/GoldButton";
import { useAuth } from "@/hooks/useAuth";
import { readCards, type SavedCard } from "@/lib/payment-storage";

// ── Shipping ─────────────────────────────────────────────────────────────────

type ShippingMethodId = "standard" | "express" | "overnight";

type ShippingMethod = {
  id: ShippingMethodId;
  label: string;
  price: number;
  eta: string;
};

const SHIPPING_METHODS: ShippingMethod[] = [
  { id: "standard", label: "Standard Shipping", price: 0,  eta: "5–7 business days" },
  { id: "express",  label: "Express Shipping",  price: 15, eta: "2–3 business days" },
  { id: "overnight",label: "Overnight Shipping",price: 35, eta: "Next business day"  },
];

// ── Address ───────────────────────────────────────────────────────────────────

type ShippingAddress = {
  fullName:   string;
  line1:      string;
  line2:      string;
  city:       string;
  state:      string;
  postalCode: string;
  country:    string;
};

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "United States",
};

const REQUIRED: (keyof ShippingAddress)[] = ["fullName", "line1", "city", "state", "postalCode", "country"];

// ── Public types ──────────────────────────────────────────────────────────────

export type CheckoutResult = {
  orderId:        string;
  trackingNumber: string;
  shippingMethod: ShippingMethod;
  address:        ShippingAddress;
  purchasedAt:    string;
  size?:          string;
};

interface ShopCheckoutModalProps {
  product:      Product;
  selectedSize?: string;
  onConfirm:    (result: CheckoutResult) => void;
  onClose:      () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId(prefix: string, parts: number[]): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${prefix}-${parts.map(rand).join("-")}`;
}

// ── Shared inline style fragments ─────────────────────────────────────────────

const S = {
  label: {
    fontSize: "9px",
    letterSpacing: "0.3em",
    textTransform: "uppercase" as const,
    fontFamily: "var(--font-dm-sans), sans-serif",
    color: "#8a8a8a",
    display: "block",
    marginBottom: "6px",
  },
  input: (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    height: "40px",
    padding: "0 12px",
    fontSize: "13px",
    fontFamily: "var(--font-dm-sans), sans-serif",
    color: "#080808",
    background: "#ffffff",
    border: `1px solid ${hasError ? "#b00000" : "#e0e0e0"}`,
    outline: "none",
    boxSizing: "border-box",
  }),
  error: {
    fontSize: "10px",
    color: "#b00000",
    fontFamily: "var(--font-dm-sans), sans-serif",
    marginTop: "4px",
  } as React.CSSProperties,
  row: (mb = "8px"): React.CSSProperties => ({
    display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: mb,
  }),
  rowLabel: {
    fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase" as const,
    fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a",
  },
  mono: (size = "13px"): React.CSSProperties => ({
    fontFamily: "var(--font-ibm-mono), monospace", fontSize: size, color: "#080808",
  }),
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ShopCheckoutModal({ product, selectedSize, onConfirm, onClose }: ShopCheckoutModalProps) {
  const reduced = useReducedMotion();
  const { user } = useAuth();

  const cards: SavedCard[] = user?.email ? readCards(user.email) : [];
  const primaryCard = cards[0] ?? null;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showCardError, setShowCardError] = useState(false);
  const [shippingMethodId, setShippingMethodId] = useState<ShippingMethodId>("standard");
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

  // Generated exactly once when the user first reaches step 3
  const confirmRef = useRef<{ orderId: string; trackingNumber: string } | null>(null);

  const method = SHIPPING_METHODS.find((m) => m.id === shippingMethodId) ?? SHIPPING_METHODS[0];
  const subtotal = product.price;
  const shippingCost = method.price;
  const total = subtotal + shippingCost;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function updateField(field: keyof ShippingAddress, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function handleContinue() {
    console.log("CONTINUE CLICKED", { user: user?.email, cards });
    if (!primaryCard) {
      setShowCardError(true);
      return;
    }
    setShowCardError(false);
    setStep(2);
  }

  function validateAndContinue() {
    const next: Partial<Record<keyof ShippingAddress, string>> = {};
    for (const f of REQUIRED) {
      if (!address[f].trim()) next[f] = "Required";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    if (!confirmRef.current) {
      confirmRef.current = { orderId: genId("ORD", [4, 4]), trackingNumber: genId("TRK", [4, 4]) };
    }
    setStep(3);
  }

  function handleConfirmOrder() {
    if (!confirmRef.current) return;
    onConfirm({
      orderId:        confirmRef.current.orderId,
      trackingNumber: confirmRef.current.trackingNumber,
      shippingMethod: method,
      address,
      purchasedAt:    new Date().toISOString(),
      size:           selectedSize,
    });
  }

  // ── Step indicator ──────────────────────────────────────────────────────────

  const stepLabels = ["Order Summary", "Shipping Address", "Confirm Order"];

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
          position: "fixed", inset: 0, zIndex: 70,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px", pointerEvents: "none",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#ffffff", width: "100%", maxWidth: "440px",
            maxHeight: "90vh", overflowY: "auto",
            padding: "40px", pointerEvents: "auto",
          }}
        >
          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "28px" }}>
            {([1, 2, 3] as const).map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{
                  fontSize: "9px", fontFamily: "var(--font-dm-sans), sans-serif",
                  letterSpacing: "0.1em",
                  color: step === s ? "#080808" : step > s ? "var(--gold)" : "#cccccc",
                  fontWeight: step === s ? 600 : 400,
                  borderBottom: step === s ? "1px solid #080808" : "none",
                  paddingBottom: "1px",
                }}>
                  {s}
                </span>
                {i < 2 && (
                  <div style={{ width: "20px", height: "1px", background: step > s ? "var(--gold)" : "#e0e0e0" }} />
                )}
              </div>
            ))}
            <span style={{ ...S.label, marginBottom: 0, marginLeft: "6px" }}>
              {stepLabels[step - 1]}
            </span>
          </div>

          {/* ── STEP 1: Order Summary + Shipping Method ── */}
          {step === 1 && (
            <>
              <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "26px", fontWeight: 300, color: "#080808", letterSpacing: "0.04em", lineHeight: 1.2, marginBottom: "6px" }}>
                {product.name}
              </h2>
              {selectedSize && (
                <p style={{ ...S.label, marginBottom: "20px" }}>Size {selectedSize}</p>
              )}

              {/* Payment */}
              <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "20px", marginTop: selectedSize ? 0 : "20px", marginBottom: "20px" }}>
                <p style={S.label}>Payment</p>
                {primaryCard ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "24px", background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "8px", fontFamily: "var(--font-ibm-mono), monospace", color: "#080808" }}>
                        {primaryCard.cardType === "visa" ? "VI" : primaryCard.cardType === "mastercard" ? "MC" : "··"}
                      </span>
                    </div>
                    <span style={S.mono("14px")}>•••• {primaryCard.lastFour}</span>
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#3a3a3a", lineHeight: 1.6 }}>
                    Please add a payment card in{" "}
                    <a href="/account" style={{ color: "#C9A84C", textDecoration: "underline" }}>My Account</a>.
                  </p>
                )}
              </div>

              {/* Shipping method */}
              <div style={{ marginBottom: "20px" }}>
                <p style={S.label}>Shipping Method</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {SHIPPING_METHODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setShippingMethodId(m.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 14px", cursor: "pointer", textAlign: "left", background: "#ffffff",
                        border: shippingMethodId === m.id ? "1px solid #080808" : "1px solid #e0e0e0",
                        transition: "border-color 0.15s",
                      }}
                    >
                      <div>
                        <p style={{ fontSize: "12px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#080808", fontWeight: shippingMethodId === m.id ? 600 : 400, marginBottom: "2px" }}>
                          {m.label}
                        </p>
                        <p style={{ fontSize: "10px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a" }}>
                          {m.eta}
                        </p>
                      </div>
                      <span style={S.mono("12px")}>
                        {m.price === 0 ? "Free" : formatPrice(m.price)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "16px", marginBottom: "28px" }}>
                <div style={S.row("8px")}>
                  <span style={S.rowLabel}>Subtotal</span>
                  <span style={S.mono()}>{formatPrice(subtotal)}</span>
                </div>
                <div style={S.row("10px")}>
                  <span style={S.rowLabel}>Shipping</span>
                  <span style={S.mono()}>{shippingCost === 0 ? "Free" : formatPrice(shippingCost)}</span>
                </div>
                <div style={{ ...S.row("0"), borderTop: "1px solid #e0e0e0", paddingTop: "10px" }}>
                  <span style={{ ...S.rowLabel, color: "#080808", fontWeight: 600 }}>Total</span>
                  <span style={S.mono("16px")}>{formatPrice(total)}</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <GoldButton variant="primary" size="lg" className="w-full" onClick={handleContinue} disabled={false}>
                  Continue
                </GoldButton>
                <GoldButton variant="outline" size="md" className="w-full" onClick={onClose}>
                  Cancel
                </GoldButton>
                {showCardError && (
                  <p style={{ fontSize: "12px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#b00000", lineHeight: 1.5, marginTop: "2px" }}>
                    Please add a payment method to continue.{" "}
                    <Link href="/account" style={{ color: "#C9A84C", textDecoration: "underline" }}>
                      Go to My Account →
                    </Link>
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── STEP 2: Shipping Address ── */}
          {step === 2 && (
            <>
              <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "26px", fontWeight: 300, color: "#080808", letterSpacing: "0.04em", lineHeight: 1.2, marginBottom: "24px" }}>
                Shipping Address
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>

                {/* Full name */}
                <div>
                  <label style={S.label}>Full Name</label>
                  <input style={S.input(!!errors.fullName)} value={address.fullName} placeholder="Jane Smith" onChange={(e) => updateField("fullName", e.target.value)} />
                  {errors.fullName && <p style={S.error}>{errors.fullName}</p>}
                </div>

                {/* Line 1 */}
                <div>
                  <label style={S.label}>Address Line 1</label>
                  <input style={S.input(!!errors.line1)} value={address.line1} placeholder="123 Main Street" onChange={(e) => updateField("line1", e.target.value)} />
                  {errors.line1 && <p style={S.error}>{errors.line1}</p>}
                </div>

                {/* Line 2 */}
                <div>
                  <label style={S.label}>Address Line 2 <span style={{ color: "#cccccc", textTransform: "none" as const, letterSpacing: 0 }}>(Optional)</span></label>
                  <input style={S.input(false)} value={address.line2} placeholder="Apt, suite, unit" onChange={(e) => updateField("line2", e.target.value)} />
                </div>

                {/* City + State */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={S.label}>City</label>
                    <input style={S.input(!!errors.city)} value={address.city} placeholder="New York" onChange={(e) => updateField("city", e.target.value)} />
                    {errors.city && <p style={S.error}>{errors.city}</p>}
                  </div>
                  <div>
                    <label style={S.label}>State / Province</label>
                    <input style={S.input(!!errors.state)} value={address.state} placeholder="NY" onChange={(e) => updateField("state", e.target.value)} />
                    {errors.state && <p style={S.error}>{errors.state}</p>}
                  </div>
                </div>

                {/* Postal + Country */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={S.label}>Postal Code</label>
                    <input style={S.input(!!errors.postalCode)} value={address.postalCode} placeholder="10001" onChange={(e) => updateField("postalCode", e.target.value)} />
                    {errors.postalCode && <p style={S.error}>{errors.postalCode}</p>}
                  </div>
                  <div>
                    <label style={S.label}>Country</label>
                    <input style={S.input(!!errors.country)} value={address.country} onChange={(e) => updateField("country", e.target.value)} />
                    {errors.country && <p style={S.error}>{errors.country}</p>}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <GoldButton variant="primary" size="lg" className="w-full" onClick={validateAndContinue}>
                  Continue
                </GoldButton>
                <GoldButton variant="outline" size="md" className="w-full" onClick={() => setStep(1)}>
                  Back
                </GoldButton>
              </div>
            </>
          )}

          {/* ── STEP 3: Final Confirmation ── */}
          {step === 3 && confirmRef.current && (
            <>
              <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "26px", fontWeight: 300, color: "#080808", letterSpacing: "0.04em", lineHeight: 1.2, marginBottom: "24px" }}>
                Review Order
              </h2>

              {/* Product */}
              <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
                <div style={{ position: "relative", width: "68px", height: "90px", flexShrink: 0, background: "#f0ede8", overflow: "hidden" }}>
                  <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="68px" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "18px", fontWeight: 300, color: "#080808", letterSpacing: "0.04em", lineHeight: 1.3, marginBottom: "6px" }}>
                    {product.name}
                  </p>
                  {selectedSize && (
                    <p style={{ ...S.label, marginBottom: "4px" }}>Size {selectedSize}</p>
                  )}
                  {primaryCard && (
                    <p style={S.mono("11px")}>•••• {primaryCard.lastFour}</p>
                  )}
                </div>
              </div>

              {/* Shipping address */}
              <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "16px", marginBottom: "16px" }}>
                <p style={{ ...S.label, marginBottom: "8px" }}>Shipping To</p>
                <p style={{ fontSize: "12px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#080808", lineHeight: 1.8 }}>
                  {address.fullName}<br />
                  {address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />
                  {address.city}, {address.state} {address.postalCode}<br />
                  {address.country}
                </p>
              </div>

              {/* Shipping method */}
              <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "16px", marginBottom: "16px" }}>
                <div style={S.row("0")}>
                  <span style={S.rowLabel}>Shipping</span>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "12px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#080808" }}>{method.label}</p>
                    <p style={{ fontSize: "10px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a" }}>{method.eta}</p>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "16px", marginBottom: "16px" }}>
                <div style={S.row("6px")}>
                  <span style={S.rowLabel}>Subtotal</span>
                  <span style={S.mono("12px")}>{formatPrice(subtotal)}</span>
                </div>
                <div style={S.row("10px")}>
                  <span style={S.rowLabel}>Shipping</span>
                  <span style={S.mono("12px")}>{shippingCost === 0 ? "Free" : formatPrice(shippingCost)}</span>
                </div>
                <div style={{ ...S.row("0"), borderTop: "1px solid #e0e0e0", paddingTop: "10px" }}>
                  <span style={{ ...S.rowLabel, color: "#080808", fontWeight: 600 }}>Total</span>
                  <span style={S.mono("14px")}>{formatPrice(total)}</span>
                </div>
              </div>

              {/* Order info */}
              <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "16px", marginBottom: "28px" }}>
                <div style={S.row("6px")}>
                  <span style={S.rowLabel}>Order</span>
                  <span style={S.mono("11px")}>{confirmRef.current.orderId}</span>
                </div>
                <div style={S.row("0")}>
                  <span style={S.rowLabel}>Tracking</span>
                  <span style={S.mono("11px")}>{confirmRef.current.trackingNumber}</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <GoldButton variant="primary" size="lg" className="w-full" onClick={handleConfirmOrder}>
                  Confirm Order
                </GoldButton>
                <GoldButton variant="outline" size="md" className="w-full" onClick={() => setStep(2)}>
                  Back
                </GoldButton>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
