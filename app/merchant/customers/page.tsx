"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getMerchantProducts } from "@/lib/merchant-storage";
import { generateDemoOrders, generateDemoCustomers } from "@/lib/merchant-demo-data";
import { formatPrice, truncateEmail } from "@/lib/utils";

const GOLD = "#C9A84C";
const BLACK = "#080808";
const MUTED = "#8a8a8a";
const BORDER = "rgba(0,0,0,0.08)";
const BORDER_SOLID = "#e0e0e0";

export default function MerchantCustomersPage() {
  const [products, setProducts] = useState(() => getMerchantProducts());

  useEffect(() => {
    setProducts(getMerchantProducts());
  }, []);

  const orders = useMemo(() => generateDemoOrders(products), [products]);
  const customers = useMemo(() => generateDemoCustomers(orders), [orders]);

  const totalRevenue = orders.reduce((s, o) => s + o.amount, 0);
  const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;
  const exclusiveBuyerCount = customers.filter((c) =>
    c.productTypes.includes("exclusive")
  ).length;

  if (products.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p
            style={{ color: MUTED, marginBottom: 8 }}
            className="text-[9px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)]"
          >
            Customers
          </p>
          <p className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[#080808] tracking-wide mb-6">
            No customer data yet
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
        Customers
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
          { label: "Total Customers", value: String(customers.length) },
          { label: "Avg Order Value", value: formatPrice(avgOrderValue) },
          { label: "Exclusive Buyers", value: String(exclusiveBuyerCount) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#fff", padding: "20px 24px" }}>
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

      {/* Customer cards */}
      {customers.length === 0 ? (
        <div
          style={{ border: `1px solid ${BORDER}`, padding: "48px 32px", textAlign: "center" }}
        >
          <p className="font-[family-name:var(--font-cormorant)] text-xl font-light text-[#8a8a8a] tracking-wide">
            No customers yet
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {customers.map((customer) => {
            const lastDate = new Date(customer.lastOrderDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            return (
              <div
                key={customer.email}
                style={{
                  border: `1px solid ${BORDER_SOLID}`,
                  padding: "20px 24px",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#f0ede8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 12,
                      color: MUTED,
                      textTransform: "uppercase",
                    }}
                  >
                    {customer.email[0]}
                  </span>
                </div>

                {/* Email + type tags */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 13,
                      color: BLACK,
                      marginBottom: 6,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {truncateEmail(customer.email)}
                  </p>
                  <div style={{ display: "flex", gap: 6 }}>
                    {customer.productTypes.includes("shop") && (
                      <span
                        style={{
                          fontSize: 8,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          fontFamily: "var(--font-dm-sans), sans-serif",
                          color: MUTED,
                          border: `1px solid ${BORDER_SOLID}`,
                          padding: "2px 6px",
                        }}
                      >
                        Shop Buyer
                      </span>
                    )}
                    {customer.productTypes.includes("exclusive") && (
                      <span
                        style={{
                          fontSize: 8,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          fontFamily: "var(--font-dm-sans), sans-serif",
                          color: GOLD,
                          border: `1px solid rgba(201,168,76,0.4)`,
                          padding: "2px 6px",
                        }}
                      >
                        Exclusive Buyer
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: 32, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-dm-sans), sans-serif",
                        color: MUTED,
                        marginBottom: 4,
                      }}
                    >
                      Orders
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-ibm-mono), monospace",
                        fontSize: 14,
                        color: BLACK,
                      }}
                    >
                      {customer.totalOrders}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-dm-sans), sans-serif",
                        color: MUTED,
                        marginBottom: 4,
                      }}
                    >
                      Total Spent
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-ibm-mono), monospace",
                        fontSize: 14,
                        color: BLACK,
                      }}
                    >
                      {formatPrice(customer.totalSpent)}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-dm-sans), sans-serif",
                        color: MUTED,
                        marginBottom: 4,
                      }}
                    >
                      Last Order
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-dm-sans), sans-serif",
                        fontSize: 12,
                        color: MUTED,
                      }}
                    >
                      {lastDate}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
