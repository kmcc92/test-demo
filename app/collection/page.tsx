"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useAuth } from "@/hooks/useAuth";
import { useOwnership } from "@/hooks/useOwnership";
import { formatPrice, getProductImage } from "@/lib/utils";
import {
  getCertificateStatus,
  clearStatus,
  type CertificateStatus,
} from "@/lib/certificate-status";
import {
  getCertificateTimeline,
  recordEvent,
  type CertificateEvent,
  type CertificateEventType,
} from "@/lib/certificate-events";
import {
  getCertificateFromRegistry,
  type RegisteredCertificate,
} from "@/lib/certificate-registry";
import {
  createServiceRequest,
  getActiveServiceRequest,
  updateServiceRequest,
  type ServiceRequest,
} from "@/lib/service-requests";
import GoldButton from "@/components/ui/GoldButton";
import AuthBadge from "@/components/ui/AuthBadge";
import type { PurchaseRecord } from "@/lib/purchase-storage";

// stripePromise must be at module level — never inside a component
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const EVENT_LABEL_MAP: Record<CertificateEventType, string> = {
  created: "Authenticated",
  purchased: "Purchased",
  transferred: "Transferred",
  reported_stolen: "Stolen Reported",
  reported_lost: "Lost Reported",
  recovered: "Recovered",
  refurbish_requested: "Refurbish Requested",
  replace_requested: "Replace Requested",
  refurbished: "Refurbished",
  replaced: "Replaced",
  listed: "Listed for Auction",
  delisted: "Removed from Auction",
};

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

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
    display: "block" as const,
    marginBottom: "8px",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    fontSize: "13px",
    fontFamily: "var(--font-dm-sans), sans-serif",
    color: "#080808",
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    outline: "none",
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
    lineHeight: 1.6,
  },
  error: {
    fontSize: "10px",
    color: "#b00000",
    fontFamily: "var(--font-dm-sans), sans-serif",
    marginTop: "4px",
  } as React.CSSProperties,
  mono: (size = "13px"): React.CSSProperties => ({
    fontFamily: "var(--font-ibm-mono), monospace", fontSize: size, color: "#080808",
  }),
};

interface CollectionItem {
  purchase: PurchaseRecord;
  displayName: string;
  status: CertificateStatus;
  timeline: CertificateEvent[];
  registryEntry: RegisteredCertificate | null;
  activeRequest: ServiceRequest | null;
  image: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: CertificateStatus }) {
  if (status === "active") return <AuthBadge size="sm" />;
  return (
    <span className="inline-flex items-center gap-1.5 border border-red-900/40 text-red-400 font-[family-name:var(--font-dm-sans)] text-[9px] tracking-widest uppercase px-2 py-0.5">
      <span className="w-1 h-1 rounded-full bg-red-400" />
      {status === "stolen" ? "Stolen" : "Lost"}
    </span>
  );
}

function Timeline({ events }: { events: CertificateEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="mt-4 flex flex-col gap-1.5">
      {events.map((event) => (
        <p
          key={event.id}
          className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--text-muted)]"
        >
          {EVENT_LABEL_MAP[event.eventType]} · {formatDate(event.timestamp)}
        </p>
      ))}
    </div>
  );
}

// ── Service request quote banner ──────────────────────────────────────────

function QuoteBanner({
  request,
  onAcceptPay,
  onDecline,
}: {
  request: ServiceRequest;
  onAcceptPay: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="mt-4 border border-[var(--border-gold)] bg-[var(--gold)]/5 px-4 py-4">
      <p className="text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold-dark)] mb-2">
        Quote Received
      </p>
      {request.merchantDecision && (
        <p className="text-xs font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] mb-1 capitalize">
          Merchant decision: {request.merchantDecision}
        </p>
      )}
      <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)] mb-2">
        {formatPrice((request.quotedPrice ?? 0) / 100)}
      </p>
      {request.merchantNote && (
        <p className="text-xs font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-3 leading-relaxed">
          {request.merchantNote}
        </p>
      )}
      <div className="flex flex-wrap gap-3 mt-2">
        <GoldButton variant="primary" size="sm" onClick={onAcceptPay}>
          Accept &amp; Pay
        </GoldButton>
        <GoldButton variant="outline" size="sm" onClick={onDecline}>
          Decline
        </GoldButton>
      </div>
    </div>
  );
}

