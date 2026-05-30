"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  issueCertificate,
  getCertificates,
  generateRandomString,
  type Certificate,
} from "@/lib/certificate-storage";
import { getMerchantProductsByType } from "@/lib/merchant-storage";

const GOLD = "#C9A84C";
const BLACK = "#080808";
const MUTED = "#8a8a8a";
const BORDER = "rgba(0,0,0,0.08)";
const BORDER_SOLID = "#e0e0e0";
const RED = "#c0392b";

function FieldLabel({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 9,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        fontFamily: "var(--font-dm-sans), sans-serif",
        color: error ? RED : MUTED,
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p style={{ marginTop: 4, fontSize: 10, fontFamily: "var(--font-dm-sans), sans-serif", color: RED }}>
      {message}
    </p>
  );
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${hasError ? RED : BORDER_SOLID}`,
  background: "#fff",
  fontFamily: "var(--font-dm-sans), sans-serif",
  fontSize: 13,
  color: BLACK,
  outline: "none",
  boxSizing: "border-box",
});

function MetaRow({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 11, color: gold ? GOLD : BLACK }}>
        {value}
      </span>
    </div>
  );
}

export default function MerchantCertificatesPage() {
  const { user } = useAuth();

  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [provenanceDepth, setProvenanceDepth] = useState("1");
  const [serviceHistoryCount, setServiceHistoryCount] = useState("0");
  const [errors, setErrors] = useState<Partial<Record<"productId" | "productName" | "provenanceDepth" | "serviceHistoryCount", string>>>({});
  const [success, setSuccess] = useState(false);
  const [lastMinted, setLastMinted] = useState<Certificate | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  function refresh() {
    setCertificates(getCertificates());
  }

  useEffect(() => {
    refresh();
  }, []);

  // Auto-fill product name as a UI convenience only when productId changes.
  // getMerchantProductsByType is a local read — not authoritative, user can override.
  function handleProductIdChange(value: string) {
    setProductId(value);
    if (errors.productId) setErrors((p) => ({ ...p, productId: undefined }));

    const exclusives = getMerchantProductsByType("exclusive");
    const match = exclusives.find((p) => p.id === value);
    if (match) {
      setProductName(match.name);
    }
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!productId.trim()) next.productId = "Required";
    if (!productName.trim()) next.productName = "Required";

    const pd = Number(provenanceDepth);
    if (!Number.isInteger(pd) || pd < 0) next.provenanceDepth = "Must be 0 or greater";

    const sh = Number(serviceHistoryCount);
    if (!Number.isInteger(sh) || sh < 0) next.serviceHistoryCount = "Must be 0 or greater";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !user) return;

    const now = Date.now();
    const cert: Certificate = {
      id: `CERT-${now}-${generateRandomString(6)}`,
      productId: productId.trim(),
      productName: productName.trim(),
      issuedTo: user.email,
      issuedAt: new Date().toISOString(),
      type: "exclusive",
      metadata: {
        provenanceDepth: parseInt(provenanceDepth, 10),
        serviceHistoryCount: parseInt(serviceHistoryCount, 10),
      },
    };

    issueCertificate(cert);
    refresh();
    setLastMinted(cert);
    setSuccess(true);
    setProductId("");
    setProductName("");
    setProvenanceDepth("1");
    setServiceHistoryCount("0");
    setErrors({});
  }

  return (
    <div className="flex flex-1">
      {/* Left: mint form */}
      <div
        style={{ width: 420, borderRight: `1px solid ${BORDER}`, flexShrink: 0 }}
        className="px-10 py-10"
      >
        <p
          style={{ color: MUTED, marginBottom: 8 }}
          className="text-[9px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)]"
        >
          Merchant Portal
        </p>
        <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-[#080808] tracking-wide mb-8">
          Mint Certificate
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Product ID */}
            <div>
              <FieldLabel error={!!errors.productId}>Product ID</FieldLabel>
              <input
                type="text"
                value={productId}
                onChange={(e) => handleProductIdChange(e.target.value)}
                style={inputStyle(!!errors.productId)}
                placeholder="e.g. merchant-1234567890-AB3X9K"
              />
              <FieldError message={errors.productId} />
            </div>

            {/* Product Name */}
            <div>
              <FieldLabel error={!!errors.productName}>
                Product Name{" "}
                <span style={{ opacity: 0.5, textTransform: "none", fontSize: 9 }}>
                  (auto-filled if ID matches)
                </span>
              </FieldLabel>
              <input
                type="text"
                value={productName}
                onChange={(e) => { setProductName(e.target.value); if (errors.productName) setErrors((p) => ({ ...p, productName: undefined })); }}
                style={inputStyle(!!errors.productName)}
                placeholder="e.g. Leather Jacket"
              />
              <FieldError message={errors.productName} />
            </div>

            {/* Provenance Depth */}
            <div>
              <FieldLabel error={!!errors.provenanceDepth}>Provenance Depth</FieldLabel>
              <input
                type="number"
                value={provenanceDepth}
                min={0}
                step={1}
                onChange={(e) => { setProvenanceDepth(e.target.value); if (errors.provenanceDepth) setErrors((p) => ({ ...p, provenanceDepth: undefined })); }}
                style={inputStyle(!!errors.provenanceDepth)}
              />
              <FieldError message={errors.provenanceDepth} />
            </div>

            {/* Service History Count */}
            <div>
              <FieldLabel error={!!errors.serviceHistoryCount}>Service History Count</FieldLabel>
              <input
                type="number"
                value={serviceHistoryCount}
                min={0}
                step={1}
                onChange={(e) => { setServiceHistoryCount(e.target.value); if (errors.serviceHistoryCount) setErrors((p) => ({ ...p, serviceHistoryCount: undefined })); }}
                style={inputStyle(!!errors.serviceHistoryCount)}
              />
              <FieldError message={errors.serviceHistoryCount} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "13px 24px",
                background: GOLD,
                border: "none",
                color: BLACK,
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 10,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              Mint Certificate
            </button>

            {/* Success + preview */}
            {success && lastMinted && (
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    color: GOLD,
                    letterSpacing: "0.1em",
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  Certificate minted successfully
                </p>
                <div
                  style={{
                    border: `1px solid rgba(201,168,76,0.4)`,
                    padding: "16px 20px",
                    background: "rgba(201,168,76,0.03)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      color: GOLD,
                      marginBottom: 12,
                    }}
                  >
                    Certificate Preview
                  </p>
                  <MetaRow label="ID" value={lastMinted.id} gold />
                  <MetaRow label="Product" value={lastMinted.productName} />
                  <MetaRow label="Product ID" value={lastMinted.productId} />
                  <MetaRow label="Issued To" value={lastMinted.issuedTo} />
                  <MetaRow label="Provenance Depth" value={String(lastMinted.metadata.provenanceDepth)} />
                  <MetaRow label="Service History" value={String(lastMinted.metadata.serviceHistoryCount)} />
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Right: issued certificates */}
      <div className="flex-1 px-10 py-10 overflow-y-auto">
        <p
          style={{ color: MUTED, marginBottom: 8 }}
          className="text-[9px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)]"
        >
          Issued
        </p>
        <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-[#080808] tracking-wide mb-8">
          Certificates
        </h2>

        {certificates.length === 0 ? (
          <div style={{ border: `1px solid ${BORDER}`, padding: "48px 32px", textAlign: "center" }}>
            <p className="font-[family-name:var(--font-cormorant)] text-xl font-light text-[#8a8a8a] tracking-wide">
              No certificates issued yet
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...certificates].reverse().map((cert) => {
              const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              return (
                <div
                  key={cert.id}
                  style={{ border: `1px solid ${BORDER}`, padding: "20px 24px", background: "#fff" }}
                >
                  {/* Certificate ID */}
                  <p
                    style={{
                      fontFamily: "var(--font-ibm-mono), monospace",
                      fontSize: 12,
                      color: GOLD,
                      marginBottom: 12,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {cert.id}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    <MetaRow label="Product" value={cert.productName} />
                    <MetaRow label="Product ID" value={cert.productId} />
                    <MetaRow label="Issued To" value={cert.issuedTo} />
                    <MetaRow label="Issued" value={issuedDate} />
                    <MetaRow label="Provenance Depth" value={String(cert.metadata.provenanceDepth)} />
                    <MetaRow label="Service History" value={String(cert.metadata.serviceHistoryCount)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
