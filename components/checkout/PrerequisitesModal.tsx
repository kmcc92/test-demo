"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import GoldButton from "@/components/ui/GoldButton";

const BLACK = "#080808";
const MUTED = "#6b6b6b";
const BORDER = "#e0e0e0";

const COPY = {
  wallet: {
    title: "Wallet Required",
    body: "Please connect your wallet to purchase authenticated pieces. You can do this in My Account.",
  },
};

interface PrerequisitesModalProps {
  missing: ("wallet")[];
  onClose: () => void;
}

export default function PrerequisitesModal({ missing, onClose }: PrerequisitesModalProps) {
  if (typeof window === "undefined") return null;

  const reduced = useReducedMotion();
  const copy = COPY[missing[0]];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const modal = (
    <AnimatePresence>
      <motion.div
        key="prereq-backdrop"
        initial={reduced ? {} : { opacity: 0 }}
        animate={reduced ? {} : { opacity: 1 }}
        exit={reduced ? {} : { opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <motion.div
          key="prereq-panel"
          initial={reduced ? {} : { opacity: 0, y: 16 }}
          animate={reduced ? {} : { opacity: 1, y: 0 }}
          exit={reduced ? {} : { opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#ffffff",
            border: `1px solid ${BORDER}`,
            width: "100%",
            maxWidth: "380px",
            padding: "40px",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              fontFamily: "var(--font-dm-sans), sans-serif",
              color: BLACK,
              marginBottom: "8px",
            }}
          >
            Before you continue
          </p>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: "26px",
              fontWeight: 300,
              color: BLACK,
              lineHeight: 1.2,
              marginBottom: "16px",
            }}
          >
            {copy.title}
          </h2>
          <p
            style={{
              fontSize: "14px",
              fontFamily: "var(--font-dm-sans), sans-serif",
              color: MUTED,
              lineHeight: 1.7,
              marginBottom: "32px",
            }}
          >
            {copy.body}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Link href="/account" onClick={onClose} style={{ display: "block" }}>
              <GoldButton variant="primary" size="md" className="w-full">
                Go to Account
              </GoldButton>
            </Link>
            <GoldButton variant="outline" size="md" className="w-full" onClick={onClose}>
              Cancel
            </GoldButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