// ── Item card ────────────────────────────────────────────────────────────

function CollectionCard({
  item,
  fullTimeline,
  onClearReport,
  onRequestService,
  onAcceptPay,
  onDeclineQuote,
}: {
  item: CollectionItem;
  fullTimeline: boolean;
  onClearReport: (certificateId: string) => void;
  onRequestService: (item: CollectionItem) => void;
  onAcceptPay: (item: CollectionItem) => void;
  onDeclineQuote: (item: CollectionItem) => void;
}) {
  const { purchase, displayName, status, timeline, image, activeRequest } = item;
  const visibleTimeline = fullTimeline ? timeline : timeline.slice(-5);

  let serviceButtonLabel = "Refurbish / Replace";
  let serviceButtonDisabled = false;
  let serviceButtonTooltip: string | undefined;

  if (status !== "active") {
    serviceButtonDisabled = true;
    serviceButtonTooltip = "Cannot request service on a reported item";
  } else if (activeRequest?.status === "pending") {
    serviceButtonLabel = "Request Pending";
    serviceButtonDisabled = true;
    serviceButtonTooltip = "Awaiting merchant quote";
  } else if (activeRequest?.status === "quoted") {
    serviceButtonLabel = "Quote Received";
    serviceButtonDisabled = true;
    serviceButtonTooltip = "You have a quote waiting — see below";
  } else if (activeRequest?.status === "paid") {
    serviceButtonLabel = "Service In Progress";
    serviceButtonDisabled = true;
    serviceButtonTooltip = "Your item is being serviced";
  } else if (activeRequest) {
    serviceButtonLabel = "Request In Progress";
    serviceButtonDisabled = true;
    serviceButtonTooltip = "You have a service request in progress";
  }

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-primary)] flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-[var(--bg-secondary)] overflow-hidden">
        {image && (
          <Image
            src={image}
            alt={displayName}
            fill
            className="object-cover"
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
          />
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-5 py-5">
        <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-[var(--text-primary)] tracking-wide leading-snug mb-1">
          {displayName}
        </h3>
        <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--gold)] mb-2">
          {purchase.certificateId}
        </p>
        <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-1">
          Purchased
        </p>
        <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)] mb-4">
          {formatDate(purchase.purchasedAt)}
        </p>

        <div className="flex flex-wrap gap-3 mt-auto">
          <Link href={`/verify?id=${encodeURIComponent(purchase.certificateId)}`}>
            <GoldButton variant="outline" size="sm">
              View Certificate
            </GoldButton>
          </Link>
          <GoldButton
            variant="ghost"
            size="sm"
            disabled={serviceButtonDisabled}
            title={serviceButtonTooltip}
            onClick={() => onRequestService(item)}
          >
            {serviceButtonLabel}
          </GoldButton>
        </div>

        {activeRequest?.status === "quoted" && (
          <QuoteBanner
            request={activeRequest}
            onAcceptPay={() => onAcceptPay(item)}
            onDecline={() => onDeclineQuote(item)}
          />
        )}

        {status !== "active" && (
          <button
            onClick={() => onClearReport(purchase.certificateId)}
            className="mt-3 text-left text-[9px] tracking-[0.2em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] hover:text-[var(--gold)] underline underline-offset-4 transition-colors"
          >
            Clear Report
          </button>
        )}

        <Timeline events={visibleTimeline} />
      </div>
    </div>
  );
}

// ── Request service modal ───────────────────────────────────────────────

