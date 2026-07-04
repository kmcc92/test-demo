"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getMerchantProductsByType,
  addMerchantProduct,
  updateMerchantProduct,
  deleteMerchantProduct,
  generateRandomString,
  isCertificateIdTaken,
  type MerchantProduct,
} from "@/lib/merchant-storage";
import { getCertificates, type Certificate } from "@/lib/certificate-storage";
import { registerCertificateEntry } from "@/lib/repositories";
import {
  getCertificateStatusRecord,
  clearStatus,
  type CertificateStatusRecord,
} from "@/lib/certificate-status";
import ReportStatusModal from "@/components/certificate-status/ReportStatusModal";
import { formatPrice } from "@/lib/utils";

const GOLD = "#C9A84C";
const BLACK = "#080808";
const MUTED = "#8a8a8a";
const BORDER = "rgba(0,0,0,0.08)";
const BORDER_SOLID = "#e0e0e0";
const RED = "#c0392b";

const fieldLabelStyle = (error?: boolean): React.CSSProperties => ({
  display: "block",
  fontSize: 9,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  fontFamily: "var(--font-dm-sans), sans-serif",
  color: error ? RED : MUTED,
  marginBottom: 4,
});

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

const editInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: `1px solid ${BORDER_SOLID}`,
  background: "#fff",
  fontFamily: "var(--font-dm-sans), sans-serif",
  fontSize: 12,
  color: BLACK,
  outline: "none",
  boxSizing: "border-box",
};

const lockedFieldStyle: React.CSSProperties = {
  padding: "8px 10px",
  background: "#fafafa",
  border: `1px solid ${BORDER_SOLID}`,
  fontFamily: "var(--font-ibm-mono), monospace",
  fontSize: 10,
  color: MUTED,
  wordBreak: "break-all",
};

const lockedLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontFamily: "var(--font-dm-sans), sans-serif",
  color: MUTED,
  marginBottom: 4,
  opacity: 0.7,
};

type AddFormErrors = Partial<Record<"name" | "description" | "price" | "image" | "certificateId", string>>;
type EditForm = { name: string; description: string; price: string; image: string };

