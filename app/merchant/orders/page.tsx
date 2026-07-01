"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getMerchantProducts } from "@/lib/merchant-storage";
import { formatPrice, truncateEmail } from "@/lib/utils";

const GOLD = "#C9A84C";
const BLACK = "#080808";
const MUTED = "#8a8a8a";
const BORDER = "rgba(0,0,0,0.08)";
const BORDER_SOLID = "#e0e0e0";

type Filter = "all" | "shop" | "exclusive" | "processing" | "shipped" | "delivered";

const STATUS_COLORS: Record<"processing" | "shipped" | "delivered", { text: string; bg: string }> = {
  processing: { text: "#92400e", bg: "#fef3c7" },
  shipped: { text: "#1e40af", bg: "#dbeafe" },
  delivered: { text: "#166534", bg: "#dcfce7" },
};

export default function MerchantOrdersPage() {
  const [products, setProducts] = useState(() => getMerchantProducts());
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    setProducts(getMerchantProducts());
  }, []);

  type OrderEntry = {
    orderId: string; productName: string; productType: "shop" | "exclusive";
    customerEmail: string; amount: number;
    status: "processing" | "shipped" | "delivered"; orderedAt: string;
  };
  const allOrders: OrderEntry[] = [];
  const filtered: OrderEntry[] = [];
  const totalRevenue = 0;
  const processingCount = 0;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "shop", label: "Shop" },
    { key: "exclusive", label: "Exclusive" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];

  if (products.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p
            style={{ color: MUTED, marginBottom: 8 }}
            className="text-[9px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)]"
          >
            Orders
          </p>
          <p className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[#080808] tracking-wide mb-6">
            No products added yet
          </p>
          <Link
            href="/merchant/shop"
            style={{
              fontSize: 10,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              fontFamily: "var(--font-dm-sans), sans-serif",
              color: GOLD,
              borderBottom: `1px solid rgba(201,168,76,0.4)`,
              paddingBottom: 2,
            }}
          >
            Add your first product
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-10 py-10 overflow-y-auto">
      <p
        style={{ color: MUTED, marginBottom: 8 }}
        className="text-[9px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)]"
      >
        Merchant Portal
      </p>
      <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-[#080808] tracking-wide mb-8">
        Orders
      </h2>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
          background: BORDER_SOLID,
          border: `1px solid ${BORDER_SOLID}`,
          marginBottom: 32,
        }}
      >
        {[
          { label: "Total Orders", value: String(allOrders.length) },
          { label: "Total Revenue", value: formatPrice(totalRevenue) },
          { label: "Pending", value: String(processingCount) },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{ background: "#fff", padding: "20px 24px" }}
          >
            <p
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: "var(--font-dm-sans), sans-serif",
                color: MUTED,
                marginBottom: 8,
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontFamily: "var(--font-ibm-mono), monospace",
                fontSize: 20,
                color: BLACK,
              }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: "6px 14px",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: "var(--font-dm-sans), sans-serif",
              background: filter === key ? BLACK : "#fff",
              color: filter === key ? "#fff" : MUTED,
              border: `1px solid ${filter === key ? BLACK : BORDER_SOLID}`,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Order list */}
      {filtered.length === 0 ? (
        <div
          style={{ border: `1px solid ${BORDER}`, padding: "48px 32px", textAlign: "center" }}
        >
          <p className="font-[family-name:var(--font-cormorant)] text-xl font-light text-[#8a8a8a] tracking-wide">
            No orders match this filter
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${BORDER_SOLID}` }}>
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 90px 120px 90px 100px 90px",
              padding: "10px 16px",
              borderBottom: `1px solid ${BORDER_SOLID}`,
              background: "#fafafa",
            }}
          >
            {["Order ID", "Product", "Type", "Customer", "Amount", "Status", "Date"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 8,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  color: MUTED,
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {filtered.map((order) => {
            const sc = STATUS_COLORS[order.status];
            const date = new Date(order.orderedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            return (
              <div
                key={order.orderId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 90px 120px 90px 100px 90px",
                  padding: "14px 16px",
                  borderBottom: `1px solid ${BORDER_SOLID}`,
                  background: "#fff",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-ibm-mono), monospace",
                    fontSize: 10,
                    color: MUTED,
                  }}
                >
                  {order.orderId}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-cormorant), serif",
                    fontSize: 15,
                    fontWeight: 300,
                    color: BLACK,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    paddingRight: 8,
                  }}
                >
                  {order.productName}
                </span>
                <span
                  style={{
                    fontSize: 8,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    color: order.productType === "exclusive" ? GOLD : MUTED,
                    border: `1px solid ${order.productType === "exclusive" ? "rgba(201,168,76,0.4)" : BORDER_SOLID}`,
                    padding: "2px 6px",
                    display: "inline-block",
                  }}
                >
                  {order.productType === "exclusive" ? "Exclusive" : "Shop"}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 11,
                    color: MUTED,
                  }}
                >
                  {truncateEmail(order.customerEmail)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ibm-mono), monospace",
                    fontSize: 12,
                    color: BLACK,
                  }}
                >
                  {formatPrice(order.amount)}
                </span>
                <span
                  style={{
                    fontSize: 8,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    color: sc.text,
                    background: sc.bg,
                    padding: "3px 7px",
                    display: "inline-block",
                  }}
                >
                  {order.status}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 11,
                    color: MUTED,
                  }}
                >
                  {date}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
