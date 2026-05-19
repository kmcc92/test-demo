"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import GoldButton from "@/components/ui/GoldButton";

interface AuthModalProps {
  open: boolean;
  initialTab: "login" | "signup";
  onClose: () => void;
  onSuccess: (email: string) => void;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const TABS = [
  { key: "signup" as const, label: "Sign Up" },
  { key: "login" as const, label: "Log In" },
];

const CARD: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #cccccc",
  color: "#080808",
};

const INPUT: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "48px",
  padding: "0 16px",
  background: "#ffffff",
  border: "1px solid #cccccc",
  color: "#080808",
  fontSize: "14px",
  fontFamily: "var(--font-ibm-mono), monospace",
  outline: "none",
};

const LABEL: React.CSSProperties = {
  display: "block",
  fontSize: "10px",
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  fontFamily: "var(--font-dm-sans), sans-serif",
  color: "#080808",
  marginBottom: "6px",
};

export default function AuthModal({ open, initialTab, onClose, onSuccess }: AuthModalProps) {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<"login" | "signup">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setEmail("");
      setPassword("");
      setError("");
      setLoading(false);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) { setError("Email is required."); return; }
    if (!isValidEmail(trimmed)) { setError("Enter a valid email address."); return; }
    if (!password) { setError("Password is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess(trimmed.toLowerCase());
    }, 700);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="auth-backdrop"
            initial={reduced ? {} : { opacity: 0 }}
            animate={reduced ? {} : { opacity: 1 }}
            exit={reduced ? {} : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(8,8,8,0.55)" }}
            onClick={onClose}
          />

          {/* Card container */}
          <div style={{ position: "fixed", inset: 0, zIndex: 61, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", pointerEvents: "none" }}>
            <motion.div
              key="auth-card"
              initial={reduced ? {} : { opacity: 0, scale: 0.97, y: 10 }}
              animate={reduced ? {} : { opacity: 1, scale: 1, y: 0 }}
              exit={reduced ? {} : { opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              style={{ ...CARD, position: "relative", width: "100%", maxWidth: "448px", pointerEvents: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="Close"
                style={{ position: "absolute", top: "20px", right: "20px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#080808", background: "none", border: "none", cursor: "pointer", opacity: 1 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                  <path d="M1 1L10 10M10 1L1 10" stroke="#080808" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              {/* Header */}
              <div style={{ padding: "40px 40px 24px" }}>
                <p style={{ fontSize: "10px", letterSpacing: "0.4em", textTransform: "uppercase", fontFamily: "var(--font-dm-sans), sans-serif", color: "#080808", marginBottom: "8px" }}>
                  TEST Member
                </p>
                <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "30px", fontWeight: 300, color: "#080808", letterSpacing: "0.04em" }}>
                  {tab === "signup" ? "Create Account" : "Welcome Back"}
                </h2>
              </div>

              {/* Tabs */}
              <div style={{ padding: "0 40px", display: "flex", borderBottom: "1px solid #cccccc", marginBottom: "32px" }}>
                {TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setTab(key); setError(""); }}
                    style={{
                      position: "relative",
                      paddingBottom: "12px",
                      marginRight: "32px",
                      fontSize: "10px",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      color: "#080808",
                      opacity: tab === key ? 1 : 0.4,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      transition: "opacity 0.2s",
                    }}
                  >
                    {label}
                    {tab === key && (
                      <motion.div
                        layoutId="auth-tab-bar"
                        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "#080808" }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ padding: "0 40px 40px" }} noValidate>
                {/* Email */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={LABEL} htmlFor="auth-email">Email</label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="your@email.com"
                    style={INPUT}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#C9A84C"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#cccccc"; }}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: error ? "16px" : "20px" }}>
                  <label style={LABEL} htmlFor="auth-password">Password</label>
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete={tab === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    style={INPUT}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#C9A84C"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#cccccc"; }}
                  />
                </div>

                {/* Error */}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.p
                      key={error}
                      initial={reduced ? {} : { opacity: 0, y: -4 }}
                      animate={reduced ? {} : { opacity: 1, y: 0 }}
                      exit={reduced ? {} : { opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ fontSize: "12px", color: "#c00000", fontFamily: "var(--font-dm-sans), sans-serif", marginBottom: "16px" }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <div style={{ paddingTop: "8px" }}>
                  <GoldButton type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                    {tab === "signup" ? "Create Account" : "Log In"}
                  </GoldButton>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
