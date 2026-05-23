"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/mock-data";
import ProductCard from "./ProductCard";
import ShopQuickView from "./ShopQuickView";

interface ShopClientProps {
  products: Product[];
}

const ALL = "All";

export default function ShopClient({ products }: ShopClientProps) {
  const reduced = useReducedMotion();
  const [activeFilter, setActiveFilter] = useState(ALL);
  const [selected, setSelected] = useState<Product | null>(null);

  // Derive categories present in the data, preserving insertion order
  const categories = [
    ALL,
    ...Array.from(new Set(products.map((p) => p.category))).map(
      (c) => c.charAt(0).toUpperCase() + c.slice(1)
    ),
  ];

  const filtered =
    activeFilter === ALL
      ? products
      : products.filter(
          (p) => p.category === activeFilter.toLowerCase()
        );

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 w-full">
      <div className="flex gap-12 items-start">
        {/* Filter sidebar — desktop */}
        <aside className="w-36 shrink-0 hidden md:block sticky top-24">
          <p className="text-[9px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] mb-5">
            Category
          </p>
          <ul className="space-y-3">
            {categories.map((cat) => (
              <li key={cat}>
                <button
                  onClick={() => setActiveFilter(cat)}
                  className={`text-xs font-[family-name:var(--font-dm-sans)] transition-colors duration-150 text-left w-full ${
                    activeFilter === cat
                      ? "text-[var(--text-primary)] border-b border-[var(--text-primary)] pb-px"
                      : "text-[var(--text-primary)] hover:text-[var(--gold)]"
                  }`}
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Filter row — mobile */}
        <div className="flex md:hidden gap-4 overflow-x-auto pb-2 mb-8 w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`shrink-0 text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] pb-1 transition-colors ${
                activeFilter === cat
                  ? "text-[var(--text-primary)] border-b border-[var(--text-primary)]"
                  : "text-[var(--text-primary)] hover:text-[var(--gold)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] mb-8">
            {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                initial={reduced ? {} : { opacity: 0, y: 20 }}
                animate={reduced ? {} : { opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: "easeOut" }}
              >
                <ProductCard product={product} onQuickView={setSelected} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <ShopQuickView product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
