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
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// stripePromise must be at module level — never inside a component
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface CheckoutModalProps {
  product: Product;
  onClose: () => void;
  onComplete?: (session: CheckoutSession, walletAddress: string | undefined) => void;
}

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

// ── Stripe payment form (must be inside <Elements>) ───────────────────────────

interface StripePaymentFormProps {
  total: number;
  onSuccess: () => void;
  paymentError: string | null;
  setPaymentError: (v: string | null) => void;
  paymentLoading: boolean;
  setPaymentLoading: (v: boolean) => void;
  onBack: () => void;
}

function StripePaymentForm({
  total,
  onSuccess,
  paymentError,
  setPaymentError,
  paymentLoading,
  setPaymentLoading,
  onBack,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [stripeLoadTimedOut, setStripeLoadTimedOut] = useState(false);

  console.log("STRIPE DEBUG:", {
    stripe: !!stripe,
    elements: !!elements,
    stripeLoadTimedOut,
    timestamp: Date.now(),
  });

  useEffect(() => {
    if (stripe && elements) {
      setStripeLoadTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      if (!stripe || !elements) {
        setStripeLoadTimedOut(true);
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [stripe, elements]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaymentLoading(true);
    setPaymentError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {},
      redirect: "if_required",
    });

    if (error) {
      const msg =
        error.type === "card_error" || error.type === "validation_error"
          ? (error.message ?? "Card declined.")
          : "Payment failed. Please try again.";
      setPaymentError(msg);
      setPaymentLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess();
    } else if (paymentIntent?.status === "requires_action") {
      setPaymentError("Additional verification required. Please try again.");
      setPaymentLoading(false);
    } else {
      setPaymentError("Payment is processing. Please wait.");
      setPaymentLoading(false);
    }
  }

  if (stripeLoadTimedOut) {
    return (
      <div>
        <p style={{ fontSize: 12, color: RED, fontFamily: "var(--font-dm-sans), sans-serif", marginBottom: 12, lineHeight: 1.5 }}>
          Payment form failed to load. This may be caused by an ad blocker
          or browser extension. Please disable ad blockers for this site
          and refresh the page.
        </p>
        <GoldButton
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </GoldButton>
      </div>
    );
  }

  if (!stripe || !elements) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, height: 80 }}>
        <span style={{
          display: "inline-block", width: 18, height: 18,
          border: "1.5px solid #C9A84C", borderTopColor: "transparent",
          borderRadius: "50%", animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ fontSize: 12, color: MUTED, fontFamily: "var(--font-dm-sans), sans-serif" }}>
          Loading payment form...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 20 }}>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {paymentError && (
        <p style={{ fontSize: 12, color: RED, fontFamily: "var(--font-dm-sans), sans-serif", marginBottom: 12, lineHeight: 1.5 }}>
          {paymentError}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <GoldButton
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={paymentLoading}
          disabled={paymentLoading}
        >
          Pay {formatPrice(total)}
        </GoldButton>
        <GoldButton
          type="button"
          variant="outline"
          size="md"
          className="w-full"
          onClick={onBack}
          disabled={paymentLoading}
        >
          Back
        </GoldButton>
      </div>
    </form>
  );
}

const STEP_LABELS = ["Order Summary", "Shipping", "Payment", "Certificate"];

