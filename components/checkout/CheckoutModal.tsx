"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/mock-data";
import { generateCheckoutSession, type CheckoutSession } from "@/lib/mock-checkout";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/components/ui/Toast";
import { formatPrice, formatAddress } from "@/lib/utils";
import GoldButton from "@/components/ui/GoldButton";

interface CheckoutModalProps {
  product: Product;
  onClose: () => void;
  onComplete?: (session: CheckoutSession, walletAddress: string | undefined) => void;
}

type TxPhase = "signing" | "broadcasting" | "confirming" | "confirmed";
type ShippingMethod = "standard" | "express" | "overnight";

interface ShippingAddress {
  name: string;
  addr1: string;
  addr2: string;
  city: string;
  state: string;
  postal: string;
  country: string;
}

type AddressErrors = Partial<Record<keyof ShippingAddress, string>>;

const GOLD = "#C9A84C";
const BLACK = "#080808";
const MUTED = "#6b6b6b";
const BORDER = "#e0e0e0";
const BORDER_DARK = "#cccccc";
const RED = "#c0392b";

const SHIPPING_OPTIONS: { id: ShippingMethod; label: string; detail: string; cost: number }[] = [
  { id: "standard", label: "Standard", detail: "5–7 business days", cost: 0 },
  { id: "express", label: "Express", detail: "2–3 business days", cost: 15 },
  { id: "overnight", label: "Overnight", detail: "Next business day", cost: 35 },
];

function GoldCheckmark({ reduced }: { reduced: boolean | null }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, margin: "0 auto 24px" }}>
      {!reduced && (
        <motion.div
          style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)" }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        />
      )}
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden style={{ position: "absolute", inset: 0 }}>
        <motion.circle
          cx="32" cy="32" r="29"
          stroke={GOLD} strokeWidth="1.5" fill="none" pathLength={1}
          initial={reduced ? {} : { pathLength: 0, opacity: 0 }}
          animate={reduced ? {} : { pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </svg>
      <svg width="26" height="20" viewBox="0 0 26 20" fill="none" aria-hidden>
        <motion.path
          d="M2 10L9 17L24 2"
          stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1}
          initial={reduced ? {} : { pathLength: 0 }}
          animate={reduced ? {} : { pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.55, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}

function MetaRow({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 11, color: gold ? GOLD : BLACK }}>
        {value}
      </span>
    </div>
  );
}

function FieldInput({
  label, value, onChange, error, placeholder, optional,
}: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; placeholder?: string; optional?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: error ? RED : MUTED }}>
        {label}{optional && <span style={{ marginLeft: 4, opacity: 0.6 }}>optional</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: "10px 12px",
          border: `1px solid ${error ? RED : BORDER}`,
          background: "#fff",
          fontFamily: "var(--font-dm-sans), sans-serif",
          fontSize: 13,
          color: BLACK,
          outline: "none",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = GOLD; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = error ? RED : BORDER; }}
      />
      {error && (
        <span style={{ fontSize: 10, fontFamily: "var(--font-dm-sans), sans-serif", color: RED }}>
          {error}
        </span>
      )}
    </div>
  );
}

const TX_PHASES: TxPhase[] = ["signing", "broadcasting", "confirming", "confirmed"];
const TX_PHASE_LABELS: Record<TxPhase, string> = {
  signing: "Signing Transaction",
  broadcasting: "Broadcasting to Polygon",
  confirming: "Awaiting Confirmations",
  confirmed: "Transaction Confirmed",
};

const STEP_LABELS = ["Order Summary", "Shipping", "Payment", "Certificate"];

