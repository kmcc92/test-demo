"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: string;
  message: string;
  variant?: "gold" | "error" | "neutral";
}

interface ToastContextValue {
  show: (message: string, variant?: ToastItem["variant"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const reduced = useReducedMotion();

  const show = useCallback((message: string, variant: ToastItem["variant"] = "gold") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={reduced ? {} : { opacity: 0, y: 16, scale: 0.96 }}
              animate={reduced ? {} : { opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? {} : { opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={cn(
                "px-6 py-3 text-xs tracking-widest uppercase font-[family-name:var(--font-dm-sans)]",
                toast.variant === "gold" &&
                  "bg-[var(--bg-dark)] text-[var(--gold)] border border-[var(--border-gold)]",
                toast.variant === "error" && "bg-red-950 text-red-400 border border-red-800",
                toast.variant === "neutral" && "bg-[var(--text-primary)] text-[var(--bg-primary)] border border-[var(--border)]"
              )}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
