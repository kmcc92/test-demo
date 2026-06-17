"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMarketplace } from "@/hooks/useMarketplace";
import { getMerchantProductsByType } from "@/lib/merchant-storage";
import {
  getAllServiceRequests,
  updateServiceRequest,
  type ServiceRequest,
} from "@/lib/service-requests";
import { recordEvent } from "@/lib/certificate-events";

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

export default function MerchantDashboard() {
  const { user, logout } = useAuth();
  const { listings } = useMarketplace();

  const shopCount = getMerchantProductsByType("shop").length;
  const exclusiveCount = getMerchantProductsByType("exclusive").length;
  const activeListings = listings.filter((l) => l.status === "active").length;

  const [quotingId, setQuotingId] = useState<string | null>(null);
  const [quoteDecision, setQuoteDecision] = useState<"refurbish" | "replace">("refurbish");
  const [quotePrice, setQuotePrice] = useState<string>("");
  const [quoteNote, setQuoteNote] = useState<string>("");

  const [allRequests, setAllRequests] = useState<ServiceRequest[]>([]);

  const loadRequests = useCallback(
    debounce(() => {
      setAllRequests(getAllServiceRequests());
    }, 50),
    []
  );

  const handleStorageEvent = useCallback(
    (e: StorageEvent) => {
      if (e.key === "test_service_requests_v1") {
        loadRequests();
      }
    },
    [loadRequests]
  );

  useEffect(() => {
    loadRequests();
    window.addEventListener("storage", handleStorageEvent);
    return () => {
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [loadRequests, handleStorageEvent]);

  const pendingRequests = allRequests.filter((r) => r.status === "pending");
  const quotedRequests = allRequests.filter((r) => r.status === "quoted");
  const paidRequests = allRequests.filter((r) => r.status === "paid");

  function openQuoteForm(request: ServiceRequest) {
    setQuotingId(request.id);
    setQuoteDecision(request.requestType === "replace" ? "replace" : "refurbish");
    setQuotePrice("");
    setQuoteNote("");
  }

  function handleSendQuote(request: ServiceRequest) {
    const priceNum = Number(quotePrice);
    if (!quotePrice || isNaN(priceNum) || priceNum <= 0) return;
    updateServiceRequest(request.id, {
      status: "quoted",
      merchantDecision: quoteDecision,
      merchantNote: quoteNote || undefined,
      quotedPrice: Math.round(priceNum * 100),
      quotedAt: new Date().toISOString(),
    });
    setQuotingId(null);
    setQuotePrice("");
    setQuoteNote("");
    loadRequests();
  }

  function handleMarkComplete(request: ServiceRequest) {
    if (!request.merchantDecision) {
      console.warn("Cannot complete: merchantDecision missing", request.id);
      return;
    }
    updateServiceRequest(request.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    recordEvent({
      certificateId: request.certificateId,
      eventType: request.merchantDecision === "refurbish" ? "refurbished" : "replaced",
      actorType: "merchant",
      metadata: {
        merchantNote: request.merchantNote ?? "",
        fee: String(request.quotedPrice ?? 0),
      },
    });
    loadRequests();
  }

  function formatCAD(cents: number): string {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(cents / 100);
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  const stats: { label: string; value: string | number }[] = [
    { label: "Total Shop Products", value: shopCount },
    { label: "Total Exclusive Pieces", value: exclusiveCount },
    { label: "Active Listings", value: activeListings },
    { label: "Platform Status", value: "Demo Mode" },
  ];

  return (
    <main className="px-10 py-10">
      <div className="mb-10">
        <p
          style={{ color: "#8a8a8a" }}
          className="text-[9px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] mb-3"
        >
          Merchant Portal
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light text-[#080808] tracking-wide mb-3">
          Dashboard
        </h1>
        <p className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[#8a8a8a]">
          Logged in as: {user?.email}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10 max-w-2xl">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            style={{ border: "1px solid rgba(0,0,0,0.08)" }}
            className="px-6 py-6 bg-white"
          >
            <p
              style={{ color: "#8a8a8a" }}
              className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] mb-3"
            >
              {label}
            </p>
            <p className="font-[family-name:var(--font-ibm-mono)] text-2xl text-[#080808]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={logout}
        style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#8a8a8a" }}
        className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] h-9 px-5 hover:text-[#080808] hover:border-[#080808] transition-colors duration-200 mb-16"
      >
        Log Out
      </button>

      {/* ── Service Requests ────────────────────────────────────────────── */}
      <div className="max-w-3xl">
        <div className="mb-8">
          <p
            style={{ color: "#8a8a8a" }}
            className="text-[9px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] mb-3"
          >
            Merchant Portal
          </p>
          <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-[#080808] tracking-wide mb-1">
            Service Requests
          </h2>
          <p className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[#8a8a8a]">
            {pendingRequests.length} awaiting quote
          </p>
        </div>

        {/* Pending + Quoted */}
        {pendingRequests.length === 0 && quotedRequests.length === 0 ? (
          <p className="font-[family-name:var(--font-dm-sans)] text-sm text-[#8a8a8a]">
            No pending service requests
          </p>
        ) : (
          <div className="flex flex-col gap-4 mb-10">
            {/* Pending */}
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                className="px-6 py-6 bg-white"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--gold)] mb-1">
                      {request.certificateId}
                    </p>
                    <p className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[#080808] tracking-wide">
                      {request.productName}
                    </p>
                  </div>
                  <span
                    style={{ border: "1px solid rgba(0,0,0,0.12)" }}
                    className="text-[8px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] px-2 py-1 whitespace-nowrap"
                  >
                    Pending
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
                  <div>
                    <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-1">
                      Customer Preference
                    </p>
                    <p className="font-[family-name:var(--font-ibm-mono)] text-xs text-[#080808] capitalize">
                      {request.requestType}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-1">
                      Submitted
                    </p>
                    <p className="font-[family-name:var(--font-ibm-mono)] text-xs text-[#080808]">
                      {formatDate(request.submittedAt)}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-1">
                    Customer Description
                  </p>
                  <p className="font-[family-name:var(--font-dm-sans)] text-sm text-[#3a3a3a] leading-relaxed">
                    {request.customerDescription}
                  </p>
                </div>

                {quotingId === request.id ? (
                  <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }} className="pt-5 mt-4">
                    <p className="text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-4">
                      Send Quote
                    </p>

                    {/* Decision radio */}
                    <div className="mb-4">
                      <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-2">
                        Decision
                      </p>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-[13px] font-[family-name:var(--font-dm-sans)] text-[#080808] cursor-pointer">
                          <input
                            type="radio"
                            name={`decision-${request.id}`}
                            value="refurbish"
                            checked={quoteDecision === "refurbish"}
                            onChange={() => setQuoteDecision("refurbish")}
                          />
                          Refurbish
                        </label>
                        <label className="flex items-center gap-2 text-[13px] font-[family-name:var(--font-dm-sans)] text-[#080808] cursor-pointer">
                          <input
                            type="radio"
                            name={`decision-${request.id}`}
                            value="replace"
                            checked={quoteDecision === "replace"}
                            onChange={() => setQuoteDecision("replace")}
                          />
                          Replace
                        </label>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <label className="block text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-2">
                        Price (CAD)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={quotePrice}
                        onChange={(e) => setQuotePrice(e.target.value)}
                        placeholder="0.00"
                        style={{
                          width: "160px",
                          height: "40px",
                          padding: "0 12px",
                          fontSize: "13px",
                          fontFamily: "var(--font-ibm-mono), monospace",
                          color: "#080808",
                          background: "#ffffff",
                          border: "1px solid #e0e0e0",
                          outline: "none",
                        }}
                      />
                    </div>

                    {/* Note */}
                    <div className="mb-5">
                      <label className="block text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-2">
                        Note (Optional)
                      </label>
                      <textarea
                        value={quoteNote}
                        onChange={(e) => setQuoteNote(e.target.value)}
                        rows={3}
                        placeholder="Optional note to the customer..."
                        style={{
                          width: "100%",
                          maxWidth: "440px",
                          padding: "10px 12px",
                          fontSize: "13px",
                          fontFamily: "var(--font-dm-sans), sans-serif",
                          color: "#080808",
                          background: "#ffffff",
                          border: "1px solid #e0e0e0",
                          outline: "none",
                          resize: "vertical",
                          lineHeight: 1.6,
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSendQuote(request)}
                        style={{ background: "#080808", color: "#ffffff" }}
                        className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] h-9 px-5 hover:opacity-80 transition-opacity duration-200"
                      >
                        Send Quote
                      </button>
                      <button
                        onClick={() => setQuotingId(null)}
                        style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#8a8a8a" }}
                        className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] h-9 px-5 hover:text-[#080808] hover:border-[#080808] transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => openQuoteForm(request)}
                    style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#8a8a8a" }}
                    className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] h-9 px-5 hover:text-[#080808] hover:border-[#080808] transition-colors duration-200"
                  >
                    Send Quote
                  </button>
                )}
              </div>
            ))}

            {/* Quoted (read-only) */}
            {quotedRequests.map((request) => (
              <div
                key={request.id}
                style={{ border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.03)" }}
                className="px-6 py-6"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--gold)] mb-1">
                      {request.certificateId}
                    </p>
                    <p className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[#080808] tracking-wide">
                      {request.productName}
                    </p>
                  </div>
                  <span
                    style={{ border: "1px solid rgba(201,168,76,0.5)", color: "#8B6914" }}
                    className="text-[8px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] px-2 py-1 whitespace-nowrap"
                  >
                    Quoted
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div>
                    <p className="text-[9px] tracking-widests uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-1">
                      Decision
                    </p>
                    <p className="font-[family-name:var(--font-ibm-mono)] text-xs text-[#080808] capitalize">
                      {request.merchantDecision}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-1">
                      Quoted Price
                    </p>
                    <p className="font-[family-name:var(--font-ibm-mono)] text-xs text-[#080808]">
                      {formatCAD(request.quotedPrice ?? 0)}
                    </p>
                  </div>
                  {request.merchantNote && (
                    <div className="col-span-2">
                      <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-1">
                        Note
                      </p>
                      <p className="font-[family-name:var(--font-dm-sans)] text-sm text-[#3a3a3a] leading-relaxed">
                        {request.merchantNote}
                      </p>
                    </div>
                  )}
                  {request.quotedAt && (
                    <div>
                      <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-1">
                        Quoted
                      </p>
                      <p className="font-[family-name:var(--font-ibm-mono)] text-xs text-[#080808]">
                        {formatDate(request.quotedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paid — Ready to Complete */}
        {paidRequests.length > 0 && (
          <div>
            <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[#080808] tracking-wide mb-6">
              Ready to Complete
            </h3>
            <div className="flex flex-col gap-4">
              {paidRequests.map((request) => (
                <div
                  key={request.id}
                  style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                  className="px-6 py-6 bg-white"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--gold)] mb-1">
                        {request.certificateId}
                      </p>
                      <p className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[#080808] tracking-wide">
                        {request.productName}
                      </p>
                    </div>
                    <span
                      style={{ border: "1px solid rgba(0,120,0,0.3)", color: "#2a6e2a" }}
                      className="text-[8px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] px-2 py-1 whitespace-nowrap"
                    >
                      Paid
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-5">
                    <div>
                      <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-1">
                        Decision
                      </p>
                      <p className="font-[family-name:var(--font-ibm-mono)] text-xs text-[#080808] capitalize">
                        {request.merchantDecision}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] mb-1">
                        Amount Paid
                      </p>
                      <p className="font-[family-name:var(--font-ibm-mono)] text-xs text-[#080808]">
                        {formatCAD(request.quotedPrice ?? 0)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleMarkComplete(request)}
                    style={{ background: "#080808", color: "#ffffff" }}
                    className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] h-9 px-5 hover:opacity-80 transition-opacity duration-200"
                  >
                    Mark Complete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