function RequestServiceModal({
  requestType,
  setRequestType,
  description,
  setDescription,
  requestError,
  submitting,
  onSubmit,
  onClose,
}: {
  requestType: "refurbish" | "replace";
  setRequestType: (v: "refurbish" | "replace") => void;
  description: string;
  setDescription: (v: string) => void;
  requestError: string | null;
  submitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  const modal = (
    <AnimatePresence>
      <motion.div
        key="request-service-backdrop"
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
          key="request-service-panel"
          initial={reduced ? {} : { opacity: 0, y: 16 }}
          animate={reduced ? {} : { opacity: 1, y: 0 }}
          exit={reduced ? {} : { opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            width: "100%",
            maxWidth: "440px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "40px",
          }}
        >
          <p style={S.eyebrow}>Service Request</p>
          <h2 style={S.heading}>Request Service</h2>

          <div style={{ marginBottom: "20px" }}>
            <label style={S.label}>Request Type</label>
            <div style={{ display: "flex", gap: "16px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#080808", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="requestType"
                  value="refurbish"
                  checked={requestType === "refurbish"}
                  onChange={() => setRequestType("refurbish")}
                />
                Refurbish
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#080808", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="requestType"
                  value="replace"
                  checked={requestType === "replace"}
                  onChange={() => setRequestType("replace")}
                />
                Replace
              </label>
            </div>
            <p style={{ marginTop: "8px", fontSize: "11px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#8a8a8a", lineHeight: 1.6 }}>
              The merchant will make the final decision based on their assessment
            </p>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={S.label}>Describe the damage</label>
            <textarea
              value={description}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the damage or reason for replacement in detail..."
              style={S.textarea}
            />
          </div>

          {requestError && <p style={S.error}>{requestError}</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
            <GoldButton
              variant="primary"
              size="lg"
              className="w-full"
              loading={submitting}
              disabled={submitting || description.length < 20}
              onClick={onSubmit}
            >
              Submit Request
            </GoldButton>
            <GoldButton variant="outline" size="md" className="w-full" onClick={onClose} disabled={submitting}>
              Cancel
            </GoldButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}

// ── Quote payment modal (reuses ShopCheckoutModal's Stripe pattern) ──────

interface QuotePaymentFormProps {
  total: number;
  onSuccess: (paymentIntentId: string) => void;
  paymentError: string | null;
  setPaymentError: (v: string | null) => void;
  paymentLoading: boolean;
  setPaymentLoading: (v: boolean) => void;
  onCancel: () => void;
}

function QuotePaymentForm({
  total,
  onSuccess,
  paymentError,
  setPaymentError,
  paymentLoading,
  setPaymentLoading,
  onCancel,
}: QuotePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

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
      onSuccess(paymentIntent.id);
    } else if (paymentIntent?.status === "requires_action") {
      setPaymentError("Additional verification required. Please try again.");
      setPaymentLoading(false);
    } else {
      setPaymentError("Payment is processing. Please wait.");
      setPaymentLoading(false);
    }
  }

  if (!stripe || !elements) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
        <span style={{
          display: "inline-block", width: "18px", height: "18px",
          border: "1.5px solid #C9A84C", borderTopColor: "transparent",
          borderRadius: "50%", animation: "spin 0.8s linear infinite",
        }} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: "20px" }}>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {paymentError && <p style={S.error}>{paymentError}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
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
        <GoldButton type="button" variant="outline" size="md" className="w-full" onClick={onCancel} disabled={paymentLoading}>
          Cancel
        </GoldButton>
      </div>
    </form>
  );
}

function QuotePaymentModal({
  request,
  itemName,
  onSuccess,
  onClose,
}: {
  request: ServiceRequest;
  itemName: string;
  onSuccess: (paymentIntentId: string) => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (clientSecret) return;
    const amountCents = request.quotedPrice ?? 0;
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
  }, [clientSecret, request.quotedPrice]);

  if (!mounted) return null;

  const total = (request.quotedPrice ?? 0) / 100;

  const modal = (
    <AnimatePresence>
      <motion.div
        key="quote-payment-backdrop"
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
          key="quote-payment-panel"
          initial={reduced ? {} : { opacity: 0, y: 16 }}
          animate={reduced ? {} : { opacity: 1, y: 0 }}
          exit={reduced ? {} : { opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            width: "100%",
            maxWidth: "440px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "40px",
          }}
        >
          <p style={S.eyebrow}>Service Quote</p>
          <h2 style={S.heading}>{itemName}</h2>
          <p style={{ ...S.mono("16px"), marginBottom: "20px" }}>{formatPrice(total)}</p>

          <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "20px" }}>
            {intentError ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={S.error}>{intentError}</p>
                <GoldButton variant="outline" size="md" className="w-full" onClick={onClose}>
                  Close
                </GoldButton>
              </div>
            ) : !clientSecret ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
                <span style={{
                  display: "inline-block", width: "18px", height: "18px",
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
                <QuotePaymentForm
                  total={total}
                  onSuccess={onSuccess}
                  paymentError={paymentError}
                  setPaymentError={setPaymentError}
                  paymentLoading={paymentLoading}
                  setPaymentLoading={setPaymentLoading}
                  onCancel={onClose}
                />
              </Elements>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}

// ── Page ───────────────────────────────────────────────────────────────

export default function CollectionPage() {
  const { user, isLoaded, openAuth } = useAuth();
  const { purchases } = useOwnership();
  const [mounted, setMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [activeItemCertId, setActiveItemCertId] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<"refurbish" | "replace">("refurbish");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [payingItem, setPayingItem] = useState<CollectionItem | null>(null);

  const refreshCollection = useCallback(
    debounce(() => {
      setRefreshKey((k) => k + 1);
    }, 50),
    []
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (
        e.key === "test_certificate_events_v1" ||
        e.key === "test_service_requests_v1" ||
        e.key === "test_certificate_status_v1"
      ) {
        refreshCollection();
      }
    };

    const handleCertificateEvent = () => {
      refreshCollection();
    };

    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener(
      "certificate-events-updated",
      handleCertificateEvent
    );

    return () => {
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener(
        "certificate-events-updated",
        handleCertificateEvent
      );
    };
  }, [refreshCollection]);

  // Authenticated pieces only — items with a non-empty certificateId. Shop
  // purchases (no certificateId) are excluded.
  const authenticatedPurchases = useMemo(
    () => purchases.filter((p) => typeof p.certificateId === "string" && p.certificateId.length > 0),
    [purchases]
  );

  const items = useMemo<CollectionItem[]>(
    () =>
      authenticatedPurchases.map((purchase) => {
        const registryEntry = getCertificateFromRegistry(purchase.certificateId);
        const displayName =
          (registryEntry?.productName && registryEntry.productName.length > 0
            ? registryEntry.productName
            : undefined) ??
          (purchase.productName && purchase.productName.length > 0 ? purchase.productName : undefined) ??
          "Unknown Item";

        return {
          purchase,
          displayName,
          status: getCertificateStatus(purchase.certificateId),
          timeline: getCertificateTimeline(purchase.certificateId),
          registryEntry,
          activeRequest: getActiveServiceRequest(purchase.certificateId),
          image: getProductImage(purchase.productId),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authenticatedPurchases, mounted, refreshKey]
  );

  const activeItems = items.filter((i) => i.status === "active");
  const reportedItems = items.filter((i) => i.status === "stolen" || i.status === "lost");
  const totalAuthenticatedItems = activeItems.length + reportedItems.length;

  function handleClearReport(certificateId: string) {
    clearStatus(certificateId);
    refreshCollection();
  }

  function handleRequestService(item: CollectionItem) {
    setActiveItemCertId(item.purchase.certificateId);
    setRequestType("refurbish");
    setDescription("");
    setRequestError(null);
    setRequestModalOpen(true);
  }

  function handleCloseRequestModal() {
    setRequestModalOpen(false);
    setActiveItemCertId(null);
    setRequestError(null);
  }

  function handleSubmitRequest() {
    if (!activeItemCertId) return;

    setSubmitting(true);
    setRequestError(null);

    // Explicit UI-level pre-check (belt and suspenders)
    const existing = getActiveServiceRequest(activeItemCertId);
    if (existing) {
      setRequestError("A service request already exists for this item.");
      setSubmitting(false);
      return;
    }

    const item = items.find((i) => i.purchase.certificateId === activeItemCertId);
    const resolvedProductName = item?.displayName ?? "Unknown Item";

    const result = createServiceRequest({
      certificateId: activeItemCertId,
      productName: resolvedProductName,
      requestType,
      customerDescription: description,
    });

    // Robust stub detection (handles null, undefined, empty id)
    if (!result || !result.id) {
      setRequestError("Failed to create service request. Please try again.");
      setSubmitting(false);
      return;
    }

    // Only record event AFTER confirmed successful request creation
    recordEvent({
      certificateId: activeItemCertId,
      eventType: requestType === "refurbish" ? "refurbish_requested" : "replace_requested",
      actorType: "owner",
      metadata: { description },
    });

    setRequestModalOpen(false);
    setActiveItemCertId(null);
    setDescription("");
    setSubmitting(false);
    refreshCollection();
  }

  function handleAcceptPay(item: CollectionItem) {
    setPayingItem(item);
  }

  function handleDeclineQuote(item: CollectionItem) {
    if (!item.activeRequest) return;
    updateServiceRequest(item.activeRequest.id, {
      status: "denied",
      customerResponseAt: new Date().toISOString(),
    });
    refreshCollection();
  }

  function handlePaymentSuccess(paymentIntentId: string) {
    if (!payingItem?.activeRequest) return;
    updateServiceRequest(payingItem.activeRequest.id, {
      status: "paid",
      stripePaymentIntentId: paymentIntentId,
      paidAt: new Date().toISOString(),
    });
    setPayingItem(null);
    refreshCollection();
  }

  if (!isLoaded) return null;

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-24 w-full text-center">
        <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-4">
          My Collection
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light text-[var(--text-primary)] tracking-wide mb-8">
          Sign in to view your collection
        </h1>
        <GoldButton variant="primary" size="md" onClick={() => openAuth("signup")}>
          Sign In
        </GoldButton>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-16 w-full">
      {/* Header */}
      <div className="mb-16">
        <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-3">
          My Collection
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-5xl md:text-6xl font-light text-[var(--text-primary)] tracking-wide mb-4">
          Your Authenticated Pieces
        </h1>
        <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-muted)]">
          {totalAuthenticatedItems} authenticated {totalAuthenticatedItems === 1 ? "piece" : "pieces"}
        </p>
      </div>

      {totalAuthenticatedItems === 0 ? (
        <div className="border border-[var(--border)] px-8 py-20 text-center">
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[var(--text-primary)] tracking-wide mb-3">
            Your collection is empty
          </h2>
          <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-8">
            Authenticated pieces you purchase will appear here
          </p>
          <Link href="/exclusive">
            <GoldButton variant="primary" size="md">
              Shop Exclusive
            </GoldButton>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeItems.map((item) => (
              <CollectionCard
                key={item.purchase.id}
                item={item}
                fullTimeline={false}
                onClearReport={handleClearReport}
                onRequestService={handleRequestService}
                onAcceptPay={handleAcceptPay}
                onDeclineQuote={handleDeclineQuote}
              />
            ))}
          </div>

          {reportedItems.length > 0 && (
            <div className="mt-16">
              <h2 className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-8">
                Reported Items
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportedItems.map((item) => (
                  <CollectionCard
                    key={item.purchase.id}
                    item={item}
                    fullTimeline={true}
                    onClearReport={handleClearReport}
                    onRequestService={handleRequestService}
                    onAcceptPay={handleAcceptPay}
                    onDeclineQuote={handleDeclineQuote}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {requestModalOpen && activeItemCertId && (
        <RequestServiceModal
          requestType={requestType}
          setRequestType={setRequestType}
          description={description}
          setDescription={setDescription}
          requestError={requestError}
          submitting={submitting}
          onSubmit={handleSubmitRequest}
          onClose={handleCloseRequestModal}
        />
      )}

      {payingItem?.activeRequest && (
        <QuotePaymentModal
          request={payingItem.activeRequest}
          itemName={payingItem.displayName}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPayingItem(null)}
        />
      )}
    </div>
  );
}
