"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const GoldButton = forwardRef<HTMLButtonElement, GoldButtonProps>(
  (
    { variant = "primary", size = "md", loading = false, className, children, ...props },
    ref
  ) => {
    const reduced = useReducedMotion();

    const base =
      "relative inline-flex items-center justify-center font-[family-name:var(--font-dm-sans)] tracking-widest uppercase text-xs transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary: "bg-[--gold] text-[--bg-dark] hover:bg-[--gold-light]",
      ghost:
        "bg-transparent text-[--gold] border border-[--border-gold] hover:bg-[color-mix(in_srgb,var(--gold)_5%,transparent)]",
      outline:
        "bg-transparent text-[--text-primary] border border-[--border] hover:border-[--gold]",
    };

    const sizes = {
      sm: "h-9 px-4 text-[10px]",
      md: "h-11 px-6",
      lg: "h-14 px-10 text-sm",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={reduced ? {} : { scale: 1.02 }}
        whileTap={reduced ? {} : { scale: 0.99 }}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={loading || props.disabled}
        {...(props as object)}
      >
        {loading ? (
          <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

GoldButton.displayName = "GoldButton";
export default GoldButton;