export default function CheckoutModal({ product, onClose, onComplete }: CheckoutModalProps) {
  const reduced = useReducedMotion();
  const { address: walletAddress } = useWallet();
  const { show: showToast } = useToast();

  const [session] = useState<CheckoutSession>(() =>
    generateCheckoutSession(product.id, Date.now())
  );
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [copied, setCopied] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);

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
    if (step === 2 || step === 3) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, onClose]);

  // Fetch PaymentIntent when user reaches step 3
  useEffect(() => {
    if (step !== 3 || clientSecret) return;
    const amountCents = Math.round(total * 100);
    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountCents }),
    })
      .then((r) => r.json())
      .then((data: { clientSecret?: string; error?: string }) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setIntentError(data.error ?? "Failed to initialize payment. Please try again.");
        }
      })
      .catch(() => setIntentError("Failed to initialize payment. Please try again."));
  }, [step, clientSecret, total]);

  function handlePaymentSuccess() {
    setStep(4);
    onComplete?.(session, walletAddress);
    showToast("Added to Collection", "gold");
  }

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

  const issuedDate = new Date(session.timestamp).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });

  const shippingDisplayLines = [
    shippingAddress.addr1,
    shippingAddress.addr2,
    [shippingAddress.city, shippingAddress.state, shippingAddress.postal].filter(Boolean).join(", "),
    shippingAddress.country,
  ].filter(Boolean);

  // Authenticated (exclusive) items must carry a pre-assigned certificateId —
  // checkout never generates one. Missing it blocks the purchase entirely.
  const missingCertificate = product.stock_type === "exclusive" && !product.certificateId;

  useEffect(() => {
    if (missingCertificate) {
      console.error("AUTHENTICATED ITEM MISSING CERTIFICATE ID: " + product.id);
    }
  }, [missingCertificate, product.id]);

  if (missingCertificate) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <motion.div
          initial={reduced ? {} : { opacity: 0 }}
          animate={reduced ? {} : { opacity: 1 }}
          exit={reduced ? {} : { opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ position: "absolute", inset: 0, background: "rgba(8,8,8,0.65)" }}
          onClick={onClose}
        />
        <motion.div
          initial={reduced ? {} : { opacity: 0, scale: 0.97, y: 10 }}
          animate={reduced ? {} : { opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 448, background: "#ffffff", border: `1px solid ${BORDER_DARK}`, padding: 32 }}
          onClick={(e) => e.stopPropagation()}
        >
          <p style={{ fontSize: 10, letterSpacing: "0.4em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED, marginBottom: 20 }}>
            Checkout
          </p>
          <p style={{ fontSize: 14, fontFamily: "var(--font-dm-sans), sans-serif", color: BLACK, lineHeight: 1.6, marginBottom: 24 }}>
            This item is missing authentication data and cannot be purchased.
            Please contact support.
          </p>
          <GoldButton variant="primary" size="lg" className="w-full" onClick={onClose}>
            Close
          </GoldButton>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {/* Backdrop */}
      <motion.div
        initial={reduced ? {} : { opacity: 0 }}
        animate={reduced ? {} : { opacity: 1 }}
        exit={reduced ? {} : { opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{ position: "absolute", inset: 0, background: "rgba(8,8,8,0.65)" }}
        onClick={step === 1 || step === 4 ? onClose : undefined}
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
                  <MetaRow label="Certificate ID" value={product.certificateId ?? ""} gold />
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

            {/* ── Step 3: Payment ── */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={reduced ? {} : { opacity: 0, x: 20 }}
                animate={reduced ? {} : { opacity: 1, x: 0 }}
                exit={reduced ? {} : { opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <h3 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 22, fontWeight: 300, color: BLACK, letterSpacing: "0.04em", marginBottom: 24 }}>
                  Payment
                </h3>

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
                </div>

                {intentError ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontSize: 12, color: RED, fontFamily: "var(--font-dm-sans), sans-serif", lineHeight: 1.5 }}>
                      {intentError}
                    </p>
                    <GoldButton variant="outline" size="md" className="w-full" onClick={() => setStep(2)}>
                      Back
                    </GoldButton>
                  </div>
                ) : !clientSecret ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80 }}>
                    <span style={{
                      display: "inline-block", width: 18, height: 18,
                      border: "1.5px solid #C9A84C", borderTopColor: "transparent",
                      borderRadius: "50%", animation: "spin 0.8s linear infinite",
                    }} />
                  </div>
                ) : (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: "stripe",
                        variables: {
                          colorPrimary: "#C9A84C",
                          fontFamily: "DM Sans, sans-serif",
                          borderRadius: "0px",
                        },
                      },
                    }}
                  >
                    <StripePaymentForm
                      total={total}
                      onSuccess={handlePaymentSuccess}
                      paymentError={paymentError}
                      setPaymentError={setPaymentError}
                      paymentLoading={paymentLoading}
                      setPaymentLoading={setPaymentLoading}
                      onBack={() => setStep(2)}
                    />
                  </Elements>
                )}
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
                      {product.certificateId}
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
                      navigator.clipboard.writeText(product.certificateId ?? "").then(() => {
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
                  <Link href={`/verify?id=${product.certificateId}`} onClick={onClose} className="block">
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