export default function MerchantExclusivePage() {
  const { user } = useAuth();

  // Product list state
  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", description: "", price: "", image: "" });
  const [statusMap, setStatusMap] = useState<Record<string, CertificateStatusRecord | null>>({});
  const [reportTarget, setReportTarget] = useState<{ certificateId: string; itemName: string; type: "stolen" | "lost" } | null>(null);

  // Add form state
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addImage, setAddImage] = useState("");
  const [addCertificateId, setAddCertificateId] = useState("");
  const [addErrors, setAddErrors] = useState<AddFormErrors>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function refresh() {
    const list = getMerchantProductsByType("exclusive");
    setProducts(list);
    setCertificates(getCertificates());
    const map: Record<string, CertificateStatusRecord | null> = {};
    list.forEach((p) => {
      if (p.certificateId) map[p.certificateId] = getCertificateStatusRecord(p.certificateId);
    });
    setStatusMap(map);
  }

  function handleClearStatus(certificateId: string) {
    clearStatus(certificateId);
    setStatusMap((prev) => ({ ...prev, [certificateId]: null }));
  }

  useEffect(() => { refresh(); }, []);

  // Build cert lookup by certificate.id (not productId)
  const certById = useMemo(() => {
    const map = new Map<string, Certificate>();
    for (const c of certificates) map.set(c.id, c);
    return map;
  }, [certificates]);

  // Add form
  function validateAdd(): boolean {
    const next: AddFormErrors = {};
    if (!addName.trim()) next.name = "Required";
    if (!addDescription.trim()) next.description = "Required";
    if (!addPrice.trim()) {
      next.price = "Required";
    } else {
      const n = Number(addPrice);
      if (!Number.isInteger(n) || n <= 0) next.price = "Must be a positive integer";
    }
    if (!addImage.trim()) {
      next.image = "Required";
    } else if (!addImage.startsWith("https://")) {
      next.image = "Must start with https://";
    }
    const trimmedCert = addCertificateId.trim();
    if (!trimmedCert) {
      next.certificateId = "Required";
    } else if (/\s/.test(trimmedCert)) {
      next.certificateId = "Cannot contain spaces";
    } else if (isCertificateIdTaken(trimmedCert)) {
      next.certificateId = "This certificate ID is already in use";
    }
    setAddErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAdd() || !user) return;

    const now = Date.now();
    const certificateId = addCertificateId.trim();
    const product: MerchantProduct = {
      id: `merchant-${now}-${generateRandomString(6)}`,
      type: "exclusive",
      name: addName.trim(),
      description: addDescription.trim(),
      price: parseInt(addPrice, 10),
      image: addImage.trim(),
      certificateId,
      createdAt: new Date().toISOString(),
      merchantEmail: user.email,
    };

    // Minting event — certificateId becomes a known identity the moment the
    // merchant creates the exclusive product. Persist the certificate durably
    // FIRST; only create the product and show success once it succeeds.
    try {
      await registerCertificateEntry({
        certificateId: product.certificateId!,
        productName: product.name,
      });
    } catch {
      setAddErrors((p) => ({
        ...p,
        certificateId: "Could not register certificate — please try again",
      }));
      return;
    }

    addMerchantProduct(product);

    refresh();
    setSuccessMsg(`Exclusive piece added. Certificate: ${certificateId}`);
    setAddName("");
    setAddDescription("");
    setAddPrice("");
    setAddImage("");
    setAddCertificateId("");
    setAddErrors({});
    setTimeout(() => setSuccessMsg(null), 6000);
  }

  // CRUD
  function startEdit(p: MerchantProduct) {
    setEditingId(p.id);
    setConfirmDeleteId(null);
    setEditForm({ name: p.name, description: p.description, price: String(p.price), image: p.image });
  }

  function saveEdit(id: string) {
    const parsedPrice = parseInt(editForm.price, 10);
    updateMerchantProduct(id, {
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : undefined,
      image: editForm.image.trim(),
    });
    setEditingId(null);
    refresh();
  }

  function cancelEdit() { setEditingId(null); }

  function confirmDelete(id: string) {
    deleteMerchantProduct(id);
    setConfirmDeleteId(null);
    refresh();
  }

  return (
    <div className="flex flex-1">
      {/* Left: add form */}
      <div
        style={{ width: 420, borderRight: `1px solid ${BORDER}`, flexShrink: 0 }}
        className="px-10 py-10 overflow-y-auto"
      >
        <p style={{ color: MUTED, marginBottom: 8 }} className="text-[9px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)]">
          Merchant Portal
        </p>
        <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-[#080808] tracking-wide mb-8">
          Add Exclusive Piece
        </h2>

        <form onSubmit={handleAddSubmit} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Name */}
            <div>
              <label style={fieldLabelStyle(!!addErrors.name)}>Product Name</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => { setAddName(e.target.value); if (addErrors.name) setAddErrors((p) => ({ ...p, name: undefined })); }}
                style={inputStyle(!!addErrors.name)}
                placeholder="e.g. Archive Coat"
              />
              {addErrors.name && <p style={{ marginTop: 4, fontSize: 10, fontFamily: "var(--font-dm-sans), sans-serif", color: RED }}>{addErrors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label style={fieldLabelStyle(!!addErrors.description)}>
                Description{" "}
                <span style={{ opacity: 0.5, textTransform: "none", fontSize: 9 }}>({addDescription.length}/300)</span>
              </label>
              <textarea
                value={addDescription}
                maxLength={300}
                rows={4}
                onChange={(e) => { setAddDescription(e.target.value); if (addErrors.description) setAddErrors((p) => ({ ...p, description: undefined })); }}
                style={{ ...inputStyle(!!addErrors.description), resize: "vertical", lineHeight: 1.6 }}
                placeholder="Describe the piece…"
              />
              {addErrors.description && <p style={{ marginTop: 4, fontSize: 10, fontFamily: "var(--font-dm-sans), sans-serif", color: RED }}>{addErrors.description}</p>}
            </div>

            {/* Price */}
            <div>
              <label style={fieldLabelStyle(!!addErrors.price)}>Price (USD)</label>
              <input
                type="number"
                value={addPrice}
                min={1}
                step={1}
                onChange={(e) => { setAddPrice(e.target.value); if (addErrors.price) setAddErrors((p) => ({ ...p, price: undefined })); }}
                style={inputStyle(!!addErrors.price)}
                placeholder="e.g. 2400"
              />
              {addErrors.price && <p style={{ marginTop: 4, fontSize: 10, fontFamily: "var(--font-dm-sans), sans-serif", color: RED }}>{addErrors.price}</p>}
            </div>

            {/* Image URL */}
            <div>
              <label style={fieldLabelStyle(!!addErrors.image)}>Image URL</label>
              <input
                type="text"
                value={addImage}
                onChange={(e) => { setAddImage(e.target.value); if (addErrors.image) setAddErrors((p) => ({ ...p, image: undefined })); }}
                style={inputStyle(!!addErrors.image)}
                placeholder="https://…"
              />
              {addErrors.image && <p style={{ marginTop: 4, fontSize: 10, fontFamily: "var(--font-dm-sans), sans-serif", color: RED }}>{addErrors.image}</p>}
            </div>

            {/* Certificate ID — manual entry (NFC tag) */}
            <div>
              <label style={fieldLabelStyle(!!addErrors.certificateId)}>Certificate ID (NFC Tag ID)</label>
              <input
                type="text"
                value={addCertificateId}
                onChange={(e) => { setAddCertificateId(e.target.value); if (addErrors.certificateId) setAddErrors((p) => ({ ...p, certificateId: undefined })); }}
                style={{ ...inputStyle(!!addErrors.certificateId), fontFamily: "var(--font-ibm-mono), monospace" }}
                placeholder="e.g. TEST-GOLD-001"
              />
              {addErrors.certificateId && <p style={{ marginTop: 4, fontSize: 10, fontFamily: "var(--font-dm-sans), sans-serif", color: RED }}>{addErrors.certificateId}</p>}
              <p style={{ marginTop: 6, fontSize: 9, fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED }}>
                Must match the physical NFC tag for this piece. Cannot be changed after creation.
              </p>
            </div>

            {/* Type — locked */}
            <div>
              <label style={fieldLabelStyle()}>Product Type</label>
              <div
                style={{
                  padding: "10px 14px",
                  border: `1px solid rgba(201,168,76,0.35)`,
                  background: "rgba(201,168,76,0.03)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: GOLD }}>
                  Exclusive Piece
                </span>
                <span style={{ fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED }}>
                  Locked
                </span>
              </div>
            </div>

            {/* Submit */}
            <div style={{ paddingTop: 4 }}>
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
                Add Exclusive Piece
              </button>
            </div>

            {/* Success */}
            {successMsg && (
              <div style={{ padding: "12px 14px", border: `1px solid rgba(201,168,76,0.35)`, background: "rgba(201,168,76,0.04)" }}>
                <p style={{ fontSize: 10, fontFamily: "var(--font-dm-sans), sans-serif", color: GOLD, lineHeight: 1.6 }}>
                  {successMsg}
                </p>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Right: exclusive inventory */}
      <div className="flex-1 px-10 py-10 overflow-y-auto">
        <p style={{ color: MUTED, marginBottom: 8 }} className="text-[9px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)]">
          Exclusive Inventory
        </p>
        <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-[#080808] tracking-wide mb-8">
          Exclusive Pieces
        </h2>

        {products.length === 0 ? (
          <div style={{ border: `1px solid ${BORDER}`, padding: "48px 32px", textAlign: "center" }}>
            <p className="font-[family-name:var(--font-cormorant)] text-xl font-light text-[#8a8a8a] tracking-wide mb-3">
              No exclusive pieces added yet
            </p>
            <p style={{ fontSize: 11, fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED }}>
              Add your first authenticated exclusive piece above
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...products].reverse().map((product) => {
              const isEditing = editingId === product.id;
              const isConfirmingDelete = confirmDeleteId === product.id;
              const linkedCert = product.certificateId ? certById.get(product.certificateId) : undefined;

              if (isEditing) {
                return (
                  <div
                    key={product.id}
                    style={{ border: `1px solid ${GOLD}`, padding: "20px 24px", background: "rgba(201,168,76,0.02)" }}
                  >
                    <p style={{ fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: GOLD, marginBottom: 16 }}>
                      Editing
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {/* Editable fields */}
                      <div>
                        <label style={{ ...lockedLabelStyle, opacity: 1 }}>Product Name</label>
                        <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} style={editInputStyle} />
                      </div>
                      <div>
                        <label style={{ ...lockedLabelStyle, opacity: 1 }}>Description</label>
                        <textarea value={editForm.description} maxLength={300} rows={3} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} style={{ ...editInputStyle, resize: "vertical", lineHeight: 1.5 }} />
                      </div>
                      <div>
                        <label style={{ ...lockedLabelStyle, opacity: 1 }}>Price (USD)</label>
                        <input type="number" value={editForm.price} min={1} step={1} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} style={editInputStyle} />
                      </div>
                      <div>
                        <label style={{ ...lockedLabelStyle, opacity: 1 }}>Image URL</label>
                        <input type="text" value={editForm.image} onChange={(e) => setEditForm((f) => ({ ...f, image: e.target.value }))} style={editInputStyle} />
                      </div>

                      {/* Immutable fields — text only */}
                      <div>
                        <span style={lockedLabelStyle}>ID — Locked after creation</span>
                        <p style={lockedFieldStyle}>{product.id}</p>
                      </div>
                      <div>
                        <span style={lockedLabelStyle}>Type — Locked after creation</span>
                        <p style={{ ...lockedFieldStyle, color: GOLD, fontFamily: "var(--font-dm-sans), sans-serif", letterSpacing: "0.15em", textTransform: "uppercase" }}>Exclusive</p>
                      </div>
                      {product.certificateId && (
                        <div>
                          <span style={lockedLabelStyle}>Certificate — Locked after creation</span>
                          <p style={lockedFieldStyle}>{product.certificateId}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                        <button
                          onClick={() => saveEdit(product.id)}
                          style={{ padding: "9px 20px", background: BLACK, border: "none", color: "#fff", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", cursor: "pointer" }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{ padding: "9px 20px", background: "#fff", border: `1px solid ${BORDER_SOLID}`, color: MUTED, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // VIEW MODE
              const date = new Date(product.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

              return (
                <div key={product.id} style={{ border: `1px solid ${BORDER_SOLID}`, background: "#fff" }}>
                  <div style={{ padding: "18px 24px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                      {/* Thumbnail */}
                      {product.image && (
                        <div style={{ width: 52, height: 66, flexShrink: 0, background: "#f0ede8", overflow: "hidden" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <p style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 17, fontWeight: 300, color: BLACK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {product.name}
                          </p>
                          <span style={{ fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: GOLD, border: `1px solid rgba(201,168,76,0.4)`, padding: "2px 7px", flexShrink: 0 }}>
                            Exclusive
                          </span>
                          {product.certificateId && (
                            <span style={{ fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: GOLD, border: `1px solid rgba(201,168,76,0.5)`, padding: "2px 7px", background: "rgba(201,168,76,0.06)", flexShrink: 0 }}>
                              Authenticated
                            </span>
                          )}
                        </div>

                        {product.certificateId && (
                          <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 10, color: GOLD, marginBottom: 4 }}>
                            {product.certificateId}
                          </p>
                        )}

                        {/* Certificate status overlay — mark stolen/lost or clear an existing report */}
                        {product.certificateId && (() => {
                          const certificateId = product.certificateId!;
                          const statusRecord = statusMap[certificateId];
                          const status = statusRecord?.status ?? "active";
                          if (status === "active") {
                            return (
                              <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
                                <button
                                  onClick={() => setReportTarget({ certificateId, itemName: product.name, type: "stolen" })}
                                  style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED, background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                                >
                                  Mark Stolen
                                </button>
                                <button
                                  onClick={() => setReportTarget({ certificateId, itemName: product.name, type: "lost" })}
                                  style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED, background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                                >
                                  Mark Lost
                                </button>
                              </div>
                            );
                          }
                          return (
                            <div style={{ marginBottom: 4 }}>
                              <span style={{ fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: RED, border: `1px solid rgba(192,57,43,0.4)`, padding: "2px 7px", marginRight: 8 }}>
                                {status === "stolen" ? "Marked Stolen" : "Marked Lost"}
                              </span>
                              <button
                                onClick={() => handleClearStatus(certificateId)}
                                style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED, background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                              >
                                Clear Status
                              </button>
                              {(statusRecord?.reportedDate || statusRecord?.reportedLocation) && (
                                <p style={{ fontSize: 9, fontFamily: "var(--font-ibm-mono), monospace", color: MUTED, marginTop: 4 }}>
                                  {statusRecord?.reportedDate ? `Reported ${statusRecord.reportedDate}` : ""}
                                  {statusRecord?.reportedDate && statusRecord?.reportedLocation ? " — " : ""}
                                  {statusRecord?.reportedLocation ?? ""}
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {product.description && (
                          <p style={{ fontSize: 11, fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {product.description}
                          </p>
                        )}

                        <p style={{ fontSize: 10, fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED }}>
                          {date}
                        </p>
                      </div>

                      {/* Price + actions */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 13, color: BLACK }}>
                          {formatPrice(product.price)}
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => startEdit(product)}
                            style={{ padding: "5px 12px", background: "#fff", border: `1px solid ${BORDER_SOLID}`, color: MUTED, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : product.id)}
                            style={{ padding: "5px 12px", background: "#fff", border: `1px solid ${isConfirmingDelete ? RED : BORDER_SOLID}`, color: isConfirmingDelete ? RED : MUTED, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Certificate Metadata — display only */}
                    {linkedCert && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
                        <p style={{ fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED, marginBottom: 10 }}>
                          Certificate Metadata — Linked record found
                        </p>
                        <div style={{ display: "flex", gap: 24 }}>
                          <div>
                            <p style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED, marginBottom: 2 }}>
                              Provenance Depth
                            </p>
                            <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 12, color: BLACK }}>
                              {linkedCert.metadata.provenanceDepth}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: MUTED, marginBottom: 2 }}>
                              Service History
                            </p>
                            <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 12, color: BLACK }}>
                              {linkedCert.metadata.serviceHistoryCount}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete confirmation */}
                  {isConfirmingDelete && (
                    <div style={{ padding: "14px 24px", borderTop: `1px solid ${BORDER_SOLID}`, background: "#fafafa" }}>
                      <p style={{ fontSize: 11, fontFamily: "var(--font-dm-sans), sans-serif", color: RED, marginBottom: 10, lineHeight: 1.6 }}>
                        This will permanently remove this item from all customer-facing pages. This cannot be undone.
                      </p>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={() => confirmDelete(product.id)}
                          style={{ padding: "7px 16px", background: RED, border: "none", color: "#fff", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" }}
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ padding: "7px 16px", background: "#fff", border: `1px solid ${BORDER_SOLID}`, color: MUTED, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Report Stolen/Lost Modal ─────────────────── */}
      {reportTarget && (
        <ReportStatusModal
          certificateId={reportTarget.certificateId}
          itemName={reportTarget.itemName}
          type={reportTarget.type}
          onClose={() => setReportTarget(null)}
          onReported={() => {
            const certificateId = reportTarget.certificateId;
            setStatusMap((prev) => ({ ...prev, [certificateId]: getCertificateStatusRecord(certificateId) }));
          }}
        />
      )}
    </div>
  );
}