export default function CheckoutModal({ product, onClose, onComplete }: CheckoutModalProps) {
  const reduced = useReducedMotion();
  const { address: walletAddress } = useWallet();
  const { show: showToast } = useToast();

  const [session] = useState<CheckoutSession>(() =>
    generateCheckoutSession(product.id, Date.now())
  );
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [txPhase, setTxPhase] = useState<TxPhase>("signing");
  const [txHashRevealed, setTxHashRevealed] = useState(0);
  const [confirmationCount, setConfirmationCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("standard");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: "", addr1: "", addr2: "", city: "", state: "", postal: "", country: "United States",
  });
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});

  const selectedShipping = SHIPPING_OPTIONS.find((o) => o.id === shippingMethod)!;
  const total = product.price + selectedShipping.cost;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (step === 3) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, onClose]);

  useEffect(() => {
    if (step !== 3) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];

    setTxPhase("signing");
    setTxHashRevealed(0);
    setConfirmationCount(0);

    const t1 = setTimeout(() => {
      const total = session.txHash.length;
      let revealed = 0;
      const typer = setInterval(() => {
        revealed += 2;
        setTxHashRevealed(Math.min(revealed, total));
        if (revealed >= total) {
          clearInterval(typer);
          setTxPhase("broadcasting");
          const t2 = setTimeout(() => {
            setTxPhase("confirming");
            let count = 0;
            const confirmer = setInterval(() => {
              count++;
              setConfirmationCount(count);
              if (count >= 12) {
                clearInterval(confirmer);
                setTxPhase("confirmed");
                const t3 = setTimeout(() => {
                  setStep(4);
                  onComplete?.(session, walletAddress);
                  showToast("Added to Collection", "gold");
                }, 700);
                timers.push(t3);
              }
            }, 220);
            intervals.push(confirmer);
          }, 700);
          timers.push(t2);
        }
      }, 18);
      intervals.push(typer);
    }, 600);
    timers.push(t1);

    return () => {
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [step, session.txHash]);

  function validateAddress(): boolean {
    const errors: AddressErrors = {};
    if (!shippingAddress.name.trim()) errors.name = "Required";
    if (!shippingAddress.addr1.trim()) errors.addr1 = "Required";
    if (!shippingAddress.city.trim()) errors.city = "Required";
    if (!shippingAddress.state.trim()) errors.state = "Required";
    if (!shippingAddress.postal.trim()) errors.postal = "Required";
    if (!shippingAddress.country.trim()) errors.country = "Required";
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function updateField(field: keyof ShippingAddress, value: string) {
    setShippingAddress((prev) => ({ ...prev, [field]: value }));
    if (addressErrors[field]) {
      setAddressErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  const currentPhaseIndex = TX_PHASES.indexOf(txPhase);
  const issuedDate = new Date(session.timestamp).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });

  const shippingDisplayLines = [
    shippingAddress.addr1,
    shippingAddress.addr2,
    [shippingAddress.city, shippingAddress.state, shippingAddress.postal].filter(Boolean).join(", "),
    shippingAddress.country,
  ].filter(Boolean);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {/* Backdrop */}
      <motion.div
        initial={reduced ? {} : { opacity: 0 }}
        animate={reduced ? {} : { opacity: 1 }}
        exit={reduced ? {} : { opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{ position: "absolute", inset: 0, background: "rgba(8,8,8,0.65)" }}
        onClick={step !== 3 ? onClose : undefined}
      />

      {/* Card */}
      <motion.div
        initial={reduced ? {} : { opacity: 0, scale: 0.97, y: 10 }}
        animate={reduced ? {} : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 448, background: "#ffffff", border: `1px solid ${BORDER_DARK}`, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "32px 32px 24px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.4em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED }}>
              Checkout
            </p>
            {step !== 3 && (
              <button
                onClick={onClose}
                aria-label="Close"
                style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: BLACK, background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                  <path d="M1 1L10 10M10 1L1 10" stroke={BLACK} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Step indicators */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {STEP_LABELS.map((label, i) => {
              const num = i + 1;
              const done = step > num;
              const current = step === num;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 20, height: 20,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9,
                      fontFamily: "var(--font-ibm-mono), monospace",
                      background: done || current ? GOLD : "transparent",
                      border: done || current ? "none" : `1px solid ${BORDER_DARK}`,
                      color: done || current ? BLACK : MUTED,
                      transition: "background 0.3s, border 0.3s, color 0.3s",
                      flexShrink: 0,
                    }}>
                      {done ? "✓" : num}
                    </div>
                    <span style={{
                      fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      color: current ? BLACK : MUTED,
                      display: "none",
                      transition: "color 0.3s",
                    }}
                    className="sm:block">
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div style={{
                      width: 16, height: 1, margin: "0 8px",
                      background: done ? GOLD : BORDER,
                      transition: "background 0.3s",
                      flexShrink: 0,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div style={{ padding: "32px" }}>
          <AnimatePresence mode="wait">

            {/* ── Step 1: Order Summary + Shipping Method ── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={reduced ? {} : { opacity: 0, x: 20 }}
                animate={reduced ? {} : { opacity: 1, x: 0 }}
                exit={reduced ? {} : { opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {/* Product row */}
                <div style={{ display: "flex", gap: 20, marginBottom: 28 }}>
                  <div style={{ position: "relative", width: 80, aspectRatio: "3/4", background: "#f0ede8", flexShrink: 0, overflow: "hidden" }}>
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="80px" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                    <p style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED, marginBottom: 4 }}>
                      {product.category}
                    </p>
                    <h3 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 20, fontWeight: 300, color: BLACK, letterSpacing: "0.04em", lineHeight: 1.25, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {product.name}
                    </h3>
                    {product.edition && (
                      <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 11, color: MUTED }}>
                        {product.edition}
                      </p>
                    )}
                  </div>
                </div>

                {/* Shipping method selection */}
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED, marginBottom: 10 }}>
                    Shipping Method
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {SHIPPING_OPTIONS.map((opt) => {
                      const selected = shippingMethod === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setShippingMethod(opt.id)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "12px 16px",
                            border: `1px solid ${selected ? GOLD : BORDER}`,
                            background: selected ? "rgba(201,168,76,0.04)" : "#fff",
                            cursor: "pointer",
                            transition: "border-color 0.2s, background 0.2s",
                            textAlign: "left",
                            width: "100%",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                              width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                              border: `1px solid ${selected ? GOLD : BORDER_DARK}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "border-color 0.2s",
                            }}>
                              {selected && (
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />
                              )}
                            </div>
                            <div>
                              <p style={{ fontSize: 12, fontFamily: "var(--font-dm-sans), sans-serif", color: BLACK, marginBottom: 1, fontWeight: selected ? 500 : 400 }}>
                                {opt.label}
                              </p>
                              <p style={{ fontSize: 10, fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED }}>
                                {opt.detail}
                              </p>
                            </div>
                          </div>
                          <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 12, color: selected ? GOLD : MUTED, flexShrink: 0 }}>
                            {opt.cost === 0 ? "Free" : formatPrice(opt.cost)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Order details box */}
                <div style={{ border: `1px solid ${BORDER}`, padding: 20, display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                  <MetaRow label="Item" value={formatPrice(product.price)} />
                  <MetaRow
                    label="Shipping"
                    value={selectedShipping.cost === 0 ? "Free" : formatPrice(selectedShipping.cost)}
                  />
                  <div style={{ height: 1, background: BORDER }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: BLACK, fontWeight: 500 }}>
                      Total
                    </span>
                    <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 13, color: BLACK, fontWeight: 600 }}>
                      {formatPrice(total)}
                    </span>
                  </div>
                  <div style={{ height: 1, background: BORDER }} />
                  <MetaRow label="Certificate ID" value={session.certificateId} gold />
                  {walletAddress && (
                    <MetaRow label="Owner Wallet" value={formatAddress(walletAddress)} />
                  )}
                  <MetaRow label="Network" value="Polygon" />
                </div>

                <GoldButton variant="primary" size="lg" className="w-full" onClick={() => setStep(2)}>
                  Continue to Shipping
                </GoldButton>
              </motion.div>
            )}

            {/* ── Step 2: Shipping Address ── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={reduced ? {} : { opacity: 0, x: 20 }}
                animate={reduced ? {} : { opacity: 1, x: 0 }}
                exit={reduced ? {} : { opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <h3 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 22, fontWeight: 300, color: BLACK, letterSpacing: "0.04em", marginBottom: 24 }}>
                  Shipping Address
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
                  <FieldInput
                    label="Full Name"
                    value={shippingAddress.name}
                    onChange={(v) => updateField("name", v)}
                    error={addressErrors.name}
                    placeholder="Jane Doe"
                  />
                  <FieldInput
                    label="Address Line 1"
                    value={shippingAddress.addr1}
                    onChange={(v) => updateField("addr1", v)}
                    error={addressErrors.addr1}
                    placeholder="123 Main St"
                  />
                  <FieldInput
                    label="Address Line 2"
                    value={shippingAddress.addr2}
                    onChange={(v) => updateField("addr2", v)}
                    placeholder="Apt, suite, etc."
                    optional
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FieldInput
                      label="City"
                      value={shippingAddress.city}
                      onChange={(v) => updateField("city", v)}
                      error={addressErrors.city}
                      placeholder="New York"
                    />
                    <FieldInput
                      label="State / Province"
                      value={shippingAddress.state}
                      onChange={(v) => updateField("state", v)}
                      error={addressErrors.state}
                      placeholder="NY"
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FieldInput
                      label="Postal Code"
                      value={shippingAddress.postal}
                      onChange={(v) => updateField("postal", v)}
                      error={addressErrors.postal}
                      placeholder="10001"
                    />
                    <FieldInput
                      label="Country"
                      value={shippingAddress.country}
                      onChange={(v) => updateField("country", v)}
                      error={addressErrors.country}
                      placeholder="United States"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <GoldButton
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      if (validateAddress()) setStep(3);
                    }}
                  >
                    Continue to Payment
                  </GoldButton>
                  <GoldButton variant="outline" size="md" className="w-full" onClick={() => setStep(1)}>
                    Back
                  </GoldButton>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Payment Simulation ── */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={reduced ? {} : { opacity: 0, x: 20 }}
                animate={reduced ? {} : { opacity: 1, x: 0 }}
                exit={reduced ? {} : { opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {/* Active phase label */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, flexShrink: 0, animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} className="animate-pulse" />
                  <motion.p
                    key={txPhase}
                    initial={reduced ? {} : { opacity: 0, y: 4 }}
                    animate={reduced ? {} : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ fontSize: 10, letterSpacing: "0.35em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: GOLD }}
                  >
                    {TX_PHASE_LABELS[txPhase]}
                  </motion.p>
                </div>

                {/* Phase list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}>
                  {TX_PHASES.map((phase, i) => {
                    const done = i < currentPhaseIndex;
                    const active = i === currentPhaseIndex;
                    return (
                      <div key={phase} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                        {/* Dot */}
                        <div style={{ flexShrink: 0, marginTop: 2, width: 16, height: 16 }}>
                          {done ? (
                            <motion.div
                              initial={reduced ? {} : { scale: 0 }}
                              animate={reduced ? {} : { scale: 1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                              style={{ width: 16, height: 16, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden>
                                <path d="M1 3L3 5L7 1" stroke={BLACK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </motion.div>
                          ) : active ? (
                            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} className="animate-pulse" />
                            </div>
                          ) : (
                            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${BORDER_DARK}` }} />
                          )}
                        </div>

                        {/* Detail */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
                            fontFamily: "var(--font-dm-sans), sans-serif",
                            marginBottom: 4,
                            color: done ? MUTED : active ? BLACK : BORDER_DARK,
                          }}>
                            {TX_PHASE_LABELS[phase]}
                          </p>

                          {/* Typewriter tx hash */}
                          {phase === "signing" && (done || active) && (
                            <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 10, color: MUTED, wordBreak: "break-all", lineHeight: 1.6 }}>
                              {session.txHash.slice(0, txHashRevealed)}
                              {txHashRevealed < session.txHash.length && active && (
                                <motion.span
                                  animate={{ opacity: [1, 0] }}
                                  transition={{ duration: 0.5, repeat: Infinity }}
                                  style={{ display: "inline-block", width: 2, height: 12, background: GOLD, verticalAlign: "middle", marginLeft: 2 }}
                                />
                              )}
                            </p>
                          )}

                          {/* Confirmation progress */}
                          {phase === "confirming" && active && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 10, color: MUTED }}>
                                  {confirmationCount} / 12 confirmations
                                </span>
                                <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 10, color: MUTED }}>
                                  {Math.round((confirmationCount / 12) * 100)}%
                                </span>
                              </div>
                              <div style={{ height: 2, background: BORDER, width: "100%", overflow: "hidden" }}>
                                <motion.div
                                  style={{ height: "100%", background: GOLD }}
                                  animate={{ width: `${(confirmationCount / 12) * 100}%` }}
                                  transition={{ duration: 0.2, ease: "easeOut" }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Gas details */}
                <div style={{ border: `1px solid ${BORDER}`, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <MetaRow label="Block" value={session.blockNumber.toLocaleString("en-US")} />
                  <MetaRow label="Gas Used" value={session.gasUsed} />
                  <MetaRow label="Gas Price" value={session.gasPrice} />
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Certificate Minted ── */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={reduced ? {} : { opacity: 0, x: 20 }}
                animate={reduced ? {} : { opacity: 1, x: 0 }}
                exit={reduced ? {} : { opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <GoldCheckmark reduced={reduced} />

                <motion.div
                  initial={reduced ? {} : { opacity: 0 }}
                  animate={reduced ? {} : { opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  style={{ textAlign: "center", marginBottom: 32 }}
                >
                  <p style={{ fontSize: 10, letterSpacing: "0.4em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: GOLD, marginBottom: 8 }}>
                    Authenticated
                  </p>
                  <h3 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 24, fontWeight: 300, color: BLACK, letterSpacing: "0.04em" }}>
                    Certificate Minted
                  </h3>
                  <p style={{ marginTop: 4, fontSize: 14, fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED }}>
                    {product.name}
                  </p>
                </motion.div>

                <motion.div
                  initial={reduced ? {} : { opacity: 0 }}
                  animate={reduced ? {} : { opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                  style={{ border: `1px solid ${GOLD}`, padding: 20, display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}
                >
                  {/* Certificate ID with glow animation */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED }}>
                      Certificate
                    </span>
                    <motion.span
                      initial={reduced ? {} : { textShadow: "0 0 0px rgba(201,168,76,0)" }}
                      animate={reduced ? {} : { textShadow: ["0 0 0px rgba(201,168,76,0)", "0 0 16px rgba(201,168,76,0.8)", "0 0 6px rgba(201,168,76,0.4)"] }}
                      transition={{ duration: 1.6, delay: 0.9, ease: "easeOut", times: [0, 0.35, 1] }}
                      style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 11, color: GOLD }}
                    >
                      {session.certificateId}
                    </motion.span>
                  </div>
                  {walletAddress && (
                    <MetaRow label="Owner" value={formatAddress(walletAddress)} />
                  )}
                  <MetaRow
                    label="Transaction"
                    value={`${session.txHash.slice(0, 10)}...${session.txHash.slice(-6)}`}
                  />
                  <MetaRow label="Issued" value={issuedDate} />
                  <MetaRow label="Network" value="Polygon" />
                </motion.div>

                {/* Shipping summary */}
                <motion.div
                  initial={reduced ? {} : { opacity: 0 }}
                  animate={reduced ? {} : { opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.75 }}
                  style={{ border: `1px solid ${BORDER}`, padding: 16, display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED, flexShrink: 0 }}>
                      Shipping
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 11, color: BLACK, marginBottom: 2 }}>
                        {selectedShipping.label} · {selectedShipping.detail}
                      </p>
                      {shippingDisplayLines.map((line, i) => (
                        <p key={i} style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 11, color: MUTED }}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={reduced ? {} : { opacity: 0 }}
                  animate={reduced ? {} : { opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <GoldButton
                    variant="ghost"
                    size="md"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(session.certificateId).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                  >
                    {copied ? "Copied ✓" : "Copy Certificate ID"}
                  </GoldButton>
                  <Link href="/library" onClick={onClose} className="block">
                    <GoldButton variant="outline" size="md" className="w-full">
                      View in Library
                    </GoldButton>
                  </Link>
                  <Link href={`/verify?id=${session.certificateId}`} onClick={onClose} className="block">
                    <GoldButton variant="primary" size="lg" className="w-full">
                      Verify Certificate
                    </GoldButton>
                  </Link>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
