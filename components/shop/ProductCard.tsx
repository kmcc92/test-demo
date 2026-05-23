"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const reduced = useReducedMotion();

  return (
    <div className="group">
      <motion.div
        className="relative aspect-[3/4] bg-[var(--bg-secondary)] overflow-hidden mb-4 cursor-pointer"
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
            className="w-full py-2.5 text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)]" style={{ background: "rgba(255,255,255,0.85)", color: "var(--gold)" }}
          >
            Quick View
          </button>
        </div>
      </motion.div>

      <div className="space-y-1.5">
        <h3 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[var(--text-primary)] tracking-wide leading-tight">
          {product.name}
        </h3>
        <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)]">
          {product.category}
        </p>
        <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
          {formatPrice(product.price)}
        </p>
      </div>
    </div>
  );
}
