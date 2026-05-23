"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import { useWishlist } from "@/hooks/useWishlist";

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const reduced = useReducedMotion();
  const { toggle, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  function handleHeartClick(e: React.MouseEvent) {
    e.stopPropagation();
    toggle({
      productId: product.id,
      productName: product.name,
      price: product.price,
      image: product.images[0],
      addedAt: new Date().toISOString(),
    });
  }

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

        {/* Wishlist heart */}
        <button
          onClick={handleHeartClick}
          aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.88)",
            border: "none",
            cursor: "pointer",
            zIndex: 1,
          }}
        >
          <svg width="14" height="13" viewBox="0 0 14 13" fill="none" aria-hidden>
            <path
              d="M7 12C7 12 0.75 8.25 0.75 4.25C0.75 2.32 2.32 0.75 4.25 0.75C5.33 0.75 6.3 1.22 7 1.98C7.7 1.22 8.67 0.75 9.75 0.75C11.68 0.75 13.25 2.32 13.25 4.25C13.25 8.25 7 12 7 12Z"
              fill={wishlisted ? "#080808" : "none"}
              stroke="#080808"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={() => onQuickView(product)}
            className="w-full py-2.5 text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)]"
            style={{ background: "rgba(255,255,255,0.85)", color: "var(--gold)" }}
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
