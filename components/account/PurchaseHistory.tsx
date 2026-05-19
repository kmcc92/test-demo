"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useOwnership } from "@/hooks/useOwnership";
import { formatPrice, formatAddress } from "@/lib/utils";

export default function PurchaseHistory() {
  const reduced = useReducedMotion();
  const { purchases } = useOwnership();

  if (purchases.length === 0) {
    return (
      <div className="py-12 border border-[--border] text-center">
        <p className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[--text-muted] mb-3">
          No Purchases Yet
        </p>
        <p className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[--text-primary] tracking-wide">
          Your collection is waiting.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[--border]">
      {purchases.map((purchase, i) => {
        const date = new Date(purchase.purchasedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        return (
          <motion.div
            key={purchase.id}
            initial={reduced ? {} : { opacity: 0, y: 8 }}
            animate={reduced ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07, ease: "easeOut" }}
            className={`px-6 py-6 ${i < purchases.length - 1 ? "border-b border-[--border]" : ""}`}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <h4 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[--text-primary] tracking-wide leading-snug mb-3">
                  {purchase.productName}
                </h4>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                  <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[--gold]">
                    {purchase.certificateId}
                  </span>
                  {purchase.walletAddress && (
                    <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[--text-muted]">
                      {formatAddress(purchase.walletAddress)}
                    </span>
                  )}
                  <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[--text-muted]">
                    {date}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 shrink-0">
                <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-[--text-primary]">
                  {formatPrice(purchase.price)}
                </span>
                <Link
                  href={`/verify?id=${purchase.certificateId}`}
                  className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[--gold] hover:opacity-70 transition-opacity duration-200"
                >
                  Verify →
                </Link>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
