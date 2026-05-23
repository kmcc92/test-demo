"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import type { Product } from "@/lib/mock-data";
import ProductCard from "./ProductCard";
import ShopQuickView from "./ShopQuickView";

interface ShopClientProps {
  products: Product[];
}

type SortKey = "featured" | "price-asc" | "price-desc" | "newest";

const ALL = "All";
const CATEGORIES = ["All", "Outerwear", "Tops", "Footwear", "Accessories"];
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured",   label: "Featured" },
  { value: "price-asc",  label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest",     label: "Newest First" },
];

export default function ShopClient({ products }: ShopClientProps) {
  const reduced = useReducedMotion();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState(ALL);
  const [sort, setSort] = useState<SortKey>("featured");
  const [selected, setSelected] = useState<Product | null>(null);

  const q = search.trim().toLowerCase();

  const searched = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    : products;

  const categoryFiltered =
    activeFilter === ALL
      ? searched
      : searched.filter((p) => p.category === activeFilter.toLowerCase());

  const displayed =
    sort === "featured"
      ? categoryFiltered
      : [...categoryFiltered].sort((a, b) => {
          if (sort === "price-asc") return a.price - b.price;
          if (sort === "price-desc") return b.price - a.price;
          return products.indexOf(b) - products.indexOf(a); // newest: reverse original order
        });

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 w-full">

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: "28px" }}>
        <ol style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <li>
            <Link
              href="/"
              style={{
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontFamily: "var(--font-dm-sans), sans-serif",
                color: "var(--text-muted)",
                textDecoration: "none",
              }}
              className="hover:opacity-60 transition-opacity duration-150"
            >
              Home
            </Link>
          </li>
          <li style={{ color: "var(--text-muted)", fontSize: "11px", lineHeight: 1 }} aria-hidden>›</li>
          <li>
            {selected ? (
              <button
                onClick={() => setSelected(null)}
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
                className="hover:opacity-60 transition-opacity duration-150"
              >
                Shop
              </button>
            ) : (
              <span
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  color: "var(--text-primary)",
                }}
              >
                Shop
              </span>
            )}
          </li>
          {selected && (
            <>
              <li style={{ color: "var(--text-muted)", fontSize: "11px", lineHeight: 1 }} aria-hidden>›</li>
              <li
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  color: "var(--text-primary)",
                  maxWidth: "200px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selected.name}
              </li>
            </>
          )}
        </ol>
      </nav>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "24px" }}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          aria-hidden
          style={{
            position: "absolute",
            left: "13px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            pointerEvents: "none",
          }}
        >
          <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
          <line x1="9" y1="9" x2="12" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          style={{
            width: "100%",
            height: "40px",
            paddingLeft: "36px",
            paddingRight: search ? "36px" : "12px",
            fontSize: "12px",
            fontFamily: "var(--font-dm-sans), sans-serif",
            letterSpacing: "0.04em",
            color: "var(--text-primary)",
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#080808"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#e0e0e0"; }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            aria-label="Clear search"
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter tabs + Sort row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "28px",
          flexWrap: "wrap",
        }}
      >
        {/* Category pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => {
            const isActive = activeFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                style={{
                  height: "30px",
                  padding: "0 14px",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: isActive ? "#080808" : "transparent",
                  color: isActive ? "#ffffff" : "var(--text-primary)",
                  border: isActive ? "1px solid #080808" : "1px solid #e0e0e0",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Sort dropdown */}
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{
              height: "30px",
              paddingLeft: "10px",
              paddingRight: "28px",
              fontSize: "10px",
              letterSpacing: "0.08em",
              fontFamily: "var(--font-dm-sans), sans-serif",
              color: "var(--text-primary)",
              background: "#ffffff",
              border: "1px solid #e0e0e0",
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            width="8"
            height="5"
            viewBox="0 0 8 5"
            fill="none"
            aria-hidden
            style={{
              position: "absolute",
              right: "9px",
              pointerEvents: "none",
              color: "var(--text-muted)",
            }}
          >
            <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Count */}
      <p
        style={{
          fontSize: "10px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: "var(--font-dm-sans), sans-serif",
          color: "var(--text-primary)",
          marginBottom: "32px",
        }}
      >
        {displayed.length} {displayed.length === 1 ? "piece" : "pieces"}
      </p>

      {/* Product grid */}
      {displayed.length === 0 ? (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "var(--font-dm-sans), sans-serif",
              color: "var(--text-muted)",
            }}
          >
            No products found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
          {displayed.map((product, i) => (
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
      )}

      <ShopQuickView product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
