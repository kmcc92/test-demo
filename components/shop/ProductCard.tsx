"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import AuthBadge from "@/components/ui/AuthBadge";
import { useOwnership } from "@/hooks/useOwnership";

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const reduced = useReducedMotion();
  const { isOwned } = useOwnership();
  const owned = isOwned(product.id);

  return (
    <div className="group">
      <div className="flex justify-end mb-3 h-[18px] items-center">
        {owned ? (
          <span
            className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] px-2 py-0.5"
            style={{ color: "#C9A84C", border: "1px solid #C9A84C" }}
          >
            Owned
          </span>
        ) : (
          <AuthBadge
            size="sm"
            className={product.stock_type !== "exclusive" ? "invisible" : undefined}
          />
        )}
      </div>

      <motion.div
        className="relative aspect-[3/4] bg-[--bg-secondary] overflow-hidden mb-4 cursor-pointer group"
        style={owned ? { outline: "1px solid #C9A84C" } : undefined}
        whileHover={reduced ? {} : { scale: 1.02 }}
        transition={{ duration: 0.3 }}
        onClick={() => onQuickView(product)}
      >
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
        />

        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={() => onQuickView(product)}
            className="w-full py-2.5 text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] bg-[--bg-dark] text-white"
          >
            {owned ? "View Details" : "Quick View"}
          </button>
        </div>
      </motion.div>

      <div className="space-y-1.5">
        <h3 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[--text-primary] tracking-wide leading-tight">
          {product.name}
        </h3>
        <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[--text-primary]">
          {product.category}
        </p>
        <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[--text-primary]">
          {formatPrice(product.price)}
        </p>
      </div>
    </div>
  );
}
