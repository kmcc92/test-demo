"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import GoldButton from "@/components/ui/GoldButton";
import { reportStolenEntry, reportLostEntry } from "@/lib/repositories";

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
  input: {
    width: "100%",
    height: "44px",
    padding: "0 12px",
    fontSize: "13px",
    fontFamily: "var(--font-dm-sans), sans-serif",
    color: "#080808",
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    outline: "none",
    boxSizing: "border-box" as const,
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
};

interface ReportStatusModalProps {
  certificateId: string;
  itemName: string;
  type: "stolen" | "lost";
  onClose: () => void;
  onReported: () => void;
}

export default function ReportStatusModal({
  certificateId,
  itemName,
  type,
  onClose,
  onReported,
}: ReportStatusModalProps) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [locationError, setLocationError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const label = type === "stolen" ? "Stolen" : "Lost";

  async function handleSubmit() {
    if (!location.trim()) {
      setLocationError("Required");
      return;
    }
    try {
      if (type === "stolen") {
        await reportStolenEntry(certificateId, { dateStolen: date, location: location.trim(), note: note.trim() || undefined });
      } else {
        await reportLostEntry(certificateId, { dateLost: date, location: location.trim(), note: note.trim() || undefined });
      }
    } catch {
      setLocationError("Could not save report — please try again");
      return;
    }
    setSuccess(true);
    onReported();
  }

  if (!mounted) return null;

  const modal = (
    <AnimatePresence>
      <motion.div
        key="report-status-backdrop"
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
          key="report-status-panel"
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
          {success ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{
                width: "52px", height: "52px",
                border: "1px solid rgba(192,57,43,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px",
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 10L8 15L17 6" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p style={{ ...S.eyebrow, color: "#c0392b" }}>Reported {label}</p>
              <h2 style={{ ...S.heading, marginBottom: "12px" }}>
                {itemName} has been reported {label.toLowerCase()}
              </h2>
              <p style={{ fontSize: "13px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#6b6b6b", lineHeight: 1.7, marginBottom: "32px" }}>
                It has been removed from the Library and remains visible here with a {label.toLowerCase()} status. You can clear this report at any time.
              </p>
              <GoldButton variant="primary" size="md" className="w-full" onClick={onClose}>
                Close
              </GoldButton>
            </div>
          ) : (
            <>
              <p style={S.eyebrow}>Report {label}</p>
              <h2 style={S.heading}>{itemName}</h2>

              <div style={{ marginBottom: "20px" }}>
                <label style={S.label}>Date {label}</label>
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => setDate(e.target.value)}
                  style={S.input}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={S.label}>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); if (locationError) setLocationError(""); }}
                  placeholder="e.g. Milan, Italy"
                  style={{ ...S.input, border: locationError ? "1px solid #c0392b" : S.input.border }}
                />
                {locationError && (
                  <p style={{ marginTop: 4, fontSize: 10, fontFamily: "var(--font-dm-sans), sans-serif", color: "#c0392b" }}>
                    {locationError}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={S.label}>Additional Notes (Optional)</label>
                <textarea
                  value={note}
                  maxLength={300}
                  rows={3}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Any additional details…"
                  style={S.textarea}
                />
              </div>

              <div style={{ padding: "14px 16px", background: "rgba(192,57,43,0.04)", border: "1px solid rgba(192,57,43,0.25)", marginBottom: "28px" }}>
                <p style={{ fontSize: "12px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#6b6b6b", lineHeight: 1.7 }}>
                  Reporting this item will remove it from the Library. It will remain visible here with a {label.toLowerCase()} status. You can clear this report later if reported in error.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <GoldButton variant="primary" size="lg" className="w-full" onClick={handleSubmit}>
                  Report {label}
                </GoldButton>
                <GoldButton variant="outline" size="md" className="w-full" onClick={onClose}>
                  Cancel
                </GoldButton>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
